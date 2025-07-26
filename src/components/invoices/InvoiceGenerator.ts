import { supabase } from '../../lib/supabase';
import { formatMalaysiaDate, getMalaysiaTime } from '../../lib/timezone';

interface InvoiceGenerationResult {
  invoiceId: string;
  invoiceNumber: string;
  previewUrl: string;
}

interface BookingData {
  id: string;
  booking_number: string;
  customer_id: string;
  staff_id: string;
  car_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  rental_amount: number;
  add_ons_amount: number;
  delivery_fee: number;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  booking_for: string;
  delivery_type: string;
  delivery_distance: number;
  delivery_enabled: boolean;
  requires_deposit: boolean;
  notes?: string;
  car_name?: string;
  car_plate_number?: string;
  is_agent_booking?: boolean;
  custom_price_requested?: number;
  agent_notes?: string;
}

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CarData {
  id: string;
  brand: string;
  make: string;
  spec?: string;
  plate_number: string;
  rental_price_daily: number;
}

interface AddOnData {
  id: string;
  add_on_id: string;
  quantity: number;
  price_daily: number;
  total_amount: number;
  add_on: {
    id: string;
    name: string;
    price_daily: number;
  };
}

interface DeliveryData {
  id: string;
  booking_id: string;
  delivery_address: string;
  pickup_address?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  bookingNumber?: string;
  status: 'paid' | 'due' | 'pending' | 'overdue';
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  car: {
    name: string;
    plateNumber: string;
  };
  booking: {
    startDate: string;
    endDate: string;
    totalDays: number;
    bookingFor?: string;
    deliveryType?: string;
    deliveryDistance?: number;
    hasDelivery?: boolean;
    requiresDeposit?: boolean;
    isAgentBooking?: boolean;
    customPriceRequested?: number;
    agentNotes?: string;
  };
  delivery?: {
    address?: string;
    pickupAddress?: string;
  } | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  accountDetails?: string;
  dueDate?: string;
  terms?: string;
  notes?: string;
}

