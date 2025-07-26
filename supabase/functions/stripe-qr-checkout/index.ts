import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Budget Plus Rental - QR Payment Integration',
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

    const {
      booking_id,
      amount,
      currency = 'myr',
      customer_email,
      customer_name,
      description,
      success_url,
      cancel_url,
    } = await req.json();

    // Validate required parameters
    if (!booking_id || !amount || !customer_email || !customer_name) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    // Create Stripe checkout session for QR payments (GrabPay, PayNow)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['grabpay'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || `Car Rental Payment - Booking #${booking_id}`,
              description: `Budget Plus Rental - ${customer_name}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/payment-success?booking_id=${booking_id}`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/payment-cancelled?booking_id=${booking_id}`,
      customer_email,
      payment_intent_data: {
        metadata: {
          booking_id,
          payment_method: 'qr',
          customer_name,
        },
      },
      metadata: {
        booking_id,
        payment_method: 'qr',
        customer_name,
      },
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    // Store payment session in database
    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        amount: amount / 100, // Convert back to dollars for storage
        payment_method_code: 'QR',
        payment_url: session.url,
        stripe_session_id: session.id,
        approved: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue anyway, as the Stripe session was created successfully
    }

    console.log(`Created QR checkout session ${session.id} for booking ${booking_id}`);

    return corsResponse({
      session_id: session.id,
      url: session.url,
      expires_at: new Date(session.expires_at * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error(`QR checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});