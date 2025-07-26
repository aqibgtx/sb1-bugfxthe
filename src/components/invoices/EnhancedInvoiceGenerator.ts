import { supabase } from '../../lib/supabase';
import { formatMalaysiaDate, formatMalaysiaTime, toMalaysiaTime } from '../../lib/timezone';

interface InvoiceGenerationResult {
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  car: {
    brand: string;
    make: string;
    spec: string;
    plateNumber: string;
    dailyRate: number;
  };
  booking: {
    bookingNumber: string;
    handoverTime: string;
    expectedReturnTime: string;
    actualReturnTime: string;
    totalDays: number;
    lateDays: number;
  };
  charges: {
    lateFeePerDay: number;
    totalLateFee: number;
  };
  totalAmount: number;
}

export class EnhancedInvoiceGenerator {
  static async generateLateFeeInvoice(invoiceId: string): Promise<InvoiceGenerationResult> {
    try {
      // Fetch invoice with booking details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:booking_id(
            *,
            customer:customer_id(id, name, email, phone),
            car:car_id(id, brand, make, spec, plate_number, rental_price_daily)
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (invoiceError) {
        throw new Error(invoiceError.message || 'Failed to fetch late fee invoice');
      }

      if (!invoice) {
        throw new Error('Late fee invoice not found');
      }

      if (!invoice.booking) {
        throw new Error('Associated booking not found for this late fee invoice');
      }

      const bookingData = {
        invoice,
        booking: invoice.booking,
        customer: invoice.booking.customer,
        car: invoice.booking.car
      };

      // Generate invoice number if not exists
      const invoiceNumber = invoice.invoice_number || `INV-${Date.now()}`;

      // Calculate late fee details
      const lateDays = invoice.late_days || 0;
      const lateFeePerDay = invoice.late_fee_per_day || 50; // Default RM50 per day
      const totalLateFee = lateDays * lateFeePerDay;

      // Prepare late fee invoice data - ONLY late fees, no other charges
      const invoiceData = {
        invoiceNumber,
        invoiceDate: formatMalaysiaDate(new Date()),
        status: 'due',
        customer: {
          name: bookingData.customer.name,
          email: bookingData.customer.email,
          phone: bookingData.customer.phone,
        },
        car: {
          brand: bookingData.car.brand,
          make: bookingData.car.make,
          spec: bookingData.car.spec,
          plateNumber: bookingData.car.plate_number,
          dailyRate: bookingData.car.rental_price_daily,
        },
        booking: {
          bookingNumber: bookingData.booking.bookingNumber,
          handoverTime: formatMalaysiaDate(bookingData.booking.handoverTime),
          expectedReturnTime: formatMalaysiaDate(bookingData.booking.expectedReturnTime),
          actualReturnTime: formatMalaysiaDate(bookingData.booking.actualReturnTime),
          totalDays: bookingData.booking.totalDays,
          lateDays,
        },
        charges: {
          lateFeePerDay,
          totalLateFee,
        },
        totalAmount: totalLateFee,
      };

      return invoiceData;
    } catch (error) {
      console.error('Error generating late fee invoice:', error);
      throw error;
    }
  }
}