export class InvoiceGenerator {
  static async generateInvoice(bookingId: string): Promise<InvoiceGenerationResult> {
    try {
      // Fetch booking details with related data
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customer_id(id, name, email, phone),
          staff:staff_id(id, name, email),
          car:car_id(id, brand, make, spec, plate_number, rental_price_daily),
          booking_add_ons(
            *,
            add_on:add_on_id(id, name, price_daily)
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (bookingError) {
        throw new Error(bookingError.message || 'Failed to fetch booking');
      }

      if (!booking) {
        throw new Error('Booking not found for invoice generation');
      }

      // Fetch delivery details separately
      const { data: deliveryDetails } = await supabase
        .from('delivery_details')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceNumberError) {
        throw new Error('Failed to generate invoice number');
      }

      // Create invoice data from booking data (EXCLUDING late fees)
      const invoiceData = this.createInvoiceDataFromBooking(
        booking as BookingData,
        booking.customer as CustomerData,
        booking.car as CarData,
        booking.booking_add_ons as AddOnData[],
        deliveryDetails as DeliveryData | null,
        invoiceNumber
      );

      // Generate HTML content
      const htmlContent = InvoiceGenerator.generateInvoiceHTML(invoiceData);

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          booking_id: bookingId,
          invoice_number: invoiceNumber,
          html_content: htmlContent,
          amount: invoiceData.total,
          status: 'generated'
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error('Failed to save invoice');
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber,
        previewUrl: `/invoice/${invoice.id}`
      };
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  static async getInvoiceData(invoiceId: string): Promise<InvoiceData> {
    try {
      // Fetch invoice with booking details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:booking_id(
            *,
            customer:customer_id(id, name, email, phone),
            staff:staff_id(id, name, email),
            car:car_id(id, brand, make, spec, plate_number, rental_price_daily),
            booking_add_ons(
              *,
              add_on:add_on_id(id, name, price_daily)
            )
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (invoiceError) {
        throw new Error(invoiceError.message || 'Failed to fetch invoice');
      }

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (!invoice.booking) {
        throw new Error('Associated booking not found for this invoice');
      }

      // Fetch delivery details separately
      const { data: deliveryDetails } = await supabase
        .from('delivery_details')
        .select('*')
        .eq('booking_id', invoice.booking.id)
        .maybeSingle();

      // Transform data for the template
      return this.createInvoiceDataFromBooking(
        invoice.booking as BookingData,
        invoice.booking.customer as CustomerData,
        invoice.booking.car as CarData,
        invoice.booking.booking_add_ons as AddOnData[],
        deliveryDetails as DeliveryData | null,
        invoice.invoice_number
      );
    } catch (error) {
      console.error('Error getting invoice data:', error);
      throw error;
    }
  }

  private static createInvoiceDataFromBooking(
    booking: BookingData,
    customer: CustomerData,
    car: CarData,
    addOns: AddOnData[],
    deliveryDetails: DeliveryData | null,
    invoiceNumber: string
  ): InvoiceData {
    // Prepare line items based on booking data (EXCLUDING late fees)
    const lineItems = [];
    
    // Add rental fee
    const carName = `${car.brand} ${car.make} ${car.spec || ''}`.trim();
    lineItems.push({
      description: `Car Rental - ${carName}`,
      quantity: booking.total_days,
      rate: parseFloat(booking.rental_amount.toString()) / booking.total_days,
      amount: parseFloat(booking.rental_amount.toString())
    });

    // Add add-ons
    if (addOns && addOns.length > 0) {
      addOns.forEach((addOn: AddOnData) => {
        lineItems.push({
          description: addOn.add_on.name,
          quantity: addOn.quantity * booking.total_days,
          rate: parseFloat(addOn.add_on.price_daily.toString()),
          amount: parseFloat(addOn.total_amount.toString())
        });
      });
    }

    // Add delivery fee if applicable
    if (booking.delivery_type && booking.delivery_type !== 'self_pickup' && booking.delivery_fee && parseFloat(booking.delivery_fee.toString()) > 0) {
      let deliveryDescription = 'Delivery Service';
      
      switch (booking.delivery_type) {
        case 'free_pickup':
          if (booking.delivery_distance <= 7) {
            deliveryDescription = `Free Pickup Service (within 7km)`;
          } else {
            deliveryDescription = `Pickup Service (${booking.delivery_distance - 7}km beyond free zone @ RM2/km)`;
          }
          break;
        case 'vip_delivery':
          deliveryDescription = `VIP Delivery Service (${booking.delivery_distance}km)`;
          break;
        default:
          deliveryDescription = `Delivery Service (${booking.delivery_distance}km)`;
      }
      
      lineItems.push({
        description: deliveryDescription,
        quantity: 1,
        rate: parseFloat(booking.delivery_fee.toString()),
        amount: parseFloat(booking.delivery_fee.toString())
      });
    }

    // Add deposit if collected (for tracking purposes, not charged)
    if (booking.deposit_amount && parseFloat(booking.deposit_amount.toString()) > 0) {
      lineItems.push({
        description: `Security Deposit (Refundable)`,
        quantity: 1,
        rate: parseFloat(booking.deposit_amount.toString()),
        amount: parseFloat(booking.deposit_amount.toString())
      });
    }
    // Calculate total from line items (NO late fees included)
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Prepare comprehensive invoice data
    return {
      invoiceNumber,
      invoiceDate: formatMalaysiaDate(getMalaysiaTime()),
      bookingNumber: booking.booking_number,
      status: this.getInvoiceStatus(booking.payment_status),
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || ''
      },
      car: {
        name: carName,
        plateNumber: car.plate_number
      },
      booking: {
        startDate: formatMalaysiaDate(booking.start_date),
        endDate: formatMalaysiaDate(booking.end_date),
        totalDays: booking.total_days,
        bookingFor: booking.booking_for,
        deliveryType: booking.delivery_type,
        deliveryDistance: booking.delivery_distance,
        hasDelivery: booking.delivery_type && booking.delivery_type !== 'self_pickup',
        requiresDeposit: booking.requires_deposit,
        isAgentBooking: booking.is_agent_booking,
        customPriceRequested: booking.custom_price_requested,
        agentNotes: booking.agent_notes
      },
      delivery: deliveryDetails ? {
        address: deliveryDetails.delivery_address,
        pickupAddress: deliveryDetails.pickup_address
      } : null,
      lineItems,
      subtotal: totalAmount,
      total: totalAmount,
      paymentMethod: 'Online Banking / Credit Card',
      accountDetails: 'Payment will be processed through our secure payment gateway.',
      terms: 'Payment is due within 7 days of invoice date. Late payments may incur additional charges.',
      notes: `${booking.notes || 'Thank you for choosing Budget Plus Rental!'}${booking.deposit_amount && parseFloat(booking.deposit_amount.toString()) > 0 ? ` | Security deposit of RM${parseFloat(booking.deposit_amount.toString()).toLocaleString()} collected and will be refunded upon successful return.` : ''}`
    };
  }

  private static getInvoiceStatus(paymentStatus: string): 'paid' | 'due' | 'pending' | 'overdue' {
    switch (paymentStatus) {
      case 'approved':
      case 'completed':
        return 'paid';
      case 'payment_completed':
        return 'pending';
      case 'rejected':
      case 'cancelled':
        return 'overdue';
      default:
        return 'due';
    }
  }

  private static getDeliveryTypeDisplay(deliveryType: string): string {
    switch (deliveryType) {
      case 'free_pickup':
        return 'Pickup Service';
      case 'vip_delivery':
        return 'VIP Delivery Service';
      case 'self_pickup':
        return 'Self Pickup';
      default:
        return 'Delivery Service';
    }
  }

