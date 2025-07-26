import { supabase } from '../../lib/supabase';
import { formatMalaysiaDate, formatMalaysiaTime, toMalaysiaTime } from '../../lib/timezone';

interface HandoverInvoiceData {
  booking: {
    id: string;
    booking_number: string;
    customer: {
      name: string;
      email: string;
      phone?: string;
    };
    car: {
      brand: string;
      make: string;
      spec?: string;
      plate_number: string;
    };
    total_days: number;
    rental_amount: number;
    start_date: string;
    end_date: string;
  };
  handover: {
    handover_time: string;
    deposit_amount?: number;
    proof_photo_urls: string[];
    staff_name: string;
  };
}

interface ReturnInvoiceData {
  booking: {
    id: string;
    booking_number: string;
    customer: {
      name: string;
      email: string;
      phone?: string;
    };
    car: {
      brand: string;
      make: string;
      spec?: string;
      plate_number: string;
    };
    total_days: number;
    rental_amount: number;
    start_date: string;
    end_date: string;
    handover_time: string;
    handover_photo_url?: string;
  };
  return: {
    return_time: string;
    deposit_returned?: number;
    late_fee?: number;
    proof_photo_urls: string[];
    deposit_return_proof_urls?: string[];
    car_return_proof_urls?: string[];
    staff_name: string;
    current_mileage?: number;
  };
}

interface InvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  previewUrl: string;
}

export class HandoverReturnInvoiceGenerator {
  // Generate handover invoice with deposit collection
  static async generateHandoverInvoice(data: HandoverInvoiceData, staffId: string): Promise<InvoiceResult> {
    try {
      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string' || staffId.length !== 36) {
        throw new Error('Valid staff ID is required to generate handover invoice');
      }

      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase
        .rpc('generate_handover_invoice_number');

      if (invoiceNumberError) {
        throw new Error('Failed to generate handover invoice number');
      }

      // Generate HTML content
      const htmlContent = this.generateHandoverInvoiceHTML(data, invoiceNumber);

      // Calculate total amount (deposit if collected)
      const totalAmount = data.handover.deposit_amount || 0;

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from('handover_invoices')
        .insert({
          booking_id: data.booking.id,
          invoice_number: invoiceNumber,
          invoice_type: 'handover',
          html_content: htmlContent,
          amount: totalAmount,
          deposit_amount: data.handover.deposit_amount || 0,
          proof_photo_urls: data.handover.proof_photo_urls,
          staff_id: staffId
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error('Failed to save handover invoice');
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber,
        previewUrl: `${window.location.origin}/handover-invoice/${invoice.id}`
      };
    } catch (error) {
      console.error('Error generating handover invoice:', error);
      throw error;
    }
  }

  // Generate return invoice with deposit return and late fees
  static async generateReturnInvoice(data: ReturnInvoiceData, staffId: string): Promise<InvoiceResult> {
    try {
      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string' || staffId.length !== 36) {
        throw new Error('Valid staff ID is required to generate return invoice');
      }

      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase
        .rpc('generate_handover_invoice_number');

      if (invoiceNumberError) {
        throw new Error('Failed to generate return invoice number');
      }

      // Generate HTML content
      const htmlContent = this.generateReturnInvoiceHTML(data, invoiceNumber);

      // Calculate total amount (late fee if any)
      const totalAmount = data.return.late_fee || 0;

      // Combine all proof photos
      const allProofPhotos = [
        ...data.return.proof_photo_urls,
        ...(data.return.deposit_return_proof_urls || []),
        ...(data.return.car_return_proof_urls || [])
      ];

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from('handover_invoices')
        .insert({
          booking_id: data.booking.id,
          invoice_number: invoiceNumber,
          invoice_type: 'return',
          html_content: htmlContent,
          amount: totalAmount,
          late_fee_amount: data.return.late_fee || 0,
          proof_photo_urls: allProofPhotos,
          staff_id: staffId
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error('Failed to save return invoice');
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber,
        previewUrl: `${window.location.origin}/handover-invoice/${invoice.id}`
      };
    } catch (error) {
      console.error('Error generating return invoice:', error);
      throw error;
    }
  }

