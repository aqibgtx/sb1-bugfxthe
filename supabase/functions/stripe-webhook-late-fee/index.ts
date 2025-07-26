import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_LATE_FEE');

const stripe = new Stripe(stripeSecret!, {
  appInfo: {
    name: 'Budget Plus Rental - Late Fee Webhook',
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
      console.error('STRIPE_WEBHOOK_SECRET_LATE_FEE environment variable is not set or is empty');
      return corsResponse({ 
        error: 'Late fee webhook secret not configured. Please set STRIPE_WEBHOOK_SECRET_LATE_FEE environment variable.' 
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

    console.log(`✅ Late fee webhook signature verified successfully. Event type: ${event.type}`);

    // Handle successful payment events for late fees
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process late fee payments
      if (session.metadata?.type === 'late_fee' && session.payment_status === 'paid') {
        return await handleLateFeePaymentCompleted(session);
      } else {
        console.log(`Checkout session completed but not a late fee payment or not paid`);
        return corsResponse({ received: true, message: 'Not a late fee payment or not paid' });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.type === 'late_fee') {
        return await handleLateFeePaymentCompleted(paymentIntent);
      }
    }

    // Handle failed payment events for late fees
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.type === 'late_fee') {
        return await handleLateFeePaymentFailed(paymentIntent, 'payment_failed');
      }
    }

    if (event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.type === 'late_fee') {
        return await handleLateFeePaymentFailed(paymentIntent, 'payment_canceled');
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === 'late_fee') {
        return await handleLateFeePaymentFailed(session, 'session_expired');
      }
    }

    // For other event types, just acknowledge receipt
    console.log(`Received unhandled late fee event type: ${event.type}`);
    return corsResponse({ received: true, event_type: event.type });

  } catch (error: any) {
    console.error('Late fee webhook processing error:', error);
    return corsResponse({ 
      error: `Late fee webhook processing failed: ${error.message}`,
      stack: error.stack 
    }, 500);
  }
});

async function handleLateFeePaymentCompleted(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session) {
  const bookingId = paymentObject.metadata?.booking_id;
  
  if (!bookingId) {
    console.error(`Missing booking_id in metadata:`, paymentObject.metadata);
    return corsResponse({ error: 'Missing booking_id in metadata' }, 400);
  }

  console.log(`Processing completed late fee payment for booking: ${bookingId}`);

  try {
    // Update booking to mark late fee as paid
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        late_fee_paid: true,
        late_fee_paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
    }

    // Update or create payment record for late fee
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        amount: getAmount(paymentObject) / 100, // Convert from cents
        payment_method_code: 'STRIPE_LATE_FEE',
        payment_url: getPaymentUrl(paymentObject),
        payment_completion_status: 'completed',
        admin_approval_status: 'approved', // Auto-approve late fee payments
        stripe_session_id: 'id' in paymentObject ? paymentObject.id : null,
        stripe_payment_intent_id: getPaymentIntentId(paymentObject),
        stripe_webhook_received_at: new Date().toISOString(),
        notes: `Late fee payment completed via Stripe`,
        approved: true,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (paymentError) {
      console.error('Error creating late fee payment record:', paymentError);
    }

    console.log(`✅ Successfully processed late fee payment for booking ${bookingId}`);

    return corsResponse({ 
      success: true, 
      message: `Late fee payment completed for booking ${bookingId}`,
      booking_id: bookingId,
      status: 'late_fee_payment_completed'
    });

  } catch (error: any) {
    console.error('Error processing late fee payment completion:', error);
    return corsResponse({ error: `Failed to process late fee payment: ${error.message}` }, 500);
  }
}

async function handleLateFeePaymentFailed(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session, failureType: string) {
  const bookingId = paymentObject.metadata?.booking_id;
  
  if (!bookingId) {
    console.error(`Missing booking_id in ${failureType} metadata:`, paymentObject.metadata);
    return corsResponse({ error: `Missing booking_id in ${failureType} metadata` }, 400);
  }

  console.log(`Processing failed late fee payment for booking: ${bookingId}, type: ${failureType}`);

  try {
    // Log the failed payment attempt
    const { error: logError } = await supabase
      .from('payment_creation_log')
      .insert({
        booking_id: bookingId,
        trigger_name: 'late_fee_payment_failed',
        action_type: failureType,
        notes: `Late fee payment ${failureType} via Stripe webhook`,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging failed payment:', logError);
    }

    console.log(`Successfully logged late fee payment failure for booking ${bookingId}`);

    return corsResponse({ 
      success: true, 
      message: `Late fee payment ${failureType} for booking ${bookingId}`,
      booking_id: bookingId,
      status: failureType,
      failure_type: failureType
    });

  } catch (error: any) {
    console.error('Error processing late fee payment failure:', error);
    return corsResponse({ error: `Failed to process late fee payment failure: ${error.message}` }, 500);
  }
}

// Helper functions to extract data from different Stripe objects
function getAmount(obj: Stripe.PaymentIntent | Stripe.Checkout.Session): number {
  if ('amount' in obj) {
    return obj.amount || 0;
  }
  if ('amount_total' in obj) {
    return obj.amount_total || 0;
  }
  return 0;
}

function getPaymentUrl(obj: Stripe.PaymentIntent | Stripe.Checkout.Session): string {
  if ('url' in obj) {
    return obj.url || '';
  }
  return '';
}

function getPaymentIntentId(obj: Stripe.PaymentIntent | Stripe.Checkout.Session): string | null {
  if ('payment_intent' in obj) {
    return obj.payment_intent as string;
  }
  if ('id' in obj && obj.object === 'payment_intent') {
    return obj.id;
  }
  return null;
}