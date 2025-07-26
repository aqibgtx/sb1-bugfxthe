import React from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle,
  X,
  Eye,
  MapPin,
  DollarSign
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

interface ApprovalBookingCardProps {
  booking: any;
  index: number;
  onApprove: (booking: any, type: 'pickup' | 'dropoff') => void;
  onReject: (booking: any, type: 'pickup' | 'dropoff') => void;
  onViewPhoto: (photoUrl: string, type: 'pickup' | 'dropoff') => void;
  isAdmin?: boolean;
}

const ApprovalBookingCard: React.FC<ApprovalBookingCardProps> = ({ 
  booking, 
  index, 
  onApprove,
  onReject,
  onViewPhoto,
  isAdmin = false
}) => {
  const hasPickupRequest = booking.client_pickup_requested;
  const hasDropoffRequest = booking.client_dropoff_requested;

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

  // Request section component for pickup/dropoff requests
  // Any staff can approve these requests (no ownership restriction)
  const RequestSection = ({ type, requestTime, photoUrl }: { 
    type: 'pickup' | 'dropoff'; 
    requestTime: string;
    photoUrl: string;
  }) => (
    <div className={`p-4 rounded-lg border ${
      type === 'pickup' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {type === 'pickup' ? (
            <CheckCircle className="w-5 h-5 text-blue-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          <span className={`font-semibold ${
            type === 'pickup' ? 'text-blue-800' : 'text-green-800'
          }`}>
            {type === 'pickup' ? 'Pickup Request' : 'Drop-off Request'}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          type === 'pickup' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          PENDING APPROVAL
        </span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">Requested:</span>
          <span className="font-medium">
            {new Date(requestTime).toLocaleString('en-MY', {
              timeZone: 'Asia/Kuala_Lumpur',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">Customer:</span>
          <span className="font-medium">{booking.customer?.name}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 mt-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onViewPhoto(photoUrl, type)}
          className="flex items-center space-x-1"
        >
          <Eye className="w-4 h-4" />
          <span>View Photo</span>
        </Button>
        
        <div className="flex space-x-2 ml-auto">
          <Button
            size="sm"
            variant="danger"
            onClick={() => onReject(booking, type)}
            className="flex items-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </Button>
          <Button
            size="sm"
            variant="success"
            onClick={() => onApprove(booking, type)}
            className="flex items-center space-x-1"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Approve</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-l-4 border-yellow-500 border border-gray-200">
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4">
              <CarInfoDisplay car={booking.car} booking={booking} />
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                <StatusBadge status={booking.booking_status} type="booking" />
                <StatusBadge status={booking.payment_status} type="payment" />
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                  APPROVAL REQUIRED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Customer:</span>
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

              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Staff:</span>
                  <span className="font-medium">{booking.staff?.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {hasPickupRequest && (
                <RequestSection
                  type="pickup"
                  requestTime={booking.client_pickup_request_time}
                  photoUrl={booking.client_pickup_photo_url}
                />
              )}
              
              {hasDropoffRequest && (
                <RequestSection
                  type="dropoff"
                  requestTime={booking.client_dropoff_request_time}
                  photoUrl={booking.client_dropoff_photo_url}
                />
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ApprovalBookingCard;