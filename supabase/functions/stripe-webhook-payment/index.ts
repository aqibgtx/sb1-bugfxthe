import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PAYMENT');

const stripe = new Stripe(stripeSecret!, {
  appInfo: {
    name: 'Budget Plus Rental - Payment Webhook',
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
      console.error('STRIPE_WEBHOOK_SECRET_PAYMENT environment variable is not set or is empty');
      return corsResponse({ 
        error: 'Payment webhook secret not configured. Please set STRIPE_WEBHOOK_SECRET_PAYMENT environment variable.' 
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

    console.log(`✅ Webhook signature verified successfully. Event type: ${event.type}`);

    // Handle successful payment events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process if payment_status is 'paid'
      if (session.payment_status === 'paid') {
        return await handlePaymentCompleted(session, 'checkout_session_completed');
      } else {
        console.log(`Checkout session completed but payment_status is: ${session.payment_status}`);
        return corsResponse({ received: true, message: 'Session completed but payment not paid' });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      return await handlePaymentCompleted(event.data.object as Stripe.PaymentIntent, 'payment_intent_succeeded');
    }

    // Handle failed payment events
    if (event.type === 'payment_intent.payment_failed') {
      return await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, 'payment_failed');
    }

    if (event.type === 'payment_intent.canceled') {
      return await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, 'payment_canceled');
    }

    if (event.type === 'checkout.session.expired') {
      return await handlePaymentFailed(event.data.object as Stripe.Checkout.Session, 'session_expired');
    }

    // For other event types, just acknowledge receipt
    console.log(`Received unhandled event type: ${event.type}`);
    return corsResponse({ received: true, event_type: event.type });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return corsResponse({ 
      error: `Webhook processing failed: ${error.message}`,
      stack: error.stack 
    }, 500);
  }
});

async function handlePaymentCompleted(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session, eventType: string) {
  const bookingId = paymentObject.metadata?.booking_id;
  if (!bookingId) {
    console.error(`No booking_id found in ${eventType} metadata:`, paymentObject.metadata);
    return corsResponse({ error: `No booking_id found in ${eventType} metadata` }, 400);
  }

  console.log(`Processing completed payment for booking: ${bookingId}`);

  try {
    // Verify the booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_status, payment_status, total_amount')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return corsResponse({ error: 'Booking not found' }, 404);
    }

    console.log(`Found booking: ${booking.id}, current status: ${booking.booking_status}/${booking.payment_status}`);

    // CRITICAL: Only update payment_completion_status, never booking_status or payment_status
    await updatePaymentCompletionStatus(bookingId, paymentObject, eventType, 'completed');

    console.log(`✅ Successfully processed completed payment for booking ${bookingId} - ONLY updated payment_completion_status`);

    return corsResponse({ 
      success: true, 
      message: `Payment completed for booking ${bookingId} - payment_completion_status updated to 'completed'`,
      booking_id: bookingId,
      status: 'payment_completion_updated'
    });

  } catch (error: any) {
    console.error('Error processing payment completion:', error);
    return corsResponse({ error: `Failed to process payment: ${error.message}` }, 500);
  }
}

async function handlePaymentFailed(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session, failureType: string) {
  const bookingId = paymentObject.metadata?.booking_id;
  if (!bookingId) {
    console.error(`No booking_id found in ${failureType} metadata:`, paymentObject.metadata);
    return corsResponse({ error: `No booking_id found in ${failureType} metadata` }, 400);
  }

  console.log(`Processing failed payment for booking: ${bookingId}, type: ${failureType}`);

  try {
    // Determine the appropriate completion status based on failure type
    let completionStatus = 'failed';
    let statusMessage = 'Payment failed';

    switch (failureType) {
      case 'payment_failed':
        completionStatus = 'failed';
        statusMessage = 'Payment failed during processing';
        break;
      case 'payment_canceled':
        completionStatus = 'cancelled';
        statusMessage = 'Payment was canceled';
        break;
      case 'session_expired':
        completionStatus = 'expired';
        statusMessage = 'Payment session expired';
        break;
    }

    // CRITICAL: Only update payment_completion_status, never booking_status or payment_status
    await updatePaymentCompletionStatus(bookingId, paymentObject, failureType, completionStatus);

    console.log(`Successfully processed payment failure for booking ${bookingId} - ONLY updated payment_completion_status`);

    return corsResponse({ 
      success: true, 
      message: `Payment ${failureType} for booking ${bookingId} - payment_completion_status updated to '${completionStatus}'`,
      booking_id: bookingId,
      status: completionStatus,
      failure_type: failureType
    });

  } catch (error: any) {
    console.error('Error processing payment failure:', error);
    return corsResponse({ error: `Failed to process payment failure: ${error.message}` }, 500);
  }
}

