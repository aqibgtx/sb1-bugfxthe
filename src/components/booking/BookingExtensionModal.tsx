import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  DollarSign,
  Car,
  User,
  Plus,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Share2,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { stripePaymentService } from '../../services/stripePaymentService';
import EnhancedCombinedPaymentInvoiceModal from '../modals/EnhancedCombinedPaymentInvoiceModal';
import { ExtensionInvoiceGenerator } from '../invoices/ExtensionInvoiceGenerator';
import ExtensionSummary from '../summaries/ExtensionSummary';
import toast from 'react-hot-toast';

interface BookingExtensionModalProps {
  booking: any;
  onClose: () => void;
  onExtensionComplete: () => void;
  isAdmin?: boolean;
}

const BookingExtensionModal: React.FC<BookingExtensionModalProps> = ({
  booking,
  onClose,
  onExtensionComplete,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [extensionDays, setExtensionDays] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('online_banking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [extensionResult, setExtensionResult] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Calculate extension details
  const dailyRate = booking.car?.rental_price_daily || (booking.rental_amount / booking.total_days);
  const extensionAmount = extensionDays * dailyRate;
  
  // Calculate newEndDate safely for display
  const calculateNewEndDate = () => {
    try {
     // Parse the date string and ensure it's treated as UTC to avoid timezone issues
     const endDateStr = booking.end_date.includes('T') ? booking.end_date : `${booking.end_date}T00:00:00.000Z`;
     const endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        return null;
      }
      const newDate = new Date(endDate.getTime());
      newDate.setUTCDate(newDate.getUTCDate() + extensionDays);
      return newDate;
    } catch (error) {
      console.error('Error calculating new end date:', error);
     console.error('Error calculating new end date:', error);
      return null;
    }
  };

  // Calculate newEndDate safely for display - CRITICAL FIX
  const newEndDate = useMemo(() => {
    try {
      const endDate = new Date(booking.end_date + 'T00:00:00.000Z'); // Ensure UTC parsing
      if (isNaN(endDate.getTime())) {
        return null;
      }
      const newDate = new Date(endDate);
      newDate.setUTCDate(newDate.getUTCDate() + extensionDays); // Use UTC methods
      return newDate;
    } catch (error) {
      console.error('Error calculating new end date:', error);
      return null;
    }
  }, [booking.end_date, extensionDays]);

  const paymentMethods = [
    { value: 'online_banking', label: 'Online Banking', icon: '🏦' },
    { value: 'credit_debit_card', label: 'Credit/Debit Card', icon: '💳' },
    { value: 'qr_code', label: 'QR Code', icon: '📱' },
    { value: 'cash', label: 'Cash', icon: '💵' }
  ];

  const handleExtensionSubmit = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }
   // Parse the date string and ensure it's treated as UTC to avoid timezone issues
   const endDateStr = booking.end_date.includes('T') ? booking.end_date : `${booking.end_date}T00:00:00.000Z`;
   const endDate = new Date(endDateStr);
   // Use UTC methods to avoid timezone issues and ensure consistent date calculation
   const calculatedNewEndDate = new Date(endDate.getTime());
   calculatedNewEndDate.setUTCDate(calculatedNewEndDate.getUTCDate() + extensionDays);
    const finalDailyRate = booking.car?.rental_price_daily || (booking.rental_amount / booking.total_days);
    const finalExtensionAmount = extensionDays * finalDailyRate;
    
    // Log the exact parameters being used for extension
    const daysDifference = Math.round((calculatedNewEndDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log('🚀 BookingExtensionModal.handleExtensionSubmit - Extension Parameters:', {
      bookingId: booking.id,
     originalEndDateLocal: endDate.toLocaleDateString('en-MY'),
      extensionDays,
      dailyRate: finalDailyRate,
     calculatedNewEndDateLocal: calculatedNewEndDate.toLocaleDateString('en-MY'),
      extensionAmount: finalExtensionAmount,
      newEndDate: newEndDate?.toISOString()
    });

    setIsProcessing(true);
    try {
      // Calculate newEndDate safely within the function
      const endDate = new Date(booking.end_date + 'T00:00:00.000Z');
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid booking end date');
      }
      
      const calculatedNewEndDate = new Date(endDate);
      calculatedNewEndDate.setUTCDate(endDate.getUTCDate() + extensionDays);
      
      if (isNaN(calculatedNewEndDate.getTime())) {
        throw new Error('Invalid date calculation for booking extension');
      }

      console.log('🗓️ Date calculation verification:', {
        originalEndDate: endDate.toISOString(),
        extensionDays,
        calculatedNewEndDate: calculatedNewEndDate.toISOString(),
        formattedOriginal: endDate.toLocaleDateString('en-MY'),
        formattedNew: calculatedNewEndDate.toLocaleDateString('en-MY')
      });

      // CRITICAL: Verify the date calculation is working correctly
      const daysDifference = Math.ceil((calculatedNewEndDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log('🔍 Date calculation verification:', {
        originalEndDateString: endDate.toDateString(),
        newEndDateString: calculatedNewEndDate.toDateString(),
        expectedDaysDifference: extensionDays,
        actualDaysDifference: daysDifference,
        calculationCorrect: daysDifference === extensionDays
      });

      if (daysDifference !== extensionDays) {
        console.error('❌ Date calculation error detected!', {
          expected: extensionDays,
          actual: daysDifference,
          originalDate: endDate.toISOString(),
          calculatedDate: calculatedNewEndDate.toISOString()
        });
        throw new Error(`Date calculation error: expected ${extensionDays} days difference, got ${daysDifference}`);
      }

      console.log('🔍 Extension Parameters Before Creation:', {
        extensionDays,
        dailyRate: finalDailyRate,
        extensionAmount: finalExtensionAmount,
        newEndDate: calculatedNewEndDate.toISOString()
      });

      const { data: bookingDetails, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          end_date,
          total_days,
          customer:customer_id(*)
        `)
        .eq('id', booking.id)
        .single();

      if (bookingError || !bookingDetails) {
        throw new Error('Failed to fetch booking details for extension invoice');
      }

      console.log('📋 Fetched booking data (basic info only):', {
        bookingNumber: bookingDetails.booking_number,
        originalEndDate: bookingDetails.end_date,
        totalDays: bookingDetails.total_days
      });

      // Create extension record
      const { data: extensionData, error: extensionError } = await supabase
        .from('booking_extensions')
        .insert({
          booking_id: booking.id,
          original_end_date: booking.end_date,
          extended_end_date: calculatedNewEndDate.toISOString().split('T')[0],
          extension_days: extensionDays,
          daily_rate: finalDailyRate,
          extension_amount: finalExtensionAmount,
          payment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          created_by: user.id,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (extensionError || !extensionData) {
        throw new Error('Failed to create extension record');
      }

      console.log('✅ Extension created successfully:', extensionData);

      // Update booking status to extended
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          booking_status: 'extended',
          end_date: calculatedNewEndDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (bookingUpdateError) {
        console.error('Error updating booking status:', bookingUpdateError);
        // Don't throw here as extension was created successfully
      } else {
        console.log('✅ Booking end_date updated successfully:', {
          bookingId: booking.id,
          originalEndDate: booking.end_date,
          newEndDate: calculatedNewEndDate.toISOString().split('T')[0],
          extensionDays: extensionDays
        });
      }

      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceNumberError) {
        console.error('Error generating invoice number:', invoiceNumberError);
        throw new Error('Failed to generate invoice number');
      }

      // Generate invoice using ExtensionInvoiceGenerator
      const invoiceResult = await ExtensionInvoiceGenerator.generateExtensionInvoice({
        bookingId: booking.id,
        originalBookingEndDate: booking.end_date,
        extensionDays,
        dailyRate: finalDailyRate,
        extensionAmount: finalExtensionAmount,
        newEndDate: calculatedNewEndDate,
        invoiceNumber
      });

      // CRITICAL: Verify the invoice was created with correct parameters
      const { data: verifyInvoice, error: verifyError } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, html_content')
        .eq('id', invoiceResult.invoiceId)
        .single();

      if (verifyError) {
        console.error('❌ Failed to verify created invoice:', verifyError);
      } else {
        console.log('✅ Invoice verification:', {
          invoiceId: verifyInvoice.id,
          invoiceNumber: verifyInvoice.invoice_number,
          savedAmount: verifyInvoice.amount,
          expectedAmount: finalExtensionAmount,
          amountMatch: Math.abs(verifyInvoice.amount - finalExtensionAmount) < 0.01,
          hasHtmlContent: !!verifyInvoice.html_content
        });
        
        // Check if HTML contains correct values
        if (verifyInvoice.html_content) {
          const htmlContainsCorrectDays = verifyInvoice.html_content.includes(`${extensionDays} day`);
          const htmlContainsCorrectRate = verifyInvoice.html_content.includes(`RM ${finalDailyRate.toFixed(2)}`);
          const htmlContainsCorrectAmount = verifyInvoice.html_content.includes(`RM ${finalExtensionAmount.toFixed(2)}`);
          
          console.log('🔍 HTML Content Verification:', {
            containsCorrectDays: htmlContainsCorrectDays,
            containsCorrectRate: htmlContainsCorrectRate,
            containsCorrectAmount: htmlContainsCorrectAmount
          });
        }
      }

      // Update extension record with invoice URL
      await supabase
        .from('booking_extensions')
        .update({ 
          invoice_url: invoiceResult.previewUrl
        })
        .eq('id', extensionData.id);

      console.log('✅ Extension record updated with invoice URL:', invoiceResult.previewUrl);
      // Create payment record for extension (without Stripe session yet)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          amount: finalExtensionAmount,
          payment_method_code: getPaymentMethodCode(paymentMethod),
          approved: false,
          admin_approval_status: 'pending',
          payment_completion_status: 'pending',
          notes: `Extension payment for ${extensionData.id}`,
          created_at: new Date().toISOString()
        });

      if (paymentError) {
        console.error('⚠️ Error creating payment record:', paymentError);
        // Don't throw here as extension and invoice were created successfully
      } else {
        console.log('✅ Payment record created for extension');
      }
      
      setExtensionResult(extensionData);
      
      // Pass invoice data to modal
      setInvoiceData({
        invoiceId: invoiceResult.invoiceId,
        invoiceNumber: invoiceNumber,
        totalAmount: finalExtensionAmount,
        previewUrl: invoiceResult.previewUrl
      });

      console.log('🎯 FINAL: Invoice data passed to modal:', {
        invoiceId: invoiceResult.invoiceId,
        invoiceNumber: invoiceNumber,
        totalAmount: finalExtensionAmount,
        previewUrl: invoiceResult.previewUrl,
        verificationPassed: verifyInvoice ? Math.abs(verifyInvoice.amount - finalExtensionAmount) < 0.01 : false,
        exactParametersUsed: {
          extensionDays,
          dailyRate: finalDailyRate,
          extensionAmount: finalExtensionAmount
        }
      });
      
      toast.success(`Booking extended successfully by ${extensionDays} day${extensionDays > 1 ? 's' : ''}!`);
      toast('Booking status has been updated to "Extended"');
      
      // Always show payment modal for both admin and staff
      setShowPaymentModal(true);

    } catch (error) {
      console.error('Error extending booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extend booking');
    } finally {
      setIsProcessing(false);
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-blue-500 p-6 text-white rounded-t-lg flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex items-center space-x-3"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px]">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Extend Booking</h2>
                  <p className="text-blue-100">#{booking.booking_number}</p>
                </div>
              </motion.div>
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-100">Current End Date</p>
                <p className="font-bold text-lg">{new Date(booking.end_date).toLocaleDateString()}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-100">Daily Rate</p>
                <p className="font-bold text-lg">RM {dailyRate.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Current Booking Info */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Car className="w-5 h-5" />
                <span>Current Booking Details</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{booking.customer.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Car className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium">{booking.car?.brand || booking.car_name} {booking.car?.make || ''}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{booking.total_days} days</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Original Amount:</span>
                    <span className="font-medium">RM {booking.total_amount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Extension Configuration */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Extension Configuration</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Extension Days *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={extensionDays}
                    onChange={(e) => setExtensionDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    placeholder="Enter number of days"
                  />
                </div>

                {/* Extension Summary Preview */}
                <ExtensionSummary
                  booking={booking}
                  extensionDays={extensionDays}
                  dailyRate={dailyRate}
                  extensionAmount={extensionAmount}
                  newEndDate={newEndDate || new Date()}
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Method</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all min-h-[44px] ${
                      paymentMethod === method.value
                        ? 'border-green-500 bg-green-100'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-medium text-gray-900">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Warning for non-admin users */}
            {!isAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h4 className="text-yellow-900 font-semibold">Staff Extension Request</h4>
                </div>
                <div className="text-yellow-800 text-sm">
                  <p>This extension request will be sent to admin for approval.</p>
                  <p>You will be notified once the request is processed.</p>
                  <p className="mt-2 font-medium">Note: Once approved, the booking status will change to "Extended".</p>
                </div>
              </div>
            )}

            {/* Admin notice */}
            {isAdmin && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h4 className="text-green-900 font-semibold">Admin Extension</h4>
                </div>
                <div className="text-green-800 text-sm">
                  <p>As an admin, you can process this extension and generate payment links for the customer.</p>
                  <p>Payment links and invoices will be generated for customer payment processing.</p>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer with Submit Button */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <Button
                onClick={onClose}
                variant="ghost"
                className="px-6 py-3 min-h-[48px] text-base font-medium"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExtensionSubmit}
                disabled={isProcessing || extensionDays < 1}
                className="px-8 py-3 min-h-[48px] text-base font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>{isAdmin ? (booking.booking_status === 'extended' ? 'Extend Again' : 'Extend Booking') : 'Submit Extension Request'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && extensionResult && invoiceData && (
        <EnhancedCombinedPaymentInvoiceModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            onExtensionComplete();
            onClose();
          }}
          bookingData={{
            id: booking.id,
            booking_number: `${booking.booking_number} (Extension)`,
            customer: booking.customer,
            car: booking.car || { brand: booking.car_name || 'Unknown', make: '' },
            total_days: extensionDays,
            total_amount: extensionAmount,
            extension_days: extensionDays
          }}
          paymentMethod={paymentMethod}
          extensionId={extensionResult.id}
          invoiceData={invoiceData}
          extensionDays={extensionDays}
        />
      )}
    </AnimatePresence>
  );
};

export default BookingExtensionModal;