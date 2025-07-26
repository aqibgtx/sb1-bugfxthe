import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Upload, Car, Hash, Calendar, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';

interface BookingCardProps {
  booking: any;
  onViewDetails: (booking: any) => void;
  onUploadPayment: (bookingId: string) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onViewDetails,
  onUploadPayment
}) => {
  const CarInfoDisplay = ({ car }: { car: any }) => {
    if (!car) return <span className="text-gray-500">No car info</span>;
    
    return (
      <div className="flex items-center space-x-2">
        <Car className="w-4 h-4 text-gray-600" />
        <div className="flex flex-col">
          <span className="text-gray-900 font-medium">
            {car.brand} {car.make}
          </span>
          <div className="flex items-center space-x-1">
            <Hash className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600 text-xs font-mono">
              {car.plate_number}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const isOverdue = () => {
    const now = new Date();
    const endDate = new Date(booking.end_date);
    return endDate < now && !booking.return_marked && booking.payment_status === 'approved';
  };

  const getDaysOverdue = () => {
    const now = new Date();
    const endDate = new Date(booking.end_date);
    return Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="space-y-4">
        {/* Header with Booking Number and Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-lg font-bold text-gray-900">
              #{booking.booking_number}
            </span>
            {isOverdue() && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" />
                <span>{getDaysOverdue()}d overdue</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.booking_status} type="booking" />
            <StatusBadge status={booking.payment_status} type="payment" />
          </div>
        </div>

        {/* Car Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <CarInfoDisplay car={booking.car} />
        </div>

        {/* Booking Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Duration:</span>
            </div>
            <div className="text-gray-900 ml-6">
              {new Date(booking.start_date).toLocaleDateString()} to{' '}
              {new Date(booking.end_date).toLocaleDateString()}
            </div>
            <div className="text-gray-600 text-xs ml-6">
              {booking.total_days} day{booking.total_days > 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Total Amount:</span>
            </div>
            <div className="text-xl font-bold text-gray-900 ml-6">
              RM {booking.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Staff Information */}
        {booking.staff && (
          <div className="text-sm text-gray-600">
            <span>Handled by: </span>
            <span className="text-gray-900 font-medium">{booking.staff.name}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={() => onViewDetails(booking)}
            className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
          >
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </Button>
          
          {booking.payment_status === 'pending' && (
            <Button
              onClick={() => onUploadPayment(booking.id)}
              className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Payment</span>
            </Button>
          )}
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="font-medium">Notes: </span>
            {booking.notes}
          </div>
        )}
      </div>
    </Card>
  );
};

export default BookingCard;