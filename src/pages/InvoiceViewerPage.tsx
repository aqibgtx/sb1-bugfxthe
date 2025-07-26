import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Download, Share2, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const InvoiceViewerPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:booking_id(
            booking_number,
            customer:customer_id(name, email, phone)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (fetchError) {
        throw new Error('Invoice not found');
      }

      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoice_number}`,
          text: `Budget Plus Rental - Invoice ${invoice.invoice_number}`,
          url: url
        });
      } catch (error) {
        // User cancelled sharing or sharing failed
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Invoice link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested invoice could not be found.'}</p>
          <Button onClick={() => navigate('/')} className="min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with actions - hidden when printing */}
      <div className="bg-white border-b border-gray-200 p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="flex items-center space-x-2 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
              <p className="text-gray-600 text-sm">
                Booking: {invoice.booking?.booking_number} | Customer: {invoice.booking?.customer?.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleShare}
              variant="secondary"
              className="flex items-center space-x-2 min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              className="flex items-center space-x-2 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Print/Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0">
        <div className="bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none">
          {invoice.html_content ? (
            <div 
              dangerouslySetInnerHTML={{ __html: invoice.html_content }}
              className="invoice-content"
            />
          ) : (
            <div className="p-8 text-center">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Invoice Content</h2>
              <p className="text-gray-600">This invoice does not have any content to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceViewerPage;