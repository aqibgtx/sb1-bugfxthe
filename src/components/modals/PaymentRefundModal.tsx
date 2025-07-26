import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertTriangle, 
  DollarSign, 
  Car, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PaymentRefundModalProps {
  payment: any;
  isOpen: boolean;
  onClose: () => void;
  onRefundComplete: () => void;
}

const PaymentRefundModal: React.FC<PaymentRefundModalProps> = ({
  payment,
  isOpen,
  onClose,
  onRefundComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [carReturnStatus, setCarReturnStatus] = useState<'returned' | 'with_customer' | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [showCarStatusQuestion, setShowCarStatusQuestion] = useState(false);

  const handleInitiateRefund = async () => {
    if (!payment?.booking) {
      toast.error('Booking information not found');
      return;
    }

    // Check if car has been handed over
    if (payment.booking.handover_marked) {
      setShowCarStatusQuestion(true);
    } else {
      // Car not handed over, proceed with direct refund
      await processRefund();
    }
  };

  const handleCarStatusSelection = (status: 'returned' | 'with_customer') => {
    setCarReturnStatus(status);
    if (status === 'returned') {
      // Process as car returned
      processRefundWithCarReturn();
    } else {
      // Car still with customer, just refund payment
      processRefund();
    }
  };

  const processRefundWithCarReturn = async () => {
    try {
      setLoading(true);

      // Update booking to mark car as returned
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          return_marked: true,
          actual_return_time: new Date().toISOString(),
          booking_status: 'completed',
          payment_status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking.id);

      if (bookingError) throw bookingError;

      // Update car status to available
      const { error: carError } = await supabase
        .from('cars')
        .update({
          status: 'available',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking.car_id);

      if (carError) throw carError;

      // Update payment status
      await updatePaymentStatus();

      toast.success('Refund processed and car marked as returned');
      onRefundComplete();
      onClose();
    } catch (error) {
      console.error('Error processing refund with car return:', error);
      toast.error('Failed to process refund with car return');
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async () => {
    try {
      setLoading(true);

      // Update booking payment status to refunded
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking.id);

      if (bookingError) throw bookingError;

      // Update payment status
      await updatePaymentStatus();

      toast.success('Payment refund processed successfully');
      onRefundComplete();
      onClose();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async () => {
    const { error } = await supabase
      .from('payments')
      .update({
        admin_approval_status: 'refunded',
        notes: `Payment refunded. Reason: ${refundReason || 'Admin refund'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (error) throw error;
  };

  const resetModal = () => {
    setCarReturnStatus(null);
    setRefundReason('');
    setShowCarStatusQuestion(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen || !payment) return null;

  return (
    <AnimatePresence>
      <div className="modal-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-content modal-md"
        >
            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="modal-title">Refund Payment</h3>
                  <p className="modal-text">Process payment refund</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="modal-close-button text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
            {/* Payment Information */}
            <div className="modal-section">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="modal-subtitle mb-4">Payment Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="modal-text text-gray-600">Amount:</span>
                    <span className="font-bold text-red-600">RM {payment.amount}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="modal-text text-gray-600">Customer:</span>
                    <span className="modal-text text-gray-900 font-medium">{payment.booking?.customer?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Car className="w-4 h-4 text-gray-500" />
                    <span className="modal-text text-gray-600">Vehicle:</span>
                    <span className="modal-text text-gray-900 font-medium">
                      {payment.car_name || `${payment.booking?.car?.brand} ${payment.booking?.car?.make}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="modal-text text-gray-600">Booking:</span>
                    <span className="modal-text text-gray-900 font-medium">#{payment.booking?.booking_number}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Car Status Question */}
            {showCarStatusQuestion && !carReturnStatus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="modal-section"
              >
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <h4 className="modal-subtitle text-yellow-900">Car Status Check</h4>
                    </div>
                    <p className="modal-text text-yellow-800">
                      This booking shows the car was handed over to the customer. 
                      Has the car been returned by the customer?
                    </p>
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleCarStatusSelection('returned')}
                        disabled={loading}
                        className="modal-action-button flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Yes, Car Has Been Returned</span>
                      </Button>
                      <Button
                        onClick={() => handleCarStatusSelection('with_customer')}
                        disabled={loading}
                        variant="secondary"
                        className="modal-action-button flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>No, Car Is Still With Customer</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Refund Reason */}
            {(!showCarStatusQuestion || carReturnStatus) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="modal-section"
              >
                <label className="block modal-text font-medium text-gray-700 mb-3">
                  Refund Reason (Optional)
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund..."
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none min-h-[100px] modal-text"
                  rows={3}
                  disabled={loading}
                />
              </motion.div>
            )}

            {/* Warning */}
            <div className="modal-section">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="text-red-800">
                  <p className="modal-text font-medium mb-2">Warning: This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Mark the payment as refunded</li>
                    <li>Update booking payment status to "refunded"</li>
                    <li>Move the payment to history</li>
                    {carReturnStatus === 'returned' && (
                      <>
                        <li>Mark the car as returned and available</li>
                        <li>Complete the booking</li>
                      </>
                    )}
                    <li>This action cannot be easily undone</li>
                  </ul>
                </div>
              </div>
            </div>
            </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-footer">
              <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
                className="modal-action-button flex-1"
              >
                Cancel
              </Button>
              {!showCarStatusQuestion && (
                <Button
                  onClick={handleInitiateRefund}
                  disabled={loading}
                  className="modal-action-button flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Process Refund</span>
                    </>
                  )}
                </Button>
              )}
            </div>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentRefundModal;