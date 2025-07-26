import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Copy, 
  MessageCircle, 
  CheckCircle, 
  ExternalLink,
  CreditCard,
  FileText,
  Clock
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { stripePaymentService } from '../../services/stripePaymentService';
import toast from 'react-hot-toast';

interface InvoiceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'handover' | 'return';
  invoiceData: {
    invoiceUrl: string;
    invoiceNumber: string;
  };
  lateFeeData?: {
    amount: number;
    bookingId: string;
    customerEmail: string;
    customerName: string;
    bookingNumber: string;
    carDetails: string;
    paymentMethod?: string; // Add payment method to late fee data
  };
  customerName: string;
  bookingNumber: string;
  carDetails: string;
}

const InvoiceShareModal: React.FC<InvoiceShareModalProps> = ({
  isOpen,
  onClose,
  type,
  invoiceData,
  lateFeeData,
  customerName,
  bookingNumber,
  carDetails
}) => {
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string>('');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  // Generate Stripe payment session for late fee
  const generateLateFeePaymentLink = async () => {
    if (!lateFeeData || paymentLink) return;

    setGeneratingPaymentLink(true);
    try {
      // Use the selected payment method or default to card
      const paymentMethod = lateFeeData.paymentMethod || 'credit_debit_card';
      
      const paymentSession = await stripePaymentService.createPaymentSession({
        bookingId: lateFeeData.bookingId,
        amount: lateFeeData.amount,
        currency: 'MYR',
        customerEmail: lateFeeData.customerEmail,
        customerName: lateFeeData.customerName,
        description: `Late Fee Payment - Booking #${lateFeeData.bookingNumber} - ${lateFeeData.carDetails}`,
        paymentMethod: paymentMethod, // Use selected payment method
        successUrl: `${window.location.origin}/payment-success?booking_id=${lateFeeData.bookingId}&type=late_fee`,
        cancelUrl: `${window.location.origin}/payment-cancelled?booking_id=${lateFeeData.bookingId}&type=late_fee`
      });

      setPaymentLink(paymentSession.paymentUrl);
      toast.success('Payment link generated successfully!');
    } catch (error) {
      console.error('Error generating payment link:', error);
      toast.error('Failed to generate payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  // Generate payment link on modal open if late fee exists
  React.useEffect(() => {
    if (isOpen && lateFeeData && !paymentLink) {
      generateLateFeePaymentLink();
    }
  }, [isOpen, lateFeeData]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success('Copied to clipboard!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateWhatsAppTemplate = (linkType: 'invoice' | 'payment', url: string) => {
    const greeting = `Hi ${customerName},`;
    
    if (linkType === 'invoice') {
      if (type === 'handover') {
        return `${greeting}

Your vehicle handover has been completed successfully! 🚗

📋 *Booking Details:*
• Booking Number: #${bookingNumber}
• Vehicle: ${carDetails}
• Invoice: ${invoiceData.invoiceNumber}

📄 *Handover Invoice:*
${url}

Thank you for choosing Budget Plus Rental. Drive safely! 🛡️

Best regards,
Budget Plus Rental Team`;
      } else {
        // For returns with late fees, create a combined message
        if (lateFeeData && paymentLink) {
          return `${greeting}

Your vehicle return has been processed successfully! ✅

📋 *Booking Details:*
• Booking Number: #${bookingNumber}
• Vehicle: ${carDetails}
• Invoice: ${invoiceData.invoiceNumber}

📄 *Return Invoice:*
${url}

💳 *Pay Late Fee Online:*
${paymentLink}

Late Fee: RM ${lateFeeData.amount.toFixed(2)}

Please complete the payment at your earliest convenience.

Best regards,
Budget Plus Rental Team`;
        } else {
          return `${greeting}

Your vehicle return has been processed successfully! ✅

📋 *Booking Details:*
• Booking Number: #${bookingNumber}
• Vehicle: ${carDetails}
• Invoice: ${invoiceData.invoiceNumber}

📄 *Return Invoice:*
${url}

Thank you for choosing Budget Plus Rental. We hope you had a great experience! 🌟

Best regards,
Budget Plus Rental Team`;
        }
      }
    } else {
      return `${greeting}

Your vehicle return has been processed. A late return fee applies for this booking.

📋 *Booking Details:*
• Booking Number: #${bookingNumber}
• Vehicle: ${carDetails}
• Late Fee: RM ${lateFeeData?.amount.toFixed(2)}

💳 *Pay Late Fee Online (Secure Payment):*
${url}

Please complete the payment at your earliest convenience.

Best regards,
Budget Plus Rental Team`;
    }
  };

  const copyAllLinks = () => {
    // For returns with late fees, use the combined message from invoice template
    if (type === 'return' && lateFeeData && paymentLink) {
      const combinedMessage = generateWhatsAppTemplate('invoice', invoiceData.invoiceUrl);
      copyToClipboard(combinedMessage, 'all');
    } else {
      // For handovers or returns without late fees, use the standard approach
      const messages = [];
      
      // Add invoice message
      const invoiceMessage = generateWhatsAppTemplate('invoice', invoiceData.invoiceUrl);
      messages.push(invoiceMessage);
      
      // Add payment message if late fee exists (this shouldn't happen for returns now)
      if (lateFeeData && paymentLink && type !== 'return') {
        const paymentMessage = generateWhatsAppTemplate('payment', paymentLink);
        messages.push(paymentMessage);
      }
      
      const combinedMessage = messages.length > 1 ? messages.join('\n\n---\n\n') : messages[0];
      copyToClipboard(combinedMessage, 'all');
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-green-500" />
              <span>Share {type === 'handover' ? 'Handover' : 'Return'} Details</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Booking Summary */}
            <Card className="bg-gray-50 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <p className="font-medium">{customerName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Booking:</span>
                  <p className="font-medium">#{bookingNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium">{carDetails}</p>
                </div>
              </div>
            </Card>

            {/* Invoice Link Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h4 className="text-lg font-semibold text-gray-900">
                  {type === 'handover' ? 'Handover' : 'Return'} Invoice
                </h4>
              </div>
              
              <Card className="border-blue-200 bg-blue-50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">Invoice #{invoiceData.invoiceNumber}</p>
                      <p className="text-sm text-blue-700">
                        {type === 'handover' ? 'Vehicle handover confirmation' : 'Vehicle return confirmation'}
                      </p>
                    </div>
                    <Button
                      onClick={() => window.open(invoiceData.invoiceUrl, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View</span>
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => copyToClipboard(invoiceData.invoiceUrl, 'invoice_url')}
                      variant="secondary"
                      size="sm"
                      className="flex items-center space-x-1 flex-1"
                    >
                      {copiedStates.invoice_url ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>Copy Link</span>
                    </Button>
                    
                    <Button
                      onClick={() => copyToClipboard(generateWhatsAppTemplate('invoice', invoiceData.invoiceUrl), 'invoice_template')}
                      variant="primary"
                      size="sm"
                      className="flex items-center space-x-1 flex-1"
                    >
                      {copiedStates.invoice_template ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                      <span>Copy WhatsApp Message</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Late Fee Payment Section */}
            {lateFeeData && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-red-500" />
                  <h4 className="text-lg font-semibold text-gray-900">Late Fee Payment</h4>
                </div>
                
                <Card className="border-red-200 bg-red-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-900">
                          Late Fee: RM {lateFeeData.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-red-700">
                         Secure online payment via {
                           lateFeeData.paymentMethod === 'online_banking' ? 'Online Banking (FPX)' :
                           lateFeeData.paymentMethod === 'credit_debit_card' ? 'Credit/Debit Card' :
                           lateFeeData.paymentMethod === 'qr_code' ? 'QR Code Payment' :
                           'Stripe'
                         }
                        </p>
                      </div>
                      {generatingPaymentLink && (
                        <div className="flex items-center space-x-2 text-red-700">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Generating...</span>
                        </div>
                      )}
                    </div>
                    
                    {paymentLink ? (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => copyToClipboard(paymentLink, 'payment_url')}
                          variant="secondary"
                          size="sm"
                          className="flex items-center space-x-1 flex-1"
                        >
                          {copiedStates.payment_url ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span>Copy Payment Link</span>
                        </Button>
                        
                        <Button
                          onClick={() => copyToClipboard(generateWhatsAppTemplate('payment', paymentLink), 'payment_template')}
                          variant="danger"
                          size="sm"
                          className="flex items-center space-x-1 flex-1"
                        >
                          {copiedStates.payment_template ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                          <span>Copy WhatsApp Message</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-red-600">
                          {generatingPaymentLink ? 'Generating payment link...' : 'Failed to generate payment link'}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Copy All Button */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={copyAllLinks}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 min-h-[44px]"
                disabled={generatingPaymentLink || (lateFeeData && !paymentLink)}
              >
                {copiedStates.all ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
                <span>
                  {type === 'return' && lateFeeData && paymentLink 
                    ? 'Copy Complete WhatsApp Message (Invoice + Payment)'
                    : lateFeeData && paymentLink 
                      ? 'Copy All WhatsApp Messages (Invoice + Payment)'
                      : 'Copy WhatsApp Message'
                  }
                </span>
              </Button>
            </div>

            {/* Instructions */}
            <Card className="bg-green-50 border border-green-200">
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">
                    WhatsApp Instructions
                  </h4>
                  <div className="text-xs text-green-800 space-y-1">
                    <p>1. Click "Copy WhatsApp Message" to copy the formatted message</p>
                    <p>2. Open WhatsApp and find the customer's chat</p>
                    <p>3. Paste the message and send</p>
                    <p>4. The customer will receive clickable links for easy access</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InvoiceShareModal;