  private static getLineItemRowClass(description: string): string {
    if (description.includes('Delivery') || description.includes('Pickup')) {
      return 'class="delivery-fee-row"';
    } else if (description.includes('VIP') || description.includes('Agent')) {
      return 'class="agent-booking-row"';
    }
    return '';
  }

  static generateInvoiceHTML(data: InvoiceData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.invoiceNumber}</title>
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
        .delivery-fee-row { background-color: #f0f9ff; }
        .delivery-fee-row td { color: #1e40af; font-weight: 600; }
        .agent-booking-row { background-color: #f3e8ff; }
        .agent-booking-row td { color: #7c3aed; font-weight: 600; }
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
        .delivery-notice { background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .delivery-notice h4 { color: #1e40af; margin-bottom: 5px; }
        .delivery-notice p { color: #1e40af; font-size: 14px; }
        .agent-booking-notice { background: #f3e8ff; border: 1px solid #7c3aed; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .agent-booking-notice h4 { color: #7c3aed; margin-bottom: 5px; }
        .agent-booking-notice p { color: #7c3aed; font-size: 14px; }
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
                <h1>Invoice #${data.invoiceNumber}</h1>
                <div>Date: ${data.invoiceDate}</div>
                ${data.bookingNumber ? `<div>Booking: ${data.bookingNumber}</div>` : ''}
            </div>
            <div class="status-badge status-${data.status}">${data.status.toUpperCase()}</div>
        </div>
        
        ${data.booking.isAgentBooking ? `
        <div class="agent-booking-notice">
            <h4>🌟 VIP Agent Booking</h4>
            <p>This is a special VIP booking created by our staff member.</p>
            ${data.booking.customPriceRequested ? `<p>Custom price requested: RM${data.booking.customPriceRequested}</p>` : ''}
            ${data.booking.agentNotes ? `<p>Agent notes: ${data.booking.agentNotes}</p>` : ''}
        </div>
        ` : ''}
        
        ${data.booking.hasDelivery ? `
        <div class="delivery-notice">
            <h4>🚚 Delivery Service Included</h4>
            <p>Delivery Type: ${this.getDeliveryTypeDisplay(data.booking.deliveryType || '')}${data.booking.deliveryType === 'free_pickup' && data.booking.deliveryDistance && data.booking.deliveryDistance <= 7 ? ' (Free within 7km)' : data.booking.deliveryType === 'free_pickup' && data.booking.deliveryDistance && data.booking.deliveryDistance > 7 ? ` (RM2/km beyond 7km)` : ''}</p>
            ${data.booking.deliveryDistance ? `<p>Distance: ${data.booking.deliveryDistance} km</p>` : ''}
            ${data.delivery?.address ? `<p>Delivery Address: ${data.delivery.address}</p>` : ''}
            ${data.delivery?.pickupAddress && data.delivery.pickupAddress !== data.delivery.address ? `<p>Pickup Address: ${data.delivery.pickupAddress}</p>` : ''}
        </div>
        ` : ''}
        
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
                <div class="detail-label">Rental Period:</div>
                <div class="detail-value">
                    Pickup: ${data.booking.startDate}<br>
                    Return: ${data.booking.endDate}<br>
                    <strong>${data.booking.totalDays} day${data.booking.totalDays > 1 ? 's' : ''}</strong>
                </div>
            </div>
            
            ${data.booking.bookingFor ? `
            <div class="detail-group">
                <div class="detail-label">Booking For:</div>
                <div class="detail-value">
                    ${data.booking.bookingFor === 'myself' ? 'Customer (Self)' : 'Someone Else'}
                    ${data.booking.requiresDeposit ? '<br><em>Security deposit required</em>' : ''}
                </div>
            </div>
            ` : ''}
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
                        <tr ${this.getLineItemRowClass(item.description)}>
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
            <div class="summary-row">
                <div class="summary-label">Subtotal:</div>
                <div class="summary-value">RM ${data.subtotal.toFixed(2)}</div>
            </div>
            ${data.tax ? `
                <div class="summary-row">
                    <div class="summary-label">Tax:</div>
                    <div class="summary-value">RM ${data.tax.toFixed(2)}</div>
                </div>
            ` : ''}
            <div class="summary-row total-row">
                <div class="summary-label">Total:</div>
                <div class="summary-value">RM ${data.total.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="payment-instructions">
            <h3 style="margin-bottom: 10px; color: #1e40af;">Payment Instructions</h3>
            <p>Please pay via ${data.paymentMethod}</p>
            ${data.accountDetails ? `<p>${data.accountDetails}</p>` : ''}
            ${data.dueDate ? `<p><strong>Payment due by: ${data.dueDate}</strong></p>` : ''}
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