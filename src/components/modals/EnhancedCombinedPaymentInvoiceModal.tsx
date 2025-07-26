import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  CreditCard,
  FileText,
  User,
  Car,
  Calendar,
  DollarSign,
  Share2,
  Check,
  QrCode,
  Eye,
  Download
} from 'lucide-react';
import Button from '../ui/Button';
import { stripePaymentService } from '../../services/stripePaymentService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface EnhancedCombinedPaymentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
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
    };
    total_days: number;
    total_amount: number;
    extension_days?: number;
  };
  paymentMethod: string;
  extensionId?: string;
  invoiceData?: {
    invoiceId: string;
    invoiceNumber: string;
    previewUrl: string;
    totalAmount: number;
    isLateFeeInvoice?: boolean;
  };
}

const EnhancedCombinedPaymentInvoiceModal: React.FC<EnhancedCombinedPaymentInvoiceModalProps> = ({
  isOpen,
  onClose,
  bookingData,
  paymentMethod,
  extensionId,
  invoiceData
}) => {
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [qrPaymentUrl, setQrPaymentUrl] = useState<string>('');
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [copiedStates, setCopiedStates] = useState({
    complete: false,
    payment: false,
    invoice: false,
    qrLink: false
  });

  useEffect(() => {
    if (isOpen && bookingData && paymentMethod) {
      console.log('🔍 EnhancedCombinedPaymentInvoiceModal - Received Data:', {
        bookingData: {
          id: bookingData.id,
          booking_number: bookingData.booking_number,
          total_amount: bookingData.total_amount,
          total_days: bookingData.total_days
        },
        paymentMethod,
        extensionId,
        invoiceData: invoiceData ? {
          invoiceId: invoiceData.invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          totalAmount: invoiceData.totalAmount,
          previewUrl: invoiceData.previewUrl
        } : null
      });

      console.log('EnhancedCombinedPaymentInvoiceModal received data:', {
        bookingData,
        paymentMethod,
        extensionId,
        invoiceData
      });
      
      if (paymentMethod === 'qr_code') {
        generateQRPaymentLink();
      } else if (paymentMethod !== 'cash') {
        // Generate payment session for both regular bookings and extensions
        generatePaymentSession();
      }
    }
  }, [isOpen, bookingData, paymentMethod, extensionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPaymentUrl('');
      setQrPaymentUrl('');
      setGeneratingPayment(false);
      setCopiedStates({
        complete: false,
        payment: false,
        invoice: false,
        qrLink: false
      });
    };
  }, []);

  const generateQRPaymentLink = () => {
    const baseUrl = window.location.origin;
    
    // Generate QR link with proper context for extensions and late fees
    let qrLink = `${baseUrl}/staff/qr-pay/${bookingData.id}`;
    
    // Add context parameters for extensions and late fees
    const params = new URLSearchParams();
    
    if (extensionId) {
      params.set('type', 'extension');
      params.set('extension_id', extensionId);
      params.set('amount', bookingData.total_amount.toString());
    } else if (bookingData.booking_number.includes('Late Fee')) {
      params.set('type', 'late_fee');
      params.set('amount', bookingData.total_amount.toString());
    }
    
    if (params.toString()) {
      qrLink += `?${params.toString()}`;
    }
    
    setQrPaymentUrl(qrLink);
  };


  const generatePaymentSession = async () => {
    if (!bookingData || paymentMethod === 'cash') return;

    setGeneratingPayment(true);
    try {
      console.log('Generating payment session for:', {
        bookingId: bookingData.id,
        paymentMethod,
        amount: bookingData.total_amount,
        extensionId: extensionId
      });

      // Use the same service for both regular bookings and extensions
      const sessionData = await stripePaymentService.createPaymentSession({
        bookingId: bookingData.id,
        amount: bookingData.total_amount,
        currency: 'MYR',
        customerEmail: bookingData.customer.email,
        customerName: bookingData.customer.name,
        description: extensionId 
          ? `Extension payment for ${bookingData.booking_number}`
          : stripePaymentService.generatePaymentDescription(
              bookingData.booking_number,
              `${bookingData.car.brand} ${bookingData.car.make}`,
              bookingData.total_days
            ),
        paymentMethod: paymentMethod,
        successUrl: extensionId 
          ? `${window.location.origin}/payment-success?booking_id=${bookingData.id}&extension_id=${extensionId}`
          : stripePaymentService.generateSuccessUrl(bookingData.id),
        cancelUrl: extensionId 
          ? `${window.location.origin}/payment-cancelled?booking_id=${bookingData.id}&extension_id=${extensionId}`
          : stripePaymentService.generateCancelUrl(bookingData.id),
        extensionId: extensionId
      });

      if (sessionData?.paymentUrl) {
        setPaymentUrl(sessionData.paymentUrl);
        
        // If this is an extension payment, update extension record
        if (extensionId) {
          await supabase
            .from('booking_extensions')
            .update({ 
              stripe_payment_url: sessionData.paymentUrl
            })
            .eq('id', extensionId);
        }
        
        console.log('Payment session created successfully:', sessionData.paymentUrl);
      } else {
        throw new Error('No payment URL returned from session creation');
      }
    } catch (error) {
      console.error('Error generating payment session:', error);
      
      if (error instanceof Error) {
        toast.error(`Failed to generate payment link: ${error.message}`);
      } else {
        toast.error('Failed to generate payment link');
      }
    } finally {
      setGeneratingPayment(false);
    }
  };

  const getPaymentMethodCode = (method: string): string => {
    switch (method) {
      case 'online_banking': return 'FPX';
      case 'credit_debit_card': return 'CARD';
      case 'qr_code': return 'QR';
      case 'cash': return 'CASH';
      default: return 'OTHER';
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'online_banking': return 'FPX Online Banking';
      case 'credit_debit_card': return 'Credit/Debit Card';
      case 'qr_code': return 'QR Code Payment';
      case 'cash': return 'Cash Payment';
      default: return 'Payment';
    }
  };

  const copyToClipboard = async (text: string, type: 'complete' | 'payment' | 'invoice' | 'qrLink') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      toast.success('Copied to clipboard!');

      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateCompleteMessage = () => {
    // Determine the correct invoice URL based on invoice type
    let invoiceUrl = '';
    if (invoiceData?.invoiceId) {
      // Check if this is a late fee invoice by checking if it's from handover_invoices table
      // or if the invoice data indicates it's a late fee invoice
      const isLateFeeInvoice = invoiceData.previewUrl?.includes('/handover-invoice/') || 
                               invoiceData.isLateFeeInvoice ||
                               (invoiceData.totalAmount && bookingData.total_amount && 
                                Math.abs(invoiceData.totalAmount - bookingData.total_amount) > 0.01);
      
      if (isLateFeeInvoice && invoiceData.previewUrl) {
        invoiceUrl = invoiceData.previewUrl;
      } else {
        invoiceUrl = `${window.location.origin}/invoice/${invoiceData.invoiceId}`;
      }
    }
    
    const paymentLink = paymentMethod === 'qr_code' ? qrPaymentUrl : paymentUrl;

    return `🚗 *Budget Plus Rental - ${extensionId ? 'Booking Extension' : 'Booking Confirmation'}*
📋 Booking: ${bookingData.booking_number}
👤 Customer: ${bookingData.customer.name}
🚙 Vehicle: ${bookingData.car.brand} ${bookingData.car.make}
📅 ${extensionId ? 'Extension' : 'Duration'}: ${bookingData.total_days} day${bookingData.total_days > 1 ? 's' : ''}
💰 Total Amount: RM ${bookingData.total_amount.toLocaleString()}

${paymentMethod !== 'cash' ? `💳 ${extensionId ? 'Extension ' : ''}Payment Link (${getPaymentMethodName(paymentMethod)}):
${paymentLink}` : '💰 Payment Method: Cash Payment'}

📄 Invoice:
${invoiceUrl}

${paymentMethod !== 'cash' ? `Please complete your ${extensionId ? 'extension ' : ''}payment to confirm your booking.` : 'Please prepare cash payment as discussed.'} Thank you for choosing Budget Plus Rental! 🙏`;
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(generateCompleteMessage());
    const phone = bookingData.customer.phone?.replace(/[^\d]/g, '');

    if (phone) {
      const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    } else {
      const whatsappUrl = `https://wa.me/?text=${message}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white rounded-lg shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-green-500 p-4 sm:p-6 text-white flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex items-center space-x-3"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px]">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{extensionId ? 'Extension Created Successfully!' : 'Booking Created Successfully!'}</h2>
                  <p className="text-green-100">Ready to share with customer</p>
                </div>
              </motion.div>
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-green-100">{extensionId ? 'Extension for Booking' : 'Booking Number'}</p>
                <p className="font-bold text-lg">{bookingData.booking_number}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-green-100">Total Amount</p>
                <p className="font-bold text-lg">RM {bookingData.total_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Copy All Button - Only show after payment session is ready */}
          {((paymentMethod === 'cash') || 
            (paymentMethod === 'qr_code' && qrPaymentUrl) || 
            (paymentMethod !== 'cash' && paymentMethod !== 'qr_code' && paymentUrl && !generatingPayment)) && (
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex-shrink-0">
              <Button
                onClick={() => copyToClipboard(generateCompleteMessage(), 'complete')}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
              >
                {copiedStates.complete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedStates.complete ? 'Copied Complete Message!' : 'Copy Complete Message'}</span>
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
            {/* Customer & Booking Details */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Booking Details</span>
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{bookingData.customer.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Car className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{bookingData.car.brand} {bookingData.car.make}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{bookingData.total_days} day{bookingData.total_days > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">RM {bookingData.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Link Section */}
            {paymentMethod === 'cash' ? (
              <div className="bg-green-50 rounded-lg p-4 sm:p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>{extensionId ? 'Extension Cash Payment' : 'Cash Payment'}</span>
                </h3>
                
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <h4 className="text-green-900 font-semibold mb-2">Cash Payment Instructions</h4>
                  <div className="text-green-800 text-sm space-y-1">
                    <p>• Customer will pay in cash as discussed</p>
                    <p>• No online payment link required</p>
                    <p>• Ensure receipt is provided upon payment</p>
                    <p>• Update payment status manually after receiving cash</p>
                  </div>
                </div>
              </div>
            ) : paymentMethod === 'qr_code' ? (
              <div className="bg-purple-50 rounded-lg p-4 sm:p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <QrCode className="w-5 h-5" />
                  <span>{extensionId ? 'Extension QR Payment' : 'QR Payment Page'}</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <p className="text-xs text-gray-500 mb-2">QR Payment Page URL:</p>
                    <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 p-2 rounded">
                      {qrPaymentUrl}
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => copyToClipboard(qrPaymentUrl, 'qrLink')}
                      variant="secondary"
                      className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {copiedStates.qrLink ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedStates.qrLink ? 'Copied!' : 'Copy QR Link'}</span>
                    </Button>
                    
                    <Button
                      onClick={() => window.open(qrPaymentUrl, '_blank')}
                      variant="secondary"
                      className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open QR Page</span>
                    </Button>
                  </div>

                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                    <h4 className="text-purple-900 font-semibold mb-2">QR Payment Instructions</h4>
                    <div className="text-purple-800 text-sm space-y-1">
                      <p>• Share this link with your customer</p>
                      <p>• Customer can scan QR code and upload payment proof</p>
                      <p>• Payment will be tracked automatically</p>
                      <p>• Admin approval required for payment confirmation</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>{extensionId ? 'Extension ' : ''}Payment Link ({getPaymentMethodName(paymentMethod)})</span>
                </h3>
                
                {generatingPayment ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Generating payment session...</span>
                  </div>
                ) : paymentUrl ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-xs text-gray-500 mb-2">Stripe Checkout Session URL:</p>
                      <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 p-2 rounded">
                        {paymentUrl}
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => copyToClipboard(paymentUrl, 'payment')}
                        variant="secondary"
                        className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
                      >
                        {copiedStates.payment ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span>{copiedStates.payment ? 'Copied!' : 'Copy Payment Link'}</span>
                      </Button>
                      
                      <Button
                        onClick={() => window.open(paymentUrl, '_blank')}
                        variant="secondary"
                        className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Payment Page</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-red-600">Failed to generate payment link</p>
                    <Button
                      onClick={generatePaymentSession}
                      variant="secondary"
                      className="mt-2 min-h-[44px]"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Invoice Section */}
            {invoiceData && (
              <div className="bg-purple-50 rounded-lg p-4 sm:p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>{extensionId ? 'Extension ' : ''}Invoice ({invoiceData.invoiceNumber})</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        // Determine the correct invoice URL for copying
                        let invoiceUrl = '';
                        if (invoiceData.previewUrl?.includes('/handover-invoice/') || 
                            invoiceData.isLateFeeInvoice ||
                            (invoiceData.totalAmount && bookingData.total_amount && 
                             Math.abs(invoiceData.totalAmount - bookingData.total_amount) > 0.01)) {
                          invoiceUrl = invoiceData.previewUrl || `${window.location.origin}/handover-invoice/${invoiceData.invoiceId}`;
                        } else {
                          invoiceUrl = `${window.location.origin}/invoice/${invoiceData.invoiceId}`;
                        }
                        copyToClipboard(invoiceUrl, 'invoice');
                      }}
                      variant="secondary"
                      className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {copiedStates.invoice ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedStates.invoice ? 'Copied!' : 'Copy Invoice Link'}</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        // Determine the correct invoice URL for viewing
                        let invoiceUrl = '';
                        if (invoiceData.previewUrl?.includes('/handover-invoice/') || 
                            invoiceData.isLateFeeInvoice ||
                            (invoiceData.totalAmount && bookingData.total_amount && 
                             Math.abs(invoiceData.totalAmount - bookingData.total_amount) > 0.01)) {
                          invoiceUrl = invoiceData.previewUrl || `${window.location.origin}/handover-invoice/${invoiceData.invoiceId}`;
                        } else {
                          invoiceUrl = `${window.location.origin}/invoice/${invoiceData.invoiceId}`;
                        }
                        window.open(invoiceUrl, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white min-h-[44px]"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Full Invoice</span>
                    </Button>
                  </div>
                  
                  {/* Additional invoice actions */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-3">
                    <Button
                      onClick={() => {
                        // Determine the correct invoice URL for printing
                        let invoiceUrl = '';
                        if (invoiceData.previewUrl?.includes('/handover-invoice/') || 
                            invoiceData.isLateFeeInvoice ||
                            (invoiceData.totalAmount && bookingData.total_amount && 
                             Math.abs(invoiceData.totalAmount - bookingData.total_amount) > 0.01)) {
                          invoiceUrl = invoiceData.previewUrl || `${window.location.origin}/handover-invoice/${invoiceData.invoiceId}`;
                        } else {
                          invoiceUrl = `${window.location.origin}/invoice/${invoiceData.invoiceId}`;
                        }
                        
                        const printWindow = window.open(invoiceUrl, '_blank');
                        if (printWindow) {
                          printWindow.addEventListener('load', () => {
                            setTimeout(() => {
                              printWindow.print();
                            }, 500);
                          });
                        }
                      }}
                      variant="secondary"
                      className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Print/Download</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Share Section */}
            <div className="bg-green-50 rounded-lg p-4 sm:p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>Share with Customer</span>
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 mb-2">Complete Message Preview:</p>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {generateCompleteMessage()}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={openWhatsApp}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Open WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Footer */}
          {((paymentMethod === 'cash') || 
            (paymentMethod === 'qr_code' && qrPaymentUrl) || 
            (paymentMethod !== 'cash' && paymentMethod !== 'qr_code' && paymentUrl && !generatingPayment)) && (
            <div className="modal-footer">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 w-full">
                <p className="text-sm text-gray-600 text-center sm:text-left">
                  Share these links with your customer to complete the {extensionId ? 'extension' : 'booking'} process.
                </p>
                <Button
                  onClick={onClose}
                  variant="secondary"
                  className="modal-action-button"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EnhancedCombinedPaymentInvoiceModal;