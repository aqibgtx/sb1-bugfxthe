import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_EXTENSION');

const stripe = new Stripe(stripeSecret!, {
  appInfo: {
    name: 'Budget Plus Rental - Extension Webhook',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Check if webhook secret is configured
    if (!stripeWebhookSecret || stripeWebhookSecret.length === 0) {
      console.error('STRIPE_WEBHOOK_SECRET_EXTENSION environment variable is not set or is empty');
      return corsResponse({ 
        error: 'Extension webhook secret not configured. Please set STRIPE_WEBHOOK_SECRET_EXTENSION environment variable.' 
      }, 500);
    }

    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in request headers');
      return corsResponse({ error: 'No signature found' }, 400);
    }

    // Get the raw body
    const body = await req.text();

    if (!body || body.length === 0) {
      console.error('Request body is empty');
      return corsResponse({ error: 'Empty request body' }, 400);
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return corsResponse({ 
        error: `Webhook signature verification failed: ${error.message}`
      }, 400);
    }

    console.log(`✅ Extension webhook signature verified successfully. Event type: ${event.type}`);

    // Handle successful payment events for extensions
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process extension payments
      if (session.metadata?.payment_type === 'extension' && session.payment_status === 'paid') {
        return await handleExtensionPaymentCompleted(session);
      } else {
        console.log(`Checkout session completed but not an extension payment or not paid`);
        return corsResponse({ received: true, message: 'Not an extension payment or not paid' });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.payment_type === 'extension') {
        return await handleExtensionPaymentCompleted(paymentIntent);
      }
    }

    // Handle failed payment events for extensions
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.payment_type === 'extension') {
        return await handleExtensionPaymentFailed(paymentIntent, 'payment_failed');
      }
    }

    if (event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.payment_type === 'extension') {
        return await handleExtensionPaymentFailed(paymentIntent, 'payment_canceled');
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.payment_type === 'extension') {
        return await handleExtensionPaymentFailed(session, 'session_expired');
      }
    }

    // For other event types, just acknowledge receipt
    console.log(`Received unhandled extension event type: ${event.type}`);
    return corsResponse({ received: true, event_type: event.type });

  } catch (error: any) {
    console.error('Extension webhook processing error:', error);
    return corsResponse({ 
      error: `Extension webhook processing failed: ${error.message}`,
      stack: error.stack 
    }, 500);
  }
});

async function handleExtensionPaymentCompleted(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session) {
  const bookingId = paymentObject.metadata?.booking_id;
  const extensionId = paymentObject.metadata?.extension_id;
  
  if (!bookingId || !extensionId) {
    console.error(`Missing booking_id or extension_id in metadata:`, paymentObject.metadata);
    return corsResponse({ error: 'Missing booking_id or extension_id in metadata' }, 400);
  }

  console.log(`Processing completed extension payment for booking: ${bookingId}, extension: ${extensionId}`);

  try {
    // Update extension payment status
    const { error: extensionError } = await supabase
      .from('booking_extensions')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', extensionId);

    if (extensionError) {
      console.error('Error updating extension:', extensionError);
    }

    // Update payment record with extension payment link
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        extended_payment_link: getPaymentUrl(paymentObject),
        payment_completion_status: 'completed',
        stripe_webhook_received_at: new Date().toISOString(),
        notes: `Extension payment completed via Stripe for extension ${extensionId}`,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .like('notes', `%Extension payment for ${extensionId}%`);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
    }

    console.log(`✅ Successfully processed extension payment for booking ${bookingId}, extension ${extensionId}`);

    return corsResponse({ 
      success: true, 
      message: `Extension payment completed for booking ${bookingId}`,
      booking_id: bookingId,
      extension_id: extensionId,
      status: 'extension_payment_completed'
    });

  } catch (error: any) {
    console.error('Error processing extension payment completion:', error);
    return corsResponse({ error: `Failed to process extension payment: ${error.message}` }, 500);
  }
}

async function handleExtensionPaymentFailed(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session, failureType: string) {
  const bookingId = paymentObject.metadata?.booking_id;
  const extensionId = paymentObject.metadata?.extension_id;
  
  if (!bookingId || !extensionId) {
    console.error(`Missing booking_id or extension_id in ${failureType} metadata:`, paymentObject.metadata);
    return corsResponse({ error: `Missing booking_id or extension_id in ${failureType} metadata` }, 400);
  }

  console.log(`Processing failed extension payment for booking: ${bookingId}, extension: ${extensionId}, type: ${failureType}`);

  try {
    // Update extension payment status to failed
    const { error: extensionError } = await supabase
      .from('booking_extensions')
      .update({
        payment_status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('id', extensionId);

    if (extensionError) {
      console.error('Error updating extension:', extensionError);
    }

    console.log(`Successfully processed extension payment failure for booking ${bookingId}, extension ${extensionId}`);

    return corsResponse({ 
      success: true, 
      message: `Extension payment ${failureType} for booking ${bookingId}`,
      booking_id: bookingId,
      extension_id: extensionId,
      status: failureType,
      failure_type: failureType
    });

  } catch (error: any) {
    console.error('Error processing extension payment failure:', error);
    return corsResponse({ error: `Failed to process extension payment failure: ${error.message}` }, 500);
  }
}

// Helper function to extract payment URL
function getPaymentUrl(obj: Stripe.PaymentIntent | Stripe.Checkout.Session): string {
  if ('url' in obj) {
    return obj.url || '';
  }
  return '';
}