  // Get invoice data for preview
  static async getInvoiceData(invoiceId: string): Promise<any> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('handover_invoices')
        .select(`
          *,
          booking:booking_id(
            *,
            customer:customer_id(id, name, email, phone),
            car:car_id(id, brand, make, spec, plate_number),
            staff:staff_id(name),
            handover_by:handover_by(name),
            returned_by:returned_by(name)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found');
      }

      return {
        htmlContent: invoice.html_content,
        invoiceNumber: invoice.invoice_number,
        invoiceType: invoice.invoice_type,
        amount: invoice.amount,
        depositAmount: invoice.deposit_amount,
        lateFeeAmount: invoice.late_fee_amount,
        proofPhotos: invoice.proof_photo_urls,
        booking: invoice.booking
      };
    } catch (error) {
      console.error('Error getting invoice data:', error);
      throw error;
    }
  }

  // Generate handover invoice HTML
  private static generateHandoverInvoiceHTML(data: HandoverInvoiceData, invoiceNumber: string): string {
    const handoverDate = formatMalaysiaDate(data.handover.handover_time);
    const handoverTime = formatMalaysiaTime(data.handover.handover_time);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Handover Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', Arial, sans-serif; 
            color: #333; 
            line-height: 1.6; 
            font-size: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .invoice-container { 
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            overflow: hidden;
            position: relative;
        }
        
        .invoice-header { 
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .invoice-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 1;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo { 
            width: 80px; 
            height: 80px; 
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 36px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        .invoice-title {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .invoice-subtitle {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .invoice-meta {
            text-align: right;
        }
        
        .meta-item {
            margin-bottom: 15px;
        }
        
        .meta-label {
            font-size: 14px;
            opacity: 0.8;
            display: block;
            margin-bottom: 5px;
        }
        
        .meta-value {
            font-size: 20px;
            font-weight: 700;
        }
        
        .invoice-content {
            padding: 40px;
        }
        
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .section {
            background: #f8fafc;
            padding: 25px;
            border-radius: 15px;
            border-left: 4px solid #4facfe;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            align-items: center;
        }
        
        .info-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            text-align: right;
        }
        
        .deposit-section {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            text-align: center;
            position: relative;
        }
        
        .deposit-section::before {
            content: '💰';
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 48px;
            opacity: 0.3;
        }
        
        .deposit-title {
            font-size: 24px;
            font-weight: 800;
            color: #92400e;
            margin-bottom: 15px;
        }
        
        .deposit-amount {
            font-size: 36px;
            font-weight: 900;
            color: #92400e;
            margin-bottom: 10px;
        }
        
        .deposit-note {
            color: #b45309;
            font-size: 14px;
        }
        
        .photos-section {
            margin: 40px 0;
        }
        
        .photos-title {
            font-size: 20px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .photo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .photo-item {
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            background: white;
            transition: transform 0.3s ease;
        }
        
        .photo-item:hover {
            transform: translateY(-5px);
        }
        
        .photo-item img {
            width: 100%;
            height: 300px;
            object-fit: cover;
            display: block;
        }
        
        .photo-caption {
            padding: 15px;
            background: #f1f5f9;
            font-size: 14px;
            text-align: center;
            color: #475569;
            font-weight: 600;
        }
        
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 50px 0;
            padding-top: 30px;
            border-top: 2px dashed #e2e8f0;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 2px solid #4facfe;
            height: 60px;
            margin-bottom: 10px;
        }
        
        .signature-label {
            font-weight: 600;
            color: #4a5568;
            font-size: 16px;
        }
        
        .footer {
            background: #1a202c;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .footer-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .footer-text {
            opacity: 0.8;
            font-size: 14px;
            line-height: 1.4;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            body {
                padding: 10px;
                font-size: 13px;
            }
            
            .invoice-container {
                border-radius: 10px;
                margin: 0;
            }
            
            .invoice-header {
                padding: 20px;
            }
            
            .header-content {
                flex-direction: column;
                text-align: center;
                gap: 20px;
            }
            
            .company-logo {
                width: 60px;
                height: 60px;
                font-size: 28px;
                margin: 0 auto 15px;
            }
            
            .invoice-title {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .invoice-subtitle {
                font-size: 14px;
            }
            
            .invoice-meta {
                text-align: center;
            }
            
            .meta-value {
                font-size: 16px;
            }
            
            .invoice-content {
                padding: 20px;
            }
            
            .content-grid {
                grid-template-columns: 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .section {
                padding: 20px;
                border-radius: 10px;
            }
            
            .section-title {
                font-size: 16px;
                margin-bottom: 15px;
            }
            
            .section-icon {
                width: 20px;
                height: 20px;
                font-size: 11px;
            }
            
            .info-row {
                flex-direction: column;
                align-items: flex-start;
                margin-bottom: 15px;
                gap: 5px;
            }
            
            .info-label {
                font-size: 12px;
                font-weight: 600;
            }
            
            .info-value {
                font-size: 14px;
                text-align: left;
            }
            
            .deposit-section, .late-fee-section {
                padding: 20px;
                margin: 20px 0;
                border-radius: 10px;
            }
            
            .amount-title {
                font-size: 18px;
                margin-bottom: 10px;
            }
            
            .amount-value {
                font-size: 28px;
                margin-bottom: 8px;
            }
            
            .amount-note {
                font-size: 12px;
            }
            
            .photos-section {
                margin: 30px 0;
            }
            
            .photos-title {
                font-size: 16px;
                margin-bottom: 20px;
            }
            
            .photo-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .photo-item {
                border-radius: 10px;
                max-width: 100%;
            }
            
            .photo-item img {
                width: 100%;
                height: auto;
                min-height: 200px;
                max-height: 400px;
                object-fit: contain;
                background: #f8f9fa;
            }
            
            .photo-caption {
                padding: 12px;
                font-size: 12px;
            }
            
            .signature-section {
                grid-template-columns: 1fr;
                gap: 30px;
                margin: 30px 0;
                padding-top: 20px;
            }
            
            .signature-line {
                height: 50px;
                margin-bottom: 8px;
            }
            
            .signature-label {
                font-size: 14px;
            }
            
            .footer {
                padding: 20px;
            }
            
            .footer-title {
                font-size: 16px;
                margin-bottom: 8px;
            }
            
            .footer-text {
                font-size: 12px;
            }
        }
        
        /* Small mobile devices */
        @media (max-width: 480px) {
            body {
                padding: 5px;
                font-size: 12px;
            }
            
            .invoice-header {
                padding: 15px;
            }
            
            .company-logo {
                width: 50px;
                height: 50px;
                font-size: 24px;
            }
            
            .invoice-title {
                font-size: 20px;
            }
            
            .invoice-subtitle {
                font-size: 12px;
            }
            
            .meta-value {
                font-size: 14px;
            }
            
            .invoice-content {
                padding: 15px;
            }
            
            .section {
                padding: 15px;
            }
            
            .section-title {
                font-size: 14px;
            }
            
            .info-row {
                margin-bottom: 12px;
            }
            
            .info-label {
                font-size: 11px;
            }
            
            .info-value {
                font-size: 13px;
            }
            
            .deposit-section, .late-fee-section {
                padding: 15px;
            }
            
            .amount-title {
                font-size: 16px;
            }
            
            .amount-value {
                font-size: 24px;
            }
            
            .amount-note {
                font-size: 11px;
            }
            
            .photos-title {
                font-size: 14px;
            }
            
            .photo-item img {
                min-height: 180px;
                max-height: 350px;
            }
            
            .photo-caption {
                padding: 10px;
                font-size: 11px;
            }
            
            .footer {
                padding: 15px;
            }
            
            .footer-title {
                font-size: 14px;
            }
            
            .footer-text {
                font-size: 11px;
            }
        }
        
        /* Print styles - A4 layout only for printing/downloading */
        @media print {
            @page {
                size: A4;
                margin: 15mm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            body { 
                background: white; 
                padding: 0;
                font-size: 11px;
                line-height: 1.4;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color: black !important;
            }
            
            .invoice-container { 
                max-width: none;
                box-shadow: none; 
                border-radius: 0;
                margin: 0;
                background: white !important;
            }
            
            .invoice-header {
                padding: 20px;
                margin-bottom: 15px;
                border-radius: 8px;
                background: #4facfe !important;
                color: white !important;
            }
            
            .company-logo {
                width: 50px;
                height: 50px;
                font-size: 24px;
                margin-bottom: 10px;
                background: rgba(255,255,255,0.2) !important;
                color: white !important;
            }
            
            .invoice-title {
                font-size: 20px;
                margin-bottom: 5px;
                color: white !important;
            }
            
            .invoice-subtitle {
                font-size: 12px;
                color: white !important;
            }
            
            .meta-value {
                font-size: 14px;
                color: white !important;
            }
            
            .invoice-content {
                padding: 20px 0;
                background: white !important;
            }
            
            .content-grid {
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .section {
                padding: 15px;
                border-radius: 8px;
                background: #f8fafc !important;
                border-left: 4px solid #4facfe !important;
            }
            
            .section-title {
                font-size: 14px;
                margin-bottom: 10px;
                gap: 8px;
                color: #2d3748 !important;
            }
            
            .section-icon {
                width: 18px;
                height: 18px;
                font-size: 10px;
                background: #4facfe !important;
                color: white !important;
            }
            
            .info-row {
                margin-bottom: 6px;
            }
            
            .info-label {
                font-size: 10px;
                color: #64748b !important;
            }
            
            .info-value {
                font-size: 11px;
                color: #1e293b !important;
            }
            
            .deposit-section {
                padding: 20px;
                margin: 15px 0;
                border-radius: 8px;
                background: #ffecd2 !important;
                page-break-inside: avoid;
            }
            
            .deposit-title {
                font-size: 16px;
                margin-bottom: 8px;
                color: #92400e !important;
            }
            
            .deposit-amount {
                font-size: 24px;
                margin-bottom: 8px;
                color: #92400e !important;
            }
            
            .deposit-note {
                font-size: 10px;
                color: #b45309 !important;
            }
            
            .photos-section {
                margin: 15px 0;
                page-break-inside: avoid;
            }
            
            .photos-title {
                font-size: 14px;
                margin-bottom: 15px;
                gap: 8px;
                color: #2d3748 !important;
            }
            
            .photo-grid {
                grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
                gap: 10px;
            }
            
            .photo-item {
                border-radius: 8px;
                break-inside: avoid;
                background: white !important;
            }
            
            .photo-item img {
                height: 80px;
                border: 1px solid #e2e8f0;
            }
            
            .photo-caption {
                padding: 6px 8px;
                font-size: 9px;
                background: #f1f5f9 !important;
                color: #475569 !important;
            }
            
            .signature-section {
                gap: 30px;
                margin: 20px 0;
                padding-top: 15px;
                border-top: 2px dashed #e2e8f0 !important;
                page-break-inside: avoid;
            }
            
            .signature-line {
                height: 40px;
                margin-bottom: 8px;
                border-bottom: 2px solid #4facfe !important;
            }
            
            .signature-label {
                font-size: 11px;
                color: #4a5568 !important;
            }
            
            .footer {
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
                background: #1a202c !important;
                color: white !important;
            }
            
            .footer-title {
                font-size: 14px;
                margin-bottom: 5px;
                color: white !important;
            }
            
            .footer-text {
                font-size: 10px;
                color: white !important;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="header-content">
                <div class="company-info">
                    <div class="company-logo">🚗</div>
                    <div class="invoice-title">Vehicle Handover Confirmation</div>
                    <div class="invoice-subtitle">Official handover documentation with photo verification</div>
                </div>
                <div class="invoice-meta">
                    <div class="meta-item">
                        <span class="meta-label">Invoice Number</span>
                        <div class="meta-value">${invoiceNumber}</div>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Handover Date</span>
                        <div class="meta-value">${handoverDate}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="invoice-content">
            <div class="content-grid">
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">👤</div>
                        Customer Information
                    </div>
                    <div class="info-row">
                        <span class="info-label">Name</span>
                        <span class="info-value">${data.booking.customer.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email</span>
                        <span class="info-value">${data.booking.customer.email}</span>
                    </div>
                    ${data.booking.customer.phone ? `
                    <div class="info-row">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${data.booking.customer.phone}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">🚙</div>
                        Vehicle Details
                    </div>
                    <div class="info-row">
                        <span class="info-label">Vehicle</span>
                        <span class="info-value">${data.booking.car.brand} ${data.booking.car.make} ${data.booking.car.spec || ''}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Plate Number</span>
                        <span class="info-value">${data.booking.car.plate_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Booking #</span>
                        <span class="info-value">${data.booking.booking_number}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">📅</div>
                        Rental Period
                    </div>
                    <div class="info-row">
                        <span class="info-label">Start Date</span>
                        <span class="info-value">${formatMalaysiaDate(data.booking.start_date)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">End Date</span>
                        <span class="info-value">${formatMalaysiaDate(data.booking.end_date)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Duration</span>
                        <span class="info-value">${data.booking.total_days} day${data.booking.total_days > 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">✍️</div>
                        Handover Details
                    </div>
                    <div class="info-row">
                        <span class="info-label">Handled By</span>
                        <span class="info-value">${data.handover.staff_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date & Time</span>
                        <span class="info-value">${handoverDate} ${handoverTime}</span>
                    </div>
                </div>
            </div>
            
            ${data.handover.deposit_amount && data.handover.deposit_amount > 0 ? `
            <div class="deposit-section">
                <div class="deposit-title">Security Deposit Collected</div>
                <div class="deposit-amount">RM ${data.handover.deposit_amount.toLocaleString()}</div>
                <div class="deposit-note">
                    This deposit will be refunded upon successful return of the vehicle in good condition.
                </div>
            </div>
            ` : ''}
            
            <div class="photos-section">
                <div class="photos-title">
                    <div class="section-icon">📸</div>
                    Handover Verification Photos
                </div>
                <div class="photo-grid">
                    ${data.handover.proof_photo_urls.map((url, index) => `
                        <div class="photo-item">
                            <img src="${url}" alt="Handover photo ${index + 1}" />
                            <div class="photo-caption">Handover Photo ${index + 1}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Customer Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Staff Signature</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-title">Budget Plus Rental</div>
            <div class="footer-text">
                Thank you for choosing Budget Plus Rental. Drive safely and enjoy your journey!<br>
                For support: +60 12-345 6789 | info@budgetplusrental.com
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Generate return invoice HTML
  private static generateReturnInvoiceHTML(data: ReturnInvoiceData, invoiceNumber: string): string {
    const returnDate = formatMalaysiaDate(data.return.return_time);
    const returnTime = formatMalaysiaTime(data.return.return_time);
    const handoverDate = formatMalaysiaDate(data.booking.handover_time);
    
    // Combine all photos for display - include handover photo first, then return photos
    const allPhotos = [];
    
    // Add handover photo first if available
    if (data.booking.handover_photo_url) {
      allPhotos.push({ url: data.booking.handover_photo_url, caption: 'Handover Reference Photo' });
    }
    
    // Add return verification photos
    allPhotos.push(...data.return.proof_photo_urls.map((url, index) => ({ url, caption: `Return Verification ${index + 1}` })));
    
    // Add car return photos (only if different from proof photos to avoid duplicates)
    if (data.return.car_return_proof_urls) {
      const uniqueCarPhotos = data.return.car_return_proof_urls.filter(url => 
        !data.return.proof_photo_urls.includes(url)
      );
      allPhotos.push(...uniqueCarPhotos.map((url, index) => ({ url, caption: `Vehicle Return ${index + 1}` })));
    }
    
    // Add deposit return photos
    if (data.return.deposit_return_proof_urls) {
      allPhotos.push(...data.return.deposit_return_proof_urls.map((url, index) => ({ url, caption: `Deposit Return ${index + 1}` })));
    }
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Return Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', Arial, sans-serif; 
            color: #333; 
            line-height: 1.6; 
            font-size: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .invoice-container { 
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            overflow: hidden;
            position: relative;
        }
        
        .invoice-header { 
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .invoice-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 1;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo { 
            width: 80px; 
            height: 80px; 
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 36px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        .invoice-title {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .invoice-subtitle {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .invoice-meta {
            text-align: right;
        }
        
        .meta-item {
            margin-bottom: 15px;
        }
        
        .meta-label {
            font-size: 14px;
            opacity: 0.8;
            display: block;
            margin-bottom: 5px;
        }
        
        .meta-value {
            font-size: 20px;
            font-weight: 700;
        }
        
        .invoice-content {
            padding: 40px;
        }
        
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .section {
            background: #f8fafc;
            padding: 25px;
            border-radius: 15px;
            border-left: 4px solid #11998e;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            align-items: center;
        }
        
        .info-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            text-align: right;
        }
        
        .deposit-section {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            text-align: center;
            position: relative;
        }
        
        .deposit-section::before {
            content: '💰';
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 48px;
            opacity: 0.3;
        }
        
        .late-fee-section {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            text-align: center;
            position: relative;
        }
        
        .late-fee-section::before {
            content: '⚠️';
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 48px;
            opacity: 0.3;
        }
        
        .amount-title {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 15px;
        }
        
        .deposit-title { color: #155724; }
        .late-fee-title { color: #721c24; }
        
        .amount-value {
            font-size: 36px;
            font-weight: 900;
            margin-bottom: 10px;
        }
        
        .deposit-amount { color: #155724; }
        .late-fee-amount { color: #721c24; }
        
        .amount-note {
            font-size: 14px;
        }
        
        .deposit-note { color: #0f5132; }
        .late-fee-note { color: #58151c; }
        
        .photos-section {
            margin: 40px 0;
        }
        
        .photos-title {
            font-size: 20px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .photo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .photo-item {
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            background: white;
            transition: transform 0.3s ease;
        }
        
        .photo-item:hover {
            transform: translateY(-5px);
        }
        
        .photo-item img {
            width: 100%;
            height: 300px;
            object-fit: cover;
            display: block;
        }
        
        .photo-caption {
            padding: 15px;
            background: #f1f5f9;
            font-size: 14px;
            text-align: center;
            color: #475569;
            font-weight: 600;
        }
        
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 50px 0;
            padding-top: 30px;
            border-top: 2px dashed #e2e8f0;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 2px solid #11998e;
            height: 60px;
            margin-bottom: 10px;
        }
        
        .signature-label {
            font-weight: 600;
            color: #4a5568;
            font-size: 16px;
        }
        
        .footer {
            background: #1a202c;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .footer-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .footer-text {
            opacity: 0.8;
            font-size: 14px;
            line-height: 1.4;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            body {
                padding: 10px;
                font-size: 13px;
            }
            
            .invoice-container {
                border-radius: 10px;
                margin: 0;
            }
            
            .invoice-header {
                padding: 20px;
            }
            
            .header-content {
                flex-direction: column;
                text-align: center;
                gap: 20px;
            }
            
            .company-logo {
                width: 60px;
                height: 60px;
                font-size: 28px;
                margin: 0 auto 15px;
            }
            
            .invoice-title {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .invoice-subtitle {
                font-size: 14px;
            }
            
            .invoice-meta {
                text-align: center;
            }
            
            .meta-value {
                font-size: 16px;
            }
            
            .invoice-content {
                padding: 20px;
            }
            
            .content-grid {
                grid-template-columns: 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .section {
                padding: 20px;
                border-radius: 10px;
            }
            
            .section-title {
                font-size: 16px;
                margin-bottom: 15px;
            }
            
            .section-icon {
                width: 20px;
                height: 20px;
                font-size: 11px;
            }
            
            .info-row {
                flex-direction: column;
                align-items: flex-start;
                margin-bottom: 15px;
                gap: 5px;
            }
            
            .info-label {
                font-size: 12px;
                font-weight: 600;
            }
            
            .info-value {
                font-size: 14px;
                text-align: left;
            }
            
            .deposit-section, .late-fee-section {
                padding: 20px;
                margin: 20px 0;
                border-radius: 10px;
            }
            
            .amount-title {
                font-size: 18px;
                margin-bottom: 10px;
            }
            
            .amount-value {
                font-size: 28px;
                margin-bottom: 8px;
            }
            
            .amount-note {
                font-size: 12px;
            }
            
            .photos-section {
                margin: 30px 0;
            }
            
            .photos-title {
                font-size: 16px;
                margin-bottom: 20px;
            }
            
            .photo-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .photo-item {
                border-radius: 10px;
                max-width: 100%;
            }
            
            .photo-item img {
                width: 100%;
                height: auto;
                min-height: 200px;
                max-height: 400px;
                object-fit: contain;
                background: #f8f9fa;
            }
            
            .photo-caption {
                padding: 12px;
                font-size: 12px;
            }
            
            .signature-section {
                grid-template-columns: 1fr;
                gap: 30px;
                margin: 30px 0;
                padding-top: 20px;
            }
            
            .signature-line {
                height: 50px;
                margin-bottom: 8px;
            }
            
            .signature-label {
                font-size: 14px;
            }
            
            .footer {
                padding: 20px;
            }
            
            .footer-title {
                font-size: 16px;
                margin-bottom: 8px;
            }
            
            .footer-text {
                font-size: 12px;
            }
        }
        
        /* Small mobile devices */
        @media (max-width: 480px) {
            body {
                padding: 5px;
                font-size: 12px;
            }
            
            .invoice-header {
                padding: 15px;
            }
            
            .company-logo {
                width: 50px;
                height: 50px;
                font-size: 24px;
            }
            
            .invoice-title {
                font-size: 20px;
            }
            
            .invoice-subtitle {
                font-size: 12px;
            }
            
            .meta-value {
                font-size: 14px;
            }
            
            .invoice-content {
                padding: 15px;
            }
            
            .section {
                padding: 15px;
            }
            
            .section-title {
                font-size: 14px;
            }
            
            .info-row {
                margin-bottom: 12px;
            }
            
            .info-label {
                font-size: 11px;
            }
            
            .info-value {
                font-size: 13px;
            }
            
            .deposit-section, .late-fee-section {
                padding: 15px;
            }
            
            .amount-title {
                font-size: 16px;
            }
            
            .amount-value {
                font-size: 24px;
            }
            
            .amount-note {
                font-size: 11px;
            }
            
            .photos-title {
                font-size: 14px;
            }
            
            .photo-item img {
                min-height: 180px;
                max-height: 350px;
            }
            
            .photo-caption {
                padding: 10px;
                font-size: 11px;
            }
            
            .footer {
                padding: 15px;
            }
            
            .footer-title {
                font-size: 14px;
            }
            
            .footer-text {
                font-size: 11px;
            }
        }
        
        /* Print styles - A4 layout only for printing/downloading */
        @media print {
            @page {
                size: A4;
                margin: 15mm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            body { 
                background: white; 
                padding: 0;
                font-size: 11px;
                line-height: 1.4;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color: black !important;
            }
            
            .invoice-container { 
                max-width: none;
                box-shadow: none; 
                border-radius: 0;
                margin: 0;
                background: white !important;
            }
            
            .invoice-header {
                padding: 20px;
                margin-bottom: 15px;
                border-radius: 8px;
                background: #11998e !important;
                color: white !important;
            }
            
            .company-logo {
                width: 50px;
                height: 50px;
                font-size: 24px;
                margin-bottom: 10px;
                background: rgba(255,255,255,0.2) !important;
                color: white !important;
            }
            
            .invoice-title {
                font-size: 20px;
                margin-bottom: 5px;
                color: white !important;
            }
            
            .invoice-subtitle {
                font-size: 12px;
                color: white !important;
            }
            
            .meta-value {
                font-size: 14px;
                color: white !important;
            }
            
            .invoice-content {
                padding: 20px 0;
                background: white !important;
            }
            
            .content-grid {
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .section {
                padding: 15px;
                border-radius: 8px;
                background: #f8fafc !important;
                border-left: 4px solid #11998e !important;
            }
            
            .section-title {
                font-size: 14px;
                margin-bottom: 10px;
                gap: 8px;
                color: #2d3748 !important;
            }
            
            .section-icon {
                width: 18px;
                height: 18px;
                font-size: 10px;
                background: #11998e !important;
                color: white !important;
            }
            
            .info-row {
                margin-bottom: 6px;
            }
            
            .info-label {
                font-size: 10px;
                color: #64748b !important;
            }
            
            .info-value {
                font-size: 11px;
                color: #1e293b !important;
            }
            
            .deposit-section, .late-fee-section {
                padding: 20px;
                margin: 15px 0;
                border-radius: 8px;
                page-break-inside: avoid;
            }
            
            .deposit-section {
                background: #d4edda !important;
            }
            
            .late-fee-section {
                background: #f8d7da !important;
            }
            
            .amount-title {
                font-size: 16px;
                margin-bottom: 8px;
            }
            
            .deposit-title {
                color: #155724 !important;
            }
            
            .late-fee-title {
                color: #721c24 !important;
            }
            
            .amount-value {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .deposit-amount {
                color: #155724 !important;
            }
            
            .late-fee-amount {
                color: #721c24 !important;
            }
            
            .amount-note {
                font-size: 10px;
            }
            
            .deposit-note {
                color: #0f5132 !important;
            }
            
            .late-fee-note {
                color: #58151c !important;
            }
            
            .photos-section {
                margin: 15px 0;
                page-break-inside: avoid;
            }
            
            .photos-title {
                font-size: 14px;
                margin-bottom: 15px;
                gap: 8px;
                color: #2d3748 !important;
            }
            
            .photo-grid {
                grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
                gap: 10px;
            }
            
            .photo-item {
                border-radius: 8px;
                break-inside: avoid;
                background: white !important;
            }
            
            .photo-item img {
                height: 80px;
                border: 1px solid #e2e8f0;
            }
            
            .photo-caption {
                padding: 6px 8px;
                font-size: 9px;
                background: #f1f5f9 !important;
                color: #475569 !important;
            }
            
            .signature-section {
                gap: 30px;
                margin: 20px 0;
                padding-top: 15px;
                border-top: 2px dashed #e2e8f0 !important;
                page-break-inside: avoid;
            }
            
            .signature-line {
                height: 40px;
                margin-bottom: 8px;
                border-bottom: 2px solid #11998e !important;
            }
            
            .signature-label {
                font-size: 11px;
                color: #4a5568 !important;
            }
            
            .footer {
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
                background: #1a202c !important;
                color: white !important;
            }
            
            .footer-title {
                font-size: 14px;
                margin-bottom: 5px;
                color: white !important;
            }
            
            .footer-text {
                font-size: 10px;
                color: white !important;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="header-content">
                <div class="company-info">
                    <div class="company-logo">🚗</div>
                    <div class="invoice-title">Vehicle Return Confirmation</div>
                    <div class="invoice-subtitle">Official return documentation with photo verification</div>
                </div>
                <div class="invoice-meta">
                    <div class="meta-item">
                        <span class="meta-label">Invoice Number</span>
                        <div class="meta-value">${invoiceNumber}</div>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Return Date</span>
                        <div class="meta-value">${returnDate}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="invoice-content">
            <div class="content-grid">
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">👤</div>
                        Customer Information
                    </div>
                    <div class="info-row">
                        <span class="info-label">Name</span>
                        <span class="info-value">${data.booking.customer.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email</span>
                        <span class="info-value">${data.booking.customer.email}</span>
                    </div>
                    ${data.booking.customer.phone ? `
                    <div class="info-row">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${data.booking.customer.phone}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">🚙</div>
                        Vehicle Details
                    </div>
                    <div class="info-row">
                        <span class="info-label">Vehicle</span>
                        <span class="info-value">${data.booking.car.brand} ${data.booking.car.make} ${data.booking.car.spec || ''}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Plate Number</span>
                        <span class="info-value">${data.booking.car.plate_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Booking #</span>
                        <span class="info-value">${data.booking.booking_number}</span>
                    </div>
                    ${data.return.current_mileage ? `
                    <div class="info-row">
                        <span class="info-label">Final Mileage</span>
                        <span class="info-value">${data.return.current_mileage.toLocaleString()} km</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">📅</div>
                        Rental Summary
                    </div>
                    <div class="info-row">
                        <span class="info-label">Handover</span>
                        <span class="info-value">${handoverDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Return</span>
                        <span class="info-value">${returnDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Duration</span>
                        <span class="info-value">${data.booking.total_days} day${data.booking.total_days > 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <div class="section-icon">✍️</div>
                        Return Details
                    </div>
                    <div class="info-row">
                        <span class="info-label">Processed By</span>
                        <span class="info-value">${data.return.staff_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date & Time</span>
                        <span class="info-value">${returnDate} ${returnTime}</span>
                    </div>
                </div>
            </div>
            
            ${data.return.deposit_returned && data.return.deposit_returned > 0 ? `
            <div class="deposit-section">
                <div class="amount-title deposit-title">Security Deposit Returned</div>
                <div class="amount-value deposit-amount">RM ${data.return.deposit_returned.toLocaleString()}</div>
                <div class="amount-note deposit-note">
                    The security deposit has been successfully returned upon satisfactory vehicle inspection.
                </div>
            </div>
            ` : ''}
            
            ${data.return.late_fee && data.return.late_fee > 0 ? `
            <div class="late-fee-section">
                <div class="amount-title late-fee-title">Late Return Fee Applied</div>
                <div class="amount-value late-fee-amount">RM ${data.return.late_fee.toLocaleString()}</div>
                <div class="amount-note late-fee-note">
                    Late return fee applied due to returning the vehicle after the scheduled return time.
                </div>
            </div>
            ` : ''}
            
            ${allPhotos.length > 0 ? `
            <div class="photos-section">
                <div class="photos-title">
                    <div class="section-icon">📸</div>
                    Return Verification Photos
                </div>
                <div class="photo-grid">
                    ${allPhotos.map((photo) => `
                        <div class="photo-item">
                            <img src="${photo.url}" alt="${photo.caption}" />
                            <div class="photo-caption">${photo.caption}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Customer Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Staff Signature</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-title">Budget Plus Rental</div>
            <div class="footer-text">
                Thank you for choosing Budget Plus Rental. We hope you had a great experience!<br>
                For support: +60 12-345 6789 | info@budgetplusrental.com
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }
}