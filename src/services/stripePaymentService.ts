interface StripeSessionOptions {
  bookingId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
  paymentMethod: string;
  successUrl?: string;
  cancelUrl?: string;
  extensionId?: string;
}

interface StripeSessionResponse {
  sessionId: string;
  paymentUrl: string;
  expiresAt: string;
}

class StripePaymentService {
  private baseUrl = import.meta.env.VITE_SUPABASE_URL;
  private anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  async createPaymentSession(options: StripeSessionOptions): Promise<StripeSessionResponse> {
    try {
      // Always use stripe-webhook-payment for all payments
      const endpoint = this.getEndpointForPaymentMethod(options.paymentMethod);
      
      // Prepare the request payload without price_id for dynamic amounts
      const requestPayload = {
        booking_id: options.bookingId,
        amount: Math.round(options.amount * 100), // Convert to cents
        currency: options.currency || 'MYR',
        customer_email: options.customerEmail,
        customer_name: options.customerName,
        description: options.description,
        success_url: options.successUrl || `${window.location.origin}/payment-success?booking_id=${options.bookingId}`,
        cancel_url: options.cancelUrl || `${window.location.origin}/payment-cancelled?booking_id=${options.bookingId}`,
        // Add metadata based on payment type
        ...(options.extensionId 
          ? {
              payment_type: 'extension',
              extension_id: options.extensionId
            }
          : options.successUrl?.includes('type=late_fee')
          ? {
              type: 'late_fee'
            }
          : {}
        ),
      };

      console.log('Creating payment session:', {
        endpoint,
        paymentMethod: options.paymentMethod,
        amount: options.amount,
        bookingId: options.bookingId,
        extensionId: options.extensionId
      });

      const response = await fetch(`${this.baseUrl}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment session creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        throw new Error(errorData.error || `Failed to create ${options.paymentMethod} payment session (${response.status})`);
      }

      const data = await response.json();
      console.log('Payment session created successfully:', data);
      
      return {
        sessionId: data.session_id || data.sessionId,
        paymentUrl: data.url || data.payment_url,
        expiresAt: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours default
      };
    } catch (error) {
      console.error(`Error creating ${options.paymentMethod} payment session:`, error);
      
      if (error instanceof Error) {
        throw error; // Re-throw the specific error
      } else {
        throw new Error(`Failed to create payment session for ${options.paymentMethod}`);
      }
    }
  }


  private getEndpointForPaymentMethod(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'online_banking':
        return 'stripe-fpx-checkout';
      case 'credit_debit_card':
        return 'stripe-card-checkout';
      case 'qr_code':
        return 'stripe-qr-checkout';
      default:
        return 'stripe-checkout';
    }
  }

  private getStripePaymentMethodTypes(paymentMethod: string): string[] {
    switch (paymentMethod) {
      case 'online_banking':
        return ['fpx'];
      case 'credit_debit_card':
        return ['card'];
      case 'qr_code':
        return ['grabpay', 'paynow'];
      default:
        return ['card'];
    }
  }

  generatePaymentDescription(bookingNumber: string, carDetails: string, duration: number): string {
    return `Car Rental Payment - Booking #${bookingNumber} - ${carDetails} for ${duration} day${duration > 1 ? 's' : ''}`;
  }

  generateSuccessUrl(bookingId: string): string {
    return `${window.location.origin}/payment-success?booking_id=${bookingId}`;
  }

  generateCancelUrl(bookingId: string): string {
    return `${window.location.origin}/payment-cancelled?booking_id=${bookingId}`;
  }
}

export const stripePaymentService = new StripePaymentService();
export type { StripeSessionOptions, StripeSessionResponse };