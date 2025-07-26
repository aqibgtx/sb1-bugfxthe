import React from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Mail, Eye, Car, User } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { OverdueBooking } from '../../types/overdue';

interface OverdueBookingCardProps {
  booking: OverdueBooking;
  index: number;
  onViewDetails: (booking: OverdueBooking) => void;
  onContactCustomer: (booking: OverdueBooking) => void;
}

const OverdueBookingCard: React.FC<OverdueBookingCardProps> = ({
  booking,
  index,
  onViewDetails,
  onContactCustomer
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="mobile-card hover:shadow-md transition-shadow duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                    {booking.car.brand} {booking.car.make}
                  </h3>
                  <p className="text-gray-600 text-xs md:text-sm">{booking.car.plate_number}</p>
                </div>
              </div>
              
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${getSeverityColor(booking.severity)}`}>
                {getSeverityIcon(booking.severity)}
                <span className="capitalize">{booking.severity}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs md:text-sm">
              <div>
                <span className="text-gray-600">Booking #:</span>
                <p className="font-medium text-gray-900">{booking.booking_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium text-gray-900">{booking.customer.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Hours Overdue:</span>
                <p className="font-medium text-red-600">{Math.ceil(booking.hours_overdue)} hours</p>
              </div>
              <div>
                <span className="text-gray-600">Overdue Fee:</span>
                <p className="font-bold text-red-600">RM {booking.overdue_fee.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>Expected return: {new Date(booking.expected_return_time).toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(booking)}
              className="mobile-button flex items-center justify-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>View Details</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onContactCustomer(booking)}
              className="mobile-button flex items-center justify-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default OverdueBookingCard;