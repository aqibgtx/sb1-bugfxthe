import { supabase } from '../../lib/supabase';

interface ExtensionInvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  bookingId: string;
  extensionDays: number;
  dailyRate: number;
  extensionAmount: number;
  newEndDate: string;
  htmlContent: string;
  status: string;
  createdAt: string;
}

interface ExtensionInvoiceGenerationResult {
  invoiceId: string;
  invoiceNumber: string;
  previewUrl: string;
}

interface BookingData {
  id: string;
  booking_number: string;
  start_date: string;
  end_date: string;
  total_days: number;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  car: {
    brand: string;
    make: string;
    plate_number: string;
  };
}

export class ExtensionInvoiceGenerator {
  /**
   * Generate extension invoice using ONLY the exact parameters passed from the modal
   * This ensures the invoice matches exactly what the user sees in the preview
   */
  static async generateExtensionInvoice(
    params: {
      bookingId: string;
      originalBookingEndDate: string;
      extensionDays: number;
      dailyRate: number;
      extensionAmount: number;
      newEndDate: Date;
      invoiceNumber: string;
    }
  ): Promise<ExtensionInvoiceGenerationResult> {
    try {
      const { bookingId, originalBookingEndDate, extensionDays, dailyRate, extensionAmount, newEndDate, invoiceNumber } = params;
      
      // Validate that newEndDate is a valid Date object
      if (!newEndDate || !(newEndDate instanceof Date) || isNaN(newEndDate.getTime())) {
        throw new Error('Invalid newEndDate provided to ExtensionInvoiceGenerator');
      }
      
      console.log('🚀 ExtensionInvoiceGenerator.generateExtensionInvoice - EXACT Input Parameters:', {
        bookingId,
        extensionDays,
        dailyRate,
        extensionAmount,
        newEndDate: newEndDate.toISOString(),
        invoiceNumber
      });

      // CRITICAL: Validate input parameters to ensure they're correct
      if (extensionDays <= 0) {
        throw new Error(`Invalid extension days: ${extensionDays}. Must be greater than 0.`);
      }
      if (dailyRate <= 0) {
        throw new Error(`Invalid daily rate: ${dailyRate}. Must be greater than 0.`);
      }
      if (extensionAmount <= 0) {
        throw new Error(`Invalid extension amount: ${extensionAmount}. Must be greater than 0.`);
      }

      // CRITICAL: Use EXACT parameters - no recalculation to avoid discrepancies
      console.log('✅ Using EXACT parameters without recalculation:', {
        extensionDays,
        dailyRate,
        extensionAmount
      });

      // Fetch ONLY basic booking info needed for invoice generation
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          start_date,
          end_date,
          total_days,
          customer:customer_id(id, name, email, phone),
          car:car_id(id, brand, make, plate_number)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error(`Failed to fetch booking info: ${bookingError?.message || 'Booking not found'}`);
      }

      console.log('📋 Fetched booking data for invoice:', {
        bookingNumber: booking.booking_number,
        originalEndDate: booking.end_date,
        totalDays: booking.total_days,
        customerName: booking.customer?.name,
        carInfo: `${booking.car?.brand} ${booking.car?.make}`
      });

      // Generate HTML content using EXACT parameters - this is the critical fix
      const htmlContent = this.generateExtensionInvoiceHTML(
        booking,
        originalBookingEndDate,
        extensionDays,     // EXACT parameter from modal
        dailyRate,         // EXACT parameter from modal
        extensionAmount,   // EXACT parameter from modal
        newEndDate,        // EXACT parameter from modal
        invoiceNumber
      );

      console.log('📄 Generated HTML content with EXACT parameters:', {
        extensionDays,
        dailyRate,
        extensionAmount,
        invoiceNumber
      });

      // Save invoice to database with EXACT parameters
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          booking_id: bookingId,
          invoice_number: invoiceNumber,
          html_content: htmlContent,
          amount: extensionAmount, // Use EXACT parameter
          status: 'generated'
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('❌ Failed to save invoice:', invoiceError);
        throw new Error(`Failed to save extension invoice: ${invoiceError.message}`);
      }

