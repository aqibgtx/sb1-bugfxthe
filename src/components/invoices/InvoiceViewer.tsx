import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Mail, Printer, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InvoiceGenerator } from './InvoiceGenerator';
import { EnhancedInvoiceGenerator } from './EnhancedInvoiceGenerator';
import { ExtensionInvoiceGenerator } from './ExtensionInvoiceGenerator';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InvoiceTemplate from './InvoiceTemplate';
import toast from 'react-hot-toast';

const InvoiceViewer: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLateFeeInvoice, setIsLateFeeInvoice] = useState(false);
  const [isExtensionInvoice, setIsExtensionInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the invoice record to check invoice type
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:booking_id(
            late_fee, 
            rental_amount, 
            total_days,
            booking_status,
            end_date
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (invoiceError) {
        throw new Error(invoiceError.message || 'Failed to fetch invoice');
      }

      if (!invoiceRecord) {
        throw new Error('Invoice not found');
      }

      if (!invoiceRecord.booking) {
        throw new Error('Associated booking not found for this invoice');
      }

      setInvoice(invoiceRecord);

      // Check if this is an extension invoice by looking for extension records
      const { data: extensionRecord, error: extensionError } = await supabase
        .from('booking_extensions')
        .select('id, extension_amount, extension_days, daily_rate')
        .eq('booking_id', invoiceRecord.booking_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine invoice type
      const isExtension = extensionRecord && 
        Math.abs(parseFloat(invoiceRecord.amount) - parseFloat(extensionRecord.extension_amount)) < 0.01;
      
      const isLateFee = invoiceRecord.booking?.late_fee && 
        Math.abs(parseFloat(invoiceRecord.amount) - parseFloat(invoiceRecord.booking.late_fee)) < 0.01;

      setIsExtensionInvoice(isExtension);
      setIsLateFeeInvoice(isLateFee);

      console.log('🔍 InvoiceViewer - Invoice type detection:', {
        invoiceId,
        invoiceAmount: invoiceRecord.amount,
        extensionAmount: extensionRecord?.extension_amount,
        lateFeeAmount: invoiceRecord.booking?.late_fee,
        isExtension,
        isLateFee,
        bookingStatus: invoiceRecord.booking?.booking_status
      });

      if (isExtension) {
        // Use ExtensionInvoiceGenerator for extension invoices
        console.log('📄 Loading extension invoice data...');
        const extensionData = await ExtensionInvoiceGenerator.getExtensionInvoiceData(invoiceId);
        setInvoiceData(extensionData);
      } else if (isLateFee) {
        // Use EnhancedInvoiceGenerator for late fee invoices
        console.log('📄 Loading late fee invoice data...');
        const lateFeeData = await EnhancedInvoiceGenerator.getLateFeeInvoiceData(invoiceId);
        setInvoiceData(lateFeeData);
      } else {
        // Use regular InvoiceGenerator for normal invoices
        console.log('📄 Loading regular invoice data...');
        const regularData = await InvoiceGenerator.getInvoiceData(invoiceId);
        setInvoiceData(regularData);
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      setError(error.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window with the invoice content for printing/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow && invoice) {
      printWindow.document.write(invoice.html_content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${isExtensionInvoice ? 'Extension ' : isLateFeeInvoice ? 'Late Fee ' : ''}Invoice ${invoice?.invoice_number}`,
          text: `${isExtensionInvoice ? 'Extension ' : isLateFeeInvoice ? 'Late Fee ' : ''}Invoice from Budget Plus Rental`,
          url: url
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Invoice link copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleSendEmail = async () => {
    try {
      // Update invoice email status
      const { error } = await supabase
        .from('invoices')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          status: 'sent'
        })
        .eq('id', invoiceId);

      if (error) throw error;

      const invoiceType = isExtensionInvoice ? 'Extension ' : isLateFeeInvoice ? 'Late fee ' : '';
      toast.success(`${invoiceType}Invoice email sent successfully`);
      loadInvoice(); // Refresh data
    } catch (error) {
      console.error('Error sending email:', error);
      const invoiceType = isExtensionInvoice ? 'extension ' : isLateFeeInvoice ? 'late fee ' : '';
      toast.error(`Failed to send ${invoiceType}invoice email`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E88E5]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md mx-auto text-center bg-white shadow-lg">
          <div className="p-8">
            <h2 className="text-xl font-bold text-[#333333] mb-4 font-['Inter']">Invoice Not Found</h2>
            <p className="text-[#333333] mb-6 font-['Inter']">{error}</p>
            <Button onClick={() => navigate(-1)} className="w-full bg-[#1E88E5] hover:bg-[#1976D2]">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Action Bar */}
      <div className="no-print sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 self-start text-[#1E88E5] hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={handlePrint}
              className="flex items-center space-x-2 text-[#1E88E5] hover:bg-blue-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>

            <Button
              variant="ghost"
              onClick={handleDownload}
              className="flex items-center space-x-2 text-[#1E88E5] hover:bg-blue-50"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>

            <Button
              variant="ghost"
              onClick={handleShare}
              className="flex items-center space-x-2 text-[#1E88E5] hover:bg-blue-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>

            {!invoice?.email_sent && (
              <Button
                onClick={handleSendEmail}
                className="flex items-center space-x-2 bg-[#1E88E5] hover:bg-[#1976D2] text-white"
              >
                <Mail className="w-4 h-4" />
                <span>Send Email</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="p-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="overflow-hidden bg-white shadow-lg print:shadow-none print:border-none">
            {invoiceData && (
              <>
                {isExtensionInvoice ? (
                  // Render extension invoice HTML directly
                  <div 
                    dangerouslySetInnerHTML={{ __html: invoiceData.htmlContent }}
                    className="print:shadow-none print:border-none"
                  />
                ) : isLateFeeInvoice ? (
                  // Render late fee invoice HTML directly
                  <div 
                    dangerouslySetInnerHTML={{ __html: invoiceData.htmlContent }}
                    className="print:shadow-none print:border-none"
                  />
                ) : (
                  // Render regular invoice using template
                  <InvoiceTemplate 
                    data={invoiceData}
                    className="print:shadow-none print:border-none"
                  />
                )}
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default InvoiceViewer;