import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, X } from 'lucide-react';
import Button from '../ui/Button';
import { OverdueBooking } from '../../types/overdue';
import { formatMalaysiaDateTime } from '../../lib/timezone';

interface OverdueBookingDetailsModalProps {
  isOpen: boolean;
  booking: OverdueBooking | null;
  onClose: () => void;
  onContactCustomer: (booking: OverdueBooking) => void;
}

const OverdueBookingDetailsModal: React.FC<OverdueBookingDetailsModalProps> = ({
  isOpen,
  booking,
  onClose,
  onContactCustomer
}) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg mobile-modal"
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-lg md:text-2xl font-bold text-gray-900">
            Overdue Unreturned Booking Details
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="touch-target"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Booking Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
              <div>
                <span className="text-gray-600">Booking #:</span>
                <p className="font-medium">{booking.booking_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Vehicle:</span>
                <p className="font-medium">{booking.car.brand} {booking.car.make}</p>
              </div>
              <div>
                <span className="text-gray-600">Plate Number:</span>
                <p className="font-medium">{booking.car.plate_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Daily Rate:</span>
                <p className="font-medium">RM {booking.daily_rate.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Handed Over:</span>
                <p className="font-medium">{formatMalaysiaDateTime(booking.handover_time)}</p>
              </div>
              <div>
                <span className="text-gray-600">Expected Return:</span>
                <p className="font-medium">{formatMalaysiaDateTime(booking.expected_return_time)}</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-blue-50 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Customer Information</h4>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-xs md:text-sm">{booking.customer.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs md:text-sm break-all">{booking.customer.email}</span>
              </div>
              {booking.customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm">{booking.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Return Status */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-orange-900 mb-3 text-sm md:text-base">Return Status</h4>
            <div className="space-y-2 text-xs md:text-sm">
              <div className="flex justify-between">
                <span className="text-orange-700">Vehicle Status:</span>
                <span className="font-medium text-orange-800">NOT RETURNED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700">Return Marked:</span>
                <span className="font-medium">{booking.return_marked ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between border-t border-orange-200 pt-2">
                <span className="text-orange-800 font-semibold">Status:</span>
                <span className="font-bold text-orange-800">VEHICLE STILL WITH CUSTOMER</span>
              </div>
            </div>
          </div>

          {/* Overdue Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-red-900 mb-3 text-sm md:text-base">Overdue Charges</h4>
            <div className="space-y-2 text-xs md:text-sm">
              <div className="flex justify-between">
                <span className="text-red-700">Hours Overdue:</span>
                <span className="font-medium">{Math.ceil(booking.hours_overdue)} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">Hourly Rate (10%):</span>
                <span className="font-medium">RM {(booking.daily_rate * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-red-200 pt-2">
                <span className="text-red-800 font-semibold">Total Overdue Fee:</span>
                <span className="font-bold text-red-800">RM {booking.overdue_fee.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 p-4 md:p-6 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={onClose}
            className="mobile-button"
          >
            Close
          </Button>
          <Button
            onClick={() => onContactCustomer(booking)}
            className="mobile-button flex items-center justify-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Customer</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OverdueBookingDetailsModal;