      console.log('✅ Extension invoice saved successfully:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        status: invoice.status
      });

      // CRITICAL: Verify the saved invoice exactly matches our input parameters
      console.log('🔍 Final verification - saved vs input:', {
        savedAmount: invoice.amount,
        inputAmount: extensionAmount,
        exactMatch: invoice.amount === extensionAmount
      });

      return {
        invoiceId: invoice.id,
        invoiceNumber,
        previewUrl: `/invoice/${invoice.id}`
      };
    } catch (error) {
      console.error('❌ Error generating extension invoice:', error);
      throw error;
    }
  }

  /**
   * Generate HTML for extension invoice using EXACT parameters
   * This is the core function that must use the exact values from the modal
   */
  static generateExtensionInvoiceHTML(
    booking: BookingData,
    originalBookingEndDate: string,
    extensionDays: number,
    dailyRate: number,
    extensionAmount: number,
    newEndDate: Date,
    invoiceNumber: string
  ): string {
    console.log('🔍 ExtensionInvoiceGenerator.generateExtensionInvoiceHTML - Using EXACT parameters:', {
      originalBookingEndDate,
      extensionDays,
      dailyRate,
      extensionAmount,
      newEndDate: newEndDate.toISOString(),
      invoiceNumber
    });

    const customer = booking.customer;
    const car = booking.car;
    const carName = `${car.brand} ${car.make}`.trim();

    // Calculate timeline using exact parameters - CRITICAL FIX
   // Parse dates with UTC to ensure consistency
   const startDateStr = booking.start_date.includes('T') ? booking.start_date : `${booking.start_date}T00:00:00.000Z`;
   const endDateStr = originalBookingEndDate.includes('T') ? originalBookingEndDate : `${originalBookingEndDate}T00:00:00.000Z`;
   const originalStartDate = new Date(startDateStr);
   const originalEndDate = new Date(endDateStr);
    const totalDurationAfterExtension = booking.total_days + extensionDays;

    // CRITICAL: Debug the dates being used in HTML generation
    console.log('🗓️ ExtensionInvoiceGenerator - Date verification for HTML:', {
      originalStartDate: originalStartDate.toISOString(),
      originalEndDate: originalEndDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
      originalStartFormatted: originalStartDate.toLocaleDateString('en-MY'),
      originalEndFormatted: originalEndDate.toLocaleDateString('en-MY'),
      newEndFormatted: newEndDate.toLocaleDateString('en-MY'),
      extensionDays,
      totalDurationAfterExtension
    });

    // Verify the newEndDate is actually different from originalEndDate
   const daysDifference = Math.floor((newEndDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log('🔍 ExtensionInvoiceGenerator - Date difference verification:', {
      expectedDifference: extensionDays,
      actualDifference: daysDifference,
      datesAreCorrect: daysDifference === extensionDays
    });

   if (daysDifference !== extensionDays) {
      console.error('❌ ExtensionInvoiceGenerator - Incorrect dates received!', {
        originalEndDate: originalEndDate.toISOString(),
        newEndDate: newEndDate.toISOString(),
        expectedDays: extensionDays,
        actualDays: daysDifference
      });
      throw new Error(`Date calculation error: expected ${extensionDays} days, got ${daysDifference} days`);
    }

    // CRITICAL: Debug the dates being used in invoice generation
    console.log('🗓️ ExtensionInvoiceGenerator - Date verification:', {
      originalStartDate: originalStartDate.toLocaleDateString('en-MY'),
      originalEndDate: originalEndDate.toLocaleDateString('en-MY'),
      newEndDate: newEndDate.toLocaleDateString('en-MY'),
      extensionDays,
      totalDurationAfterExtension
    });

    // CRITICAL: Use EXACT parameters in the HTML generation
    console.log('✅ Generating HTML with EXACT parameters:', {
      invoiceNumber,
      extensionDays,        // This should be the exact number from modal
      dailyRate,           // This should be the exact rate from modal
      extensionAmount,     // This should be the exact amount from modal
      carName,
      customerName: customer.name
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extension Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; }
        .logo { width: 60px; height: 60px; background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }
        .company-info { text-align: right; }
        .company-info h2 { font-size: 18px; margin-bottom: 5px; }
        .company-info div { font-size: 14px; color: #666; }
        .invoice-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .invoice-details { margin-bottom: 30px; }
        .detail-group { margin-bottom: 20px; }
        .detail-label { font-weight: 600; color: #666; font-size: 14px; margin-bottom: 5px; }
        .detail-value { font-size: 14px; }
        .extension-notice { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .extension-notice h4 { color: #92400e; margin-bottom: 5px; }
        .extension-notice p { color: #92400e; font-size: 14px; }
        .line-items { margin-bottom: 30px; }
        .line-items table { width: 100%; border-collapse: collapse; }
        .line-items th { border-bottom: 1px solid #e0e0e0; padding: 10px; text-align: left; font-weight: 600; color: #666; }
        .line-items td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
        .extension-row { background-color: #fef3c7; }
        .extension-row td { color: #92400e; font-weight: 600; }
        .summary { text-align: right; margin-bottom: 30px; }
        .summary-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
        .summary-label { width: 100px; text-align: right; margin-right: 20px; }
        .summary-value { width: 100px; text-align: right; }
        .total-row { font-weight: 600; font-size: 16px; border-top: 1px solid #e0e0e0; padding-top: 10px; }
        .payment-instructions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
        .status-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #ef4444; color: white; }
        @media print {
            .container { padding: 10mm; }
            body { font-size: 10pt; }
            h1, h2, h3 { font-size: 12pt; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗</div>
            <div class="company-info">
                <h2>Budget Plus Rental</h2>
                <div>Kuala Lumpur, Malaysia</div>
                <div>+60 12-345 6789</div>
                <div>info@budgetplusrental.com</div>
            </div>
        </div>
        
        <div class="invoice-meta">
            <div>
                <h1>Extension Invoice #${invoiceNumber}</h1>
                <div>Date: ${new Date().toLocaleDateString('en-MY')}</div>
                <div>Original Booking: ${booking.booking_number}</div>
            </div>
            <div class="status-badge">DUE</div>
        </div>
        
        <div class="extension-notice">
            <h4>📅 Booking Extension</h4>
            <div style="margin-bottom: 10px;">
                <strong>Extension Details:</strong><br>
                • Extension Days: ${extensionDays} day${extensionDays > 1 ? 's' : ''}<br>
                • Daily Rate: RM ${dailyRate.toFixed(2)}<br>
                • Extension Amount: RM ${extensionAmount.toFixed(2)}
            </div>
            <div>
                <strong>Timeline:</strong><br>
                • Original: ${originalStartDate.toLocaleDateString('en-MY')} to ${originalEndDate.toLocaleDateString('en-MY')}<br>
                • Extended: ${originalStartDate.toLocaleDateString('en-MY')} to ${newEndDate.toLocaleDateString('en-MY')}<br>
                • Total Duration: ${totalDurationAfterExtension} days
            </div>
        </div>
        
        <div class="invoice-details">
            <div class="detail-group">
                <div class="detail-label">Customer:</div>
                <div class="detail-value">
                    <strong>${customer.name}</strong><br>
                    ${customer.email}<br>
                    ${customer.phone || ''}
                </div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Vehicle:</div>
                <div class="detail-value">
                    <strong>${carName}</strong><br>
                    Plate: ${car.plate_number}
                </div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Extension Summary:</div>
                <div class="detail-value">
                    <strong>Original End Date:</strong> ${originalEndDate.toLocaleDateString('en-MY')}<br>
                    <strong>New End Date:</strong> ${newEndDate.toLocaleDateString('en-MY')}<br>
                    <strong>Extension:</strong> ${extensionDays} day${extensionDays > 1 ? 's' : ''} × RM ${dailyRate.toFixed(2)} = RM ${extensionAmount.toFixed(2)}
                </div>
            </div>
        </div>
        
        <div class="line-items">
            <table>
                <thead>
                    <tr>
                        <th style="width: 60%">Description</th>
                        <th style="width: 10%; text-align: center">Days</th>
                        <th style="width: 15%; text-align: right">Daily Rate</th>
                        <th style="width: 15%; text-align: right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="extension-row">
                        <td>Extension: ${carName} - Additional ${extensionDays} day${extensionDays > 1 ? 's' : ''} rental</td>
                        <td style="text-align: center">${extensionDays}</td>
                        <td style="text-align: right">RM ${dailyRate.toFixed(2)}</td>
                        <td style="text-align: right"><strong>RM ${extensionAmount.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="summary">
            <div class="summary-row">
                <div class="summary-label">Subtotal:</div>
                <div class="summary-value">RM ${extensionAmount.toFixed(2)}</div>
            </div>
            <div class="summary-row total-row">
                <div class="summary-label">Total:</div>
                <div class="summary-value">RM ${extensionAmount.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="payment-instructions">
            <h3 style="margin-bottom: 10px; color: #1e40af;">Payment Instructions</h3>
            <div style="margin-bottom: 15px;">
                <strong>Extension Payment Summary:</strong><br>
                • Amount Due: RM ${extensionAmount.toFixed(2)}<br>
                • Payment Methods: Online Banking, Credit Card, QR Code<br>
                • Due Date: Within 7 days of invoice date
            </div>
            <p>Payment will be processed through our secure Stripe payment gateway.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
                Please include invoice number ${invoiceNumber} in payment reference.
            </p>
        </div>
        
        <div class="footer">
            <div><strong>Extension Terms:</strong> Payment due within 7 days. Late payment may result in additional charges or booking cancellation.</div>
           <div style="margin-top: 10px;"><strong>Extension Summary:</strong> ${extensionDays} day${extensionDays > 1 ? 's' : ''} extension for booking ${booking.booking_number}. Rental period extended from ${originalEndDate.toLocaleDateString('en-MY')} to ${newEndDate.toLocaleDateString('en-MY')}.</div>
           • Original Rental: ${originalStartDate.toLocaleDateString('en-MY')} to ${originalEndDate.toLocaleDateString('en-MY')}<br>
           • After Extension: ${originalStartDate.toLocaleDateString('en-MY')} to ${newEndDate.toLocaleDateString('en-MY')}<br>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Get extension invoice data for display (used by invoice viewer)
   */
  static async getExtensionInvoiceData(invoiceId: string): Promise<ExtensionInvoiceData> {
    try {
      console.log('🔍 ExtensionInvoiceGenerator.getExtensionInvoiceData - Loading invoice:', invoiceId);
      
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:booking_id(
            id,
            booking_number,
            start_date,
            end_date,
            total_days,
            customer:customer_id(name, email, phone),
            car:car_id(brand, make, plate_number)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        throw new Error('Extension invoice not found');
      }

      console.log('📋 ExtensionInvoiceGenerator - Invoice loaded:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        bookingId: invoice.booking_id
      });

      // Get extension data for this booking
      const { data: extensionData, error: extensionError } = await supabase
        .from('booking_extensions')
        .select('*')
        .eq('booking_id', invoice.booking_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (extensionError) {
        console.error('Error fetching extension data:', extensionError);
      }

      console.log('📊 ExtensionInvoiceGenerator - Extension data:', extensionData);

      // Calculate extension details from the extension record or parse from invoice
      let extensionDays = 0;
      let dailyRate = 0;
      let newEndDate = '';

      if (extensionData) {
        extensionDays = extensionData.extension_days;
        dailyRate = parseFloat(extensionData.daily_rate);
        newEndDate = extensionData.extended_end_date;
      } else {
        // Fallback: try to parse from invoice HTML content
        console.warn('⚠️ No extension data found, attempting to parse from HTML content');
        if (invoice.html_content) {
          // Try to extract extension days from HTML
          const daysMatch = invoice.html_content.match(/Extension:\s*(\d+)\s*day/i);
          const rateMatch = invoice.html_content.match(/RM\s*([\d,]+\.?\d*)/g);
          
          if (daysMatch) {
            extensionDays = parseInt(daysMatch[1]);
          }
          
          if (rateMatch && rateMatch.length >= 2) {
            // Second RM match is usually the daily rate
            dailyRate = parseFloat(rateMatch[1].replace(/[^\d.]/g, ''));
          }
        }
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        bookingId: invoice.booking_id,
        extensionDays,
        dailyRate,
        extensionAmount: invoice.amount,
        newEndDate,
        htmlContent: invoice.html_content || '',
        status: invoice.status,
        createdAt: invoice.created_at
      };
    } catch (error: any) {
      console.error('Error getting extension invoice data:', error);
      throw error;
    }
  }
}