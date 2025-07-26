import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Share2, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import { HandoverReturnInvoiceGenerator } from '../components/invoices/HandoverReturnInvoiceGenerator';
import toast from 'react-hot-toast';

const HandoverInvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData();
    }
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const data = await HandoverReturnInvoiceGenerator.getInvoiceData(invoiceId!);
      setInvoiceData(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      setError('Failed to load invoice');
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && invoiceData) {
      printWindow.document.write(invoiceData.htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    const currentUrl = `${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success('Invoice link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-6">The requested invoice could not be found or has been removed.</p>
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:h-16 gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 min-h-[44px] flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {invoiceData.invoiceType === 'handover' ? 'Handover' : 'Return'} Invoice
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">#{invoiceData.invoiceNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={handleShare}
                className="flex items-center space-x-1 sm:space-x-2 min-h-[44px] px-3 sm:px-4"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm sm:text-base">Share</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownload}
                className="flex items-center space-x-1 sm:space-x-2 min-h-[44px] px-3 sm:px-4"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm sm:text-base">Download</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div 
            dangerouslySetInnerHTML={{ __html: invoiceData.htmlContent }}
            className="invoice-content"
          />
        </motion.div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleDownload}
            className="flex items-center justify-center space-x-2 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </Button>
          <Button
            variant="secondary"
            onClick={handleShare}
            className="flex items-center justify-center space-x-2 min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Invoice</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HandoverInvoicePage;