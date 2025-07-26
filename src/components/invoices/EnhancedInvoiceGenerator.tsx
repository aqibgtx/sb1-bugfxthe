import { supabase } from '../../lib/supabase';

interface InvoiceGenerationResult {
  invoiceId: string;
  invoiceNumber: string;
  previewUrl: string;
}

interface LateFeeInvoiceData {
  customer: any;
  car: any;
  booking: {
    bookingNumber: string;
    handoverTime: string;
    expectedReturnTime: Date;
    actualReturnTime: string;
    totalDays: number;
    dailyRate: number;
  };
}

export class EnhancedInvoiceGenerator {
  // Method specifically for late fee invoices ONLY
  static async generateLateFeeInvoice(
    bookingId: string, 
    lateFee: number, 
    hoursOverdue: number, 
    bookingData: LateFeeInvoiceData
  ): Promise<InvoiceGenerationResult> {
    try {
      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceNumberError) {
        throw new Error('Failed to generate invoice number');
      }

      // Prepare late fee invoice data - ONLY late fees, no other charges
      const invoiceData = {
        invoiceNumber,
        invoiceDate: new Date().toLocaleDateString('en-MY'),
        status: 'due',
        customer: {
          name: bookingData.customer.name,
          email: bookingData.customer.email,
          phone: bookingData.customer.phone
        },
        car: {
          name: `${bookingData.car.brand} ${bookingData.car.make} ${bookingData.car.spec || ''}`.trim(),
          plateNumber: bookingData.car.plate_number
        },
        booking: {
          bookingNumber: bookingData.booking.bookingNumber,
          handoverTime: new Date(bookingData.booking.handoverTime).toLocaleDateString('en-MY'),
          expectedReturnTime: bookingData.booking.expectedReturnTime.toLocaleDateString('en-MY'),
          actualReturnTime: new Date(bookingData.booking.actualReturnTime).toLocaleDateString('en-MY'),
          totalDays: bookingData.booking.totalDays,
          dailyRate: bookingData.booking.dailyRate,
          hoursOverdue: Math.ceil(hoursOverdue),
          isLateFeeInvoice: true
        },
        lineItems: [{
          description: `Late Return Fee (${Math.ceil(hoursOverdue)} hours @ 10% of RM${bookingData.booking.dailyRate.toFixed(2)} daily rate)`,
          quantity: 1,
          rate: lateFee,
          amount: lateFee
        }],
        subtotal: lateFee,
        total: lateFee,
        paymentMethod: 'Online Banking / Credit Card',
        accountDetails: 'Payment will be processed through our secure payment gateway.',
        terms: 'Late fee payment is due immediately. Thank you for your understanding.',
        notes: `This invoice covers late return fees for booking #${bookingData.booking.bookingNumber}. Vehicle was returned ${Math.ceil(hoursOverdue)} hours after the scheduled return time.`
      };

      // Generate HTML content for late fee invoice
      const htmlContent = this.generateLateFeeInvoiceHTML(invoiceData);

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          booking_id: bookingId,
          invoice_number: invoiceNumber,
          html_content: htmlContent,
          amount: lateFee,
          status: 'generated'
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error('Failed to save late fee invoice');
      }

      // Update booking with late fee invoice information
      const fullInvoiceUrl = `${window.location.origin}/invoice/${invoice.id}`;
      
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          late_fee_invoice_url: fullInvoiceUrl,
          late_fee_invoice_number: invoiceNumber,
          late_fee: lateFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.error('Error updating booking with late fee invoice info:', bookingUpdateError);
        // Don't throw error as invoice was created successfully
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber,
        previewUrl: fullInvoiceUrl
      };
    } catch (error) {
      console.error('Error generating late fee invoice:', error);
      throw error;
    }
  }

  // Method to get late fee invoice data for preview
  static async getLateFeeInvoiceData(invoiceId: string): Promise<any> {
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
        .single();

      if (invoiceError || !invoice) {
        throw new Error('Late fee invoice not found');
      }

      // Check if this is a late fee invoice by checking the amount against late_fee
      const isLateFeeInvoice = invoice.booking.late_fee && 
        Math.abs(parseFloat(invoice.amount) - parseFloat(invoice.booking.late_fee)) < 0.01;

      if (!isLateFeeInvoice) {
        throw new Error('This is not a late fee invoice');
      }

      // Return the stored HTML content for late fee invoices
      return {
        htmlContent: invoice.html_content,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        isLateFeeInvoice: true
      };
    } catch (error) {
      console.error('Error getting late fee invoice data:', error);
      throw error;
    }
  }

  private static generateLateFeeInvoiceHTML(data: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Late Fee Invoice ${data.invoiceNumber}</title>
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
        .line-items { margin-bottom: 30px; }
        .line-items table { width: 100%; border-collapse: collapse; }
        .line-items th { border-bottom: 1px solid #e0e0e0; padding: 10px; text-align: left; font-weight: 600; color: #666; }
        .line-items td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
        .late-fee-row { background-color: #fef3c7; }
        .late-fee-row td { color: #92400e; font-weight: 600; }
        .summary { text-align: right; margin-bottom: 30px; }
        .summary-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
        .summary-label { width: 100px; text-align: right; margin-right: 20px; }
        .summary-value { width: 100px; text-align: right; }
        .total-row { font-weight: 600; font-size: 16px; border-top: 1px solid #e0e0e0; padding-top: 10px; }
        .payment-instructions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
        .status-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .status-paid { background: #10b981; color: white; }
        .status-due { background: #ef4444; color: white; }
        .status-pending { background: #f59e0b; color: white; }
        .late-fee-notice { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .late-fee-notice h4 { color: #dc2626; margin-bottom: 5px; }
        .late-fee-notice p { color: #dc2626; font-size: 14px; }
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
                <h1>Late Fee Invoice #${data.invoiceNumber}</h1>
                <div>Date: ${data.invoiceDate}</div>
                <div style="color: #dc2626; font-weight: 600;">LATE RETURN FEE</div>
            </div>
            <div class="status-badge status-${data.status}">${data.status.toUpperCase()}</div>
        </div>
        
        <div class="late-fee-notice">
            <h4>⚠️ Late Return Fee Invoice</h4>
            <p>This invoice is specifically for late return fees incurred due to returning the vehicle after the scheduled return time.</p>
            <p><strong>Booking:</strong> #${data.booking.bookingNumber}</p>
            <p><strong>Expected Return:</strong> ${data.booking.expectedReturnTime}</p>
            <p><strong>Actual Return:</strong> ${data.booking.actualReturnTime}</p>
            <p><strong>Hours Overdue:</strong> ${data.booking.hoursOverdue}</p>
        </div>
        
        <div class="invoice-details">
            <div class="detail-group">
                <div class="detail-label">Customer:</div>
                <div class="detail-value">
                    <strong>${data.customer.name}</strong><br>
                    ${data.customer.email}<br>
                    ${data.customer.phone || ''}
                </div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Vehicle:</div>
                <div class="detail-value">
                    <strong>${data.car.name}</strong><br>
                    Plate: ${data.car.plateNumber}
                </div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Late Return Details:</div>
                <div class="detail-value">
                    Handover Date: ${data.booking.handoverTime}<br>
                    Expected Return: ${data.booking.expectedReturnTime}<br>
                    Actual Return: ${data.booking.actualReturnTime}<br>
                    <strong>Hours Overdue: ${data.booking.hoursOverdue}</strong><br>
                    <strong>Daily Rate: RM ${data.booking.dailyRate.toFixed(2)}</strong><br>
                    <strong>Late Fee Rate: 10% per hour</strong>
                </div>
            </div>
        </div>
        
        <div class="line-items">
            <table>
                <thead>
                    <tr>
                        <th style="width: 60%">Description</th>
                        <th style="width: 10%; text-align: center">Qty</th>
                        <th style="width: 15%; text-align: right">Rate</th>
                        <th style="width: 15%; text-align: right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.lineItems.map((item: any) => `
                        <tr class="late-fee-row">
                            <td>${item.description}</td>
                            <td style="text-align: center">${item.quantity}</td>
                            <td style="text-align: right">RM ${item.rate.toFixed(2)}</td>
                            <td style="text-align: right"><strong>RM ${item.amount.toFixed(2)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="summary">
            <div class="summary-row total-row">
                <div class="summary-label">Total Late Fee:</div>
                <div class="summary-value">RM ${data.total.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="payment-instructions">
            <h3 style="margin-bottom: 10px; color: #dc2626;">Payment Instructions</h3>
            <p>Please pay via ${data.paymentMethod}</p>
            ${data.accountDetails ? `<p>${data.accountDetails}</p>` : ''}
            <p><strong>Payment is due immediately.</strong></p>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
                Please include your invoice number in the payment reference.
            </p>
        </div>
        
        <div class="footer">
            ${data.terms ? `<div><strong>Terms & Conditions:</strong> ${data.terms}</div>` : ''}
            ${data.notes ? `<div style="margin-top: 10px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
            <div style="margin-top: 15px; color: #9ca3af;">
                Thank you for choosing Budget Plus Rental. Drive safe!
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }
}