async function updatePaymentCompletionStatus(
  bookingId: string, 
  paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session, 
  eventType: string, 
  completionStatus: string
) {
  try {
    // Find existing payment record
    const { data: existingPayment, error: findPaymentError } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (findPaymentError && findPaymentError.code !== 'PGRST116') {
      console.error('Error finding payment:', findPaymentError);
      return;
    }

    // Prepare payment data - ONLY update payment_completion_status and related webhook fields
    const paymentData = {
      booking_id: bookingId,
      amount: getAmount(paymentObject) / 100, // Convert from cents to dollars
      payment_method_code: getPaymentMethodCode(paymentObject),
      payment_url: getPaymentUrl(paymentObject),
      payment_completion_status: completionStatus, // ONLY this field should be updated by webhooks
      stripe_session_id: 'id' in paymentObject ? paymentObject.id : null,
      stripe_payment_intent_id: getPaymentIntentId(paymentObject),
      stripe_webhook_received_at: new Date().toISOString(),
      stripe_webhook_data: {
        event_type: eventType,
        stripe_object_id: paymentObject.id,
        status: getStatus(paymentObject),
        created: paymentObject.created,
        metadata: paymentObject.metadata,
        completion_status: completionStatus
      },
      payment_details: {
        stripe_object_id: paymentObject.id,
        type: eventType,
        status: getStatus(paymentObject),
        created: paymentObject.created,
        metadata: paymentObject.metadata,
        completion_status: completionStatus
      },
      notes: `Payment ${completionStatus} via Stripe ${eventType}. Status managed separately from booking approval.`,
      updated_at: new Date().toISOString()
    };

    if (existingPayment) {
      // Update existing payment record - ONLY payment_completion_status and webhook fields
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          payment_completion_status: completionStatus,
          stripe_session_id: paymentData.stripe_session_id,
          stripe_payment_intent_id: paymentData.stripe_payment_intent_id,
          stripe_webhook_received_at: paymentData.stripe_webhook_received_at,
          stripe_webhook_data: paymentData.stripe_webhook_data,
          payment_details: paymentData.payment_details,
          notes: paymentData.notes,
          updated_at: paymentData.updated_at
        })
        .eq('id', existingPayment.id);

      if (updatePaymentError) {
        console.error('Error updating payment:', updatePaymentError);
      } else {
        console.log(`✅ Updated existing payment record for booking ${bookingId} - ONLY payment_completion_status and webhook fields`);
      }
    } else {
      // Create new payment record with default admin_approval_status
      const { error: insertPaymentError } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          admin_approval_status: 'pending', // Default for new payments
          created_at: new Date().toISOString()
        });

      if (insertPaymentError) {
        console.error('Error creating payment:', insertPaymentError);
      } else {
        console.log(`✅ Created new payment record for booking ${bookingId} - payment_completion_status set to ${completionStatus}`);
      }
    }
  } catch (error) {
    console.error('Error in updatePaymentCompletionStatus:', error);
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

function getPaymentMethodCode(obj: Stripe.PaymentIntent | Stripe.Checkout.Session): string {
  // For checkout sessions
  if ('payment_method_types' in obj) {
    const paymentMethodTypes = obj.payment_method_types || [];
    
    if (paymentMethodTypes.includes('fpx')) {
      return 'FPX';
    } else if (paymentMethodTypes.includes('card')) {
      return 'CARD';
    } else if (paymentMethodTypes.includes('grabpay') || paymentMethodTypes.includes('paynow')) {
      return 'QR';
    }
  }
  
  // For payment intents, check metadata or payment method
  if ('metadata' in obj && obj.metadata?.payment_method) {
    const method = obj.metadata.payment_method;
    if (method === 'fpx') {
      return 'FPX';
    } else if (method === 'card') {
      return 'CARD';
    } else if (method === 'qr') {
      return 'QR';
    }
  }
  
  // Default fallback
  return 'STRIPE';
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

function getStatus(obj: Stripe.PaymentIntent | Stripe.Checkout.Session): string {
  if ('status' in obj) {
    return obj.status;
  }
  if ('payment_status' in obj) {
    return obj.payment_status;
  }
  return 'unknown';
}