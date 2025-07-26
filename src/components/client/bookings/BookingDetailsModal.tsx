import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Car, Hash, Calendar, DollarSign, User, AlertTriangle, Ban, Plus } from 'lucide-react';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';
import BookingExtensionModal from '../../booking/BookingExtensionModal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

interface BookingDetailsModalProps {
  booking: any;
  onClose: () => void;
  onBookingUpdated: () => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  onClose,
  onBookingUpdated
}) => {
  const { user } = useAuth();
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [submittingCancellation, setSubmittingCancellation] = useState(false);

  const canRequestCancellation = () => {
    return ['pending_approval', 'approved', 'extended', 'handed_over'].includes(booking.booking_status) && 
           !['cancelled', 'completed'].includes(booking.payment_status);
  };

  const canCancelDirectly = () => {
    // Can cancel directly if booking is not approved yet
    return booking.booking_status === 'pending_approval' && booking.payment_status === 'pending';
  };

  const handleDirectCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'cancelled',
          payment_status: 'cancelled',
          notes: (booking.notes || '') + ' | Cancelled by customer before approval.'
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking cancelled successfully');
      onBookingUpdated();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleSubmitCancellationRequest = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setSubmittingCancellation(true);

      const { error } = await supabase
        .from('cancellation_requests')
        .insert({
          booking_id: booking.id,
          staff_id: booking.staff_id, // Use the staff who created the booking
          reason: `[CLIENT REQUEST] ${cancellationReason}`
        });

      if (error) throw error;

      toast.success('Cancellation request submitted for admin approval');
      setShowCancellationForm(false);
      setCancellationReason('');
      onBookingUpdated();
      onClose();
    } catch (error) {
      console.error('Error submitting cancellation request:', error);
      toast.error('Failed to submit cancellation request');
    } finally {
      setSubmittingCancellation(false);
    }
  };

  const handleExtendBooking = () => {
    setShowExtensionModal(true);
  };

  const CarInfoDisplay = ({ car }: { car: any }) => {
    if (!car) return <span className="text-gray-500">No car info</span>;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex flex-col">
              <span className="text-blue-900 font-semibold">
                {car.brand} {car.make}
              </span>
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700 text-sm font-mono font-bold">
                  {car.plate_number}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showCancellationForm) {
    return (
      <div className="modal-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="modal-content modal-sm"
        >
          <div className="modal-header">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="modal-title">Request Cancellation</h3>
            </div>
            <button
              onClick={() => {
                setShowCancellationForm(false);
                setCancellationReason('');
              }}
              className="modal-close-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="modal-section">
              <div className="modal-card">
                <p className="modal-text mb-2">
                  Booking: <span className="font-mono font-semibold">#{booking.booking_number}</span>
                </p>
                <p className="modal-text">
                  This cancellation request will be sent to admin for approval.
                </p>
              </div>
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">
                Reason for Cancellation *
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this booking..."
                className="modal-form-input resize-none"
                rows={4}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-button-group">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCancellationForm(false);
                  setCancellationReason('');
                }}
                className="modal-action-button"
                disabled={submittingCancellation}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCancellationRequest}
                disabled={!cancellationReason.trim() || submittingCancellation}
                className="modal-action-button"
              >
                {submittingCancellation ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="modal-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-200 rounded-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="modal-title flex-1">
            Booking Details - #{booking.booking_number}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
          {/* Vehicle Information */}
          <div className="modal-section">
            <h3 className="modal-subtitle">Vehicle Information</h3>
            <div className="modal-card">
              <CarInfoDisplay car={booking.car} />
            </div>
          </div>

          {/* Booking Information */}
          <div className="modal-section">
            <div className="modal-grid">
              <div>
                <h3 className="modal-subtitle">Rental Information</h3>
                <div className="modal-card">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="modal-text">Start: {new Date(booking.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="modal-text">End: {new Date(booking.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="modal-text">Duration: {booking.total_days} days</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="modal-text font-semibold">Total: RM {booking.total_amount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="modal-subtitle">Status Information</h3>
                <div className="modal-card">
                  <div className="space-y-3">
                    <div>
                      <span className="modal-text text-gray-600 block mb-1">Booking Status:</span>
                      <StatusBadge status={booking.booking_status} type="booking" />
                    </div>
                    <div>
                      <span className="modal-text text-gray-600 block mb-1">Payment Status:</span>
                      <StatusBadge status={booking.payment_status} type="payment" />
                    </div>
                    {booking.staff && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="modal-text text-gray-600">Handled by:</span>
                          <span className="modal-text font-medium">{booking.staff.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="modal-section">
              <h3 className="modal-subtitle">Notes</h3>
              <div className="modal-card">
                <p className="modal-text">{booking.notes}</p>
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="modal-button-group">
            {['approved', 'ongoing', 'extended', 'handed_over'].includes(booking.booking_status) && (
              <Button
                onClick={handleExtendBooking}
                className="modal-action-button"
              >
                <Plus className="w-4 h-4" />
                <span>{booking.booking_status === 'extended' ? 'Request Extension Again' : 'Request Extension'}</span>
              </Button>
            )}
            
            {canRequestCancellation() && (
              <>
                {canCancelDirectly() ? (
                  <Button
                    variant="danger"
                    onClick={handleDirectCancel}
                    className="modal-action-button"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel Booking</span>
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => setShowCancellationForm(true)}
                    className="modal-action-button"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Request Cancellation</span>
                  </Button>
                )}
              </>
            )}
            
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="modal-action-button"
            >
              Close
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Booking Extension Modal */}
      {showExtensionModal && (
        <BookingExtensionModal
          booking={booking}
          onClose={() => setShowExtensionModal(false)}
          onExtensionComplete={() => {
            setShowExtensionModal(false);
            onBookingUpdated();
            onClose();
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
};

export default BookingDetailsModal;