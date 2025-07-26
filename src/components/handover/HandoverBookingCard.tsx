import React from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  Calendar,
  DollarSign,
  User,
  HandHeart,
  MapPin
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

interface HandoverBookingCardProps {
  booking: any;
  index: number;
  onHandover: (booking: any) => void;
  isClientView?: boolean; // New prop to determine terminology
}

const HandoverBookingCard: React.FC<HandoverBookingCardProps> = ({ 
  booking, 
  index, 
  onHandover,
  isClientView = false
}) => {
  const CarInfoDisplay = ({ car, booking }: { car: any; booking: any }) => {
    if (!car) return <span className="text-gray-500">No car info</span>;
    
    return (
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Car className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {car.brand} {car.make}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span className="font-mono">{car.plate_number}</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3" />
              <span>RM {(booking.rental_amount / booking.total_days).toFixed(0)}/day</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get appropriate terminology based on view type (staff vs client)
  const getTerminology = () => {
    if (isClientView) {
      return {
        title: 'READY FOR PICKUP',
        description: 'Booking has been approved and is ready for pickup. Take a photo of the vehicle during pickup to start the rental period.',
        buttonText: 'Start Pickup',
        actionLabel: 'Ready for Pickup'
      };
    } else {
      return {
        title: 'READY FOR HANDOVER',
        description: 'Booking has been approved and is ready for handover. Take a photo of the car during handover to start the rental period.',
        buttonText: 'Start Handover',
        actionLabel: 'Ready for Handover'
      };
    }
  };

  const terminology = getTerminology();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-l-4 border-blue-500 border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4">
                <CarInfoDisplay car={booking.car} booking={booking} />
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <StatusBadge status={booking.booking_status} type="booking" />
                  <StatusBadge status={booking.payment_status} type="payment" />
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {terminology.title}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{isClientView ? 'Your Name' : 'Customer'}:</span>
                  <span className="font-medium">{booking.customer?.name}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{booking.total_days} day{booking.total_days > 1 ? 's' : ''}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">RM {booking.total_amount}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <HandHeart className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-blue-800">{terminology.actionLabel}</span>
                </div>
                <p className="text-blue-700 text-sm">
                  {terminology.description}
                </p>
                {booking.payment_status !== 'approved' && (
                  <p className="text-blue-600 text-xs mt-1">
                    Note: Payment is still {booking.payment_status}. {isClientView ? 'Pickup' : 'Handover'} can proceed as booking is approved.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:ml-6">
              <Button
                onClick={() => onHandover(booking)}
               className="w-full lg:w-auto flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 min-h-[44px]"
              >
                <HandHeart className="w-4 h-4" />
                <span>{terminology.buttonText}</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default HandoverBookingCard;