import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, MessageCircle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ShareReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  invoiceData: any;
  lateFee?: number;
  lateFeePaymentUrl?: string;
  lateFeePaymentMethod?: string; // Add payment method prop
}

const ShareReturnDetailsModal: React.FC<ShareReturnDetailsModalProps> = ({
  isOpen,
  onClose,
  booking,
  invoiceData,
  lateFee = 0,
  lateFeePaymentUrl = '',
  lateFeePaymentMethod = 'credit_debit_card'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Get the current website URL for the invoice link
  const currentOrigin = window.location.origin;
  const invoiceUrl = `${currentOrigin}${invoiceData.invoiceUrl}`;

  // Generate WhatsApp message template
  const generateWhatsAppMessage = () => {
    const hasLateFee = lateFee > 0;
    
    if (hasLateFee) {
      // Generate the appropriate payment link based on method
      let paymentLinkText = '';
      let paymentMethodText = '';
      
      if (lateFeePaymentMethod === 'qr_code') {
        paymentLinkText = lateFeePaymentUrl || `${currentOrigin}/staff/qr-payment/${booking.id}`;
        paymentMethodText = 'QR Code Payment (Multiple Options Available)';
      } else if (lateFeePaymentMethod === 'online_banking') {
        paymentLinkText = lateFeePaymentUrl || `${currentOrigin}/payment-pending/${booking.id}`;
        paymentMethodText = 'Online Banking (FPX)';
      } else {
        paymentLinkText = lateFeePaymentUrl || `${currentOrigin}/payment-pending/${booking.id}`;
        paymentMethodText = 'Credit/Debit Card';
      }
      
      // Combined message for returns with late fees - includes both invoice and payment link
      return `Hi ${booking.customer?.name || 'Customer'},

Your vehicle return has been processed successfully! ✅

📋 *Booking Details:*
• Booking Number: ${booking.booking_number}
• Vehicle: ${booking.car?.brand} ${booking.car?.make} ${booking.car?.spec || ''}
• Invoice: ${invoiceData.invoiceNumber}
• Late Fee: RM ${lateFee.toFixed(2)}

📄 *Return Invoice (includes late fee):*
${invoiceUrl}

💳 *Pay Late Fee Online (Secure Payment):*
${paymentLinkText}

Payment Method: ${paymentMethodText}

Please complete the late fee payment at your earliest convenience. Both links are provided above for your convenience.

Best regards,
Budget Plus Rental Team`;
    } else {
      // Standard return message without late fees
      return `Hi ${booking.customer?.name || 'Customer'},

Your vehicle return has been processed successfully! ✅

📋 *Booking Details:*
• Booking Number: ${booking.booking_number}
• Vehicle: ${booking.car?.brand} ${booking.car?.make} ${booking.car?.spec || ''}
• Invoice: ${invoiceData.invoiceNumber}

📄 *Return Invoice:*
${invoiceUrl}

Thank you for choosing Budget Plus Rental. We hope you had a great experience! 🌟

Best regards,
Budget Plus Rental Team`;
    }
  };

  const whatsappMessage = generateWhatsAppMessage();

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopied(true);
      toast.success('Message copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Share Return Details
            </h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Message Preview */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                WhatsApp Message Template
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {whatsappMessage}
                </pre>
              </div>
            </div>

            {/* Late Fee Notice */}
            {lateFee > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Late Fee Applied</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  A late fee of RM {lateFee.toFixed(2)} has been applied to this return. 
                  The WhatsApp template below includes both the return invoice and secure payment link for the late fee in one convenient message.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCopyMessage}
                variant="secondary"
                className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{lateFee > 0 ? 'Copy Complete Message (Invoice + Payment)' : 'Copy Message'}</span>
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleOpenWhatsApp}
                className="flex-1 flex items-center justify-center space-x-2 min-h-[44px] bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">How to use:</h4>
              <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                <li>Click "Copy {lateFee > 0 ? 'Complete Message' : 'Message'}" to copy the template to your clipboard</li>
                <li>Open WhatsApp and navigate to the customer's chat</li>
                <li>Paste the message and send it to the customer</li>
                <li>Or click "Open in WhatsApp" to open WhatsApp Web with the message pre-filled</li>
                {lateFee > 0 && (
                  <li className="font-medium">The message includes both the return invoice and payment link for convenience</li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ShareReturnDetailsModal;