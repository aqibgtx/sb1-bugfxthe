import React from 'react';
import { motion } from 'framer-motion';
import { Car, User, Calendar, DollarSign, CheckCircle, XCircle, MapPin, Hash, Crown, ArrowRight } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';

interface BookingApprovalCardProps {
  booking: any;
  index: number;
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
  onForwardToStaff?: (booking: any) => void;
}

const BookingApprovalCard: React.FC<BookingApprovalCardProps> = ({
  booking,
  index,
  onApprove,
  onReject,
  onForwardToStaff
}) => {
  // Check if this is a customer self-booking (no staff assigned)
  const isCustomerSelfBooking = !booking.staff_id || 
    booking.staff?.name === 'System' || 
    booking.staff?.name === 'Customer Portal' ||
    booking.staff?.name === null ||
    booking.staff?.name === undefined;

  const CarInfoDisplay = ({ booking }: { booking: any }) => {
    const carName = booking.car_name || (booking.car ? `${booking.car.brand} ${booking.car.make}` : 'Unknown Vehicle');
    const plateNumber = booking.car_plate_number || booking.car?.plate_number || 'N/A';
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-blue-900 font-semibold text-sm">Vehicle Information</h4>
            <div className="flex flex-col space-y-1">
              <span className="text-blue-800 font-medium">
                {carName}
              </span>
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700 text-sm font-mono font-bold">
                  {plateNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">
                Booking #{booking.booking_number}
              </h3>
              <div className="flex items-center space-x-2">
                <StatusBadge status="pending_approval" type="booking" />
                {booking.is_agent_booking && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold">
                    <Crown className="w-3 h-3" />
                    <span>VIP</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VIP Agent Booking Notice */}
          {booking.is_agent_booking && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <h4 className="text-purple-900 font-semibold">VIP Agent Booking</h4>
              </div>
              <div className="text-purple-800 text-sm space-y-1">
                <p>✨ This is a special VIP booking created by staff/agent</p>
                {booking.custom_price_requested && (
                  <p>💰 Custom price requested: RM {booking.custom_price_requested}</p>
                )}
                {booking.agent_notes && (
                  <p>📝 Agent notes: {booking.agent_notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Customer Self-Booking Notice */}
          {isCustomerSelfBooking && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <User className="w-5 h-5 text-blue-600" />
                <h4 className="text-blue-900 font-semibold">Customer Self-Booking</h4>
              </div>
              <div className="text-blue-800 text-sm space-y-1">
                <p>🏠 This booking was created by the customer through the client portal</p>
                <p>👤 No staff member is currently assigned to handle this booking</p>
                <p>📋 You can approve and forward this booking to a specific staff member</p>
              </div>
            </div>
          )}

          {/* Vehicle Information - Prominent Display */}
          <CarInfoDisplay booking={booking} />
          
          {/* Booking Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm md:text-base">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Customer:</span>
                  <span className="text-gray-900 font-medium">{booking.customer?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Duration:</span>
                  <span className="text-gray-900">{booking.total_days} day{booking.total_days > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Total:</span>
                  <span className="text-gray-900 font-bold">RM {booking.total_amount}</span>
                  {booking.is_agent_booking && (
                    <span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">VIP</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Staff:</span>
                  <span className="text-gray-900">
                    {isCustomerSelfBooking ? (
                      <span className="text-orange-600 font-medium">Not Assigned</span>
                    ) : (
                      booking.staff?.name || 'Unknown Staff'
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Start Date:</span>
                <div className="text-gray-900 font-medium">{new Date(booking.start_date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-gray-600">End Date:</span>
                <div className="text-gray-900 font-medium">{new Date(booking.end_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Delivery Info */}
            {booking.delivery_enabled && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 font-medium">Delivery Requested</span>
                </div>
                <div className="text-green-700 text-sm">
                  Distance: {booking.delivery_distance || 0}km | Fee: RM {booking.delivery_fee || 0}
                </div>
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 text-sm">Notes:</span>
                <p className="text-gray-900 text-sm mt-1">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">⚠️ Important</p>
            <p className="text-yellow-700 text-xs">
              Approving this booking will mark the car as rented and reserve it for the customer.
              {booking.is_agent_booking && ' This is a VIP agent booking with special handling.'}
            </p>
          </div>

          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
            {isCustomerSelfBooking && onForwardToStaff ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => onForwardToStaff(booking)}
                  className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium min-h-[44px]"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Approve & Forward to Staff</span>
                </Button>
                <Button
                  variant="success"
                  onClick={() => onApprove(booking.id)}
                  className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium min-h-[44px]"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve Without Staff</span>
                </Button>
              </>
            ) : (
              <Button
                variant="success"
                onClick={() => onApprove(booking.id)}
                className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{booking.is_agent_booking ? 'Approve VIP Booking' : 'Approve Booking'}</span>
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => onReject(booking.id)}
              className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium min-h-[44px]"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Booking</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default BookingApprovalCard;