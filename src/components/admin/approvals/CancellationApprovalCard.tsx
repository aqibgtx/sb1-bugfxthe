import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, User, Calendar, DollarSign, CheckCircle, XCircle, FileText, Car, Hash } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';

interface CancellationApprovalCardProps {
  request: any;
  index: number;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const CancellationApprovalCard: React.FC<CancellationApprovalCardProps> = ({
  request,
  index,
  onApprove,
  onReject
}) => {
  const CarInfoDisplay = ({ booking }: { booking: any }) => {
    if (!booking?.car) return <span className="text-gray-500">No car info</span>;
    
    const carName = booking.car_name || `${booking.car.brand} ${booking.car.make}`;
    const plateNumber = booking.car_plate_number || booking.car.plate_number || 'N/A';
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Car className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="text-red-900 font-semibold text-sm">Vehicle to be Released</h4>
            <div className="flex flex-col space-y-1">
              <span className="text-red-800 font-medium">
                {carName}
              </span>
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3 text-red-600" />
                <span className="text-red-700 text-sm font-mono font-bold">
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
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  Cancellation Request
                </h3>
                <StatusBadge status="pending" />
              </div>
            </div>
          </div>

          {/* Vehicle Information - Prominent Display */}
          <CarInfoDisplay booking={request.booking} />
          
          {/* Request Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm md:text-base">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Booking:</span>
                  <span className="text-gray-900 font-medium">#{request.booking?.booking_number || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Customer:</span>
                  <span className="text-gray-900">{request.booking?.customer?.name || 'Unknown'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Requested by:</span>
                  <span className="text-gray-900">{request.staff?.name || 'Unknown Staff'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Requested:</span>
                  <span className="text-gray-900">{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Booking Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Booking Status:</span>
                <div className="mt-1">
                  <StatusBadge status={request.booking?.booking_status} type="booking" />
                </div>
              </div>
              <div>
                <span className="text-gray-600">Payment Status:</span>
                <div className="mt-1">
                  <StatusBadge status={request.booking?.payment_status} type="payment" />
                </div>
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-orange-800 font-medium text-sm">Cancellation Reason:</span>
              <p className="text-orange-700 text-sm mt-1">{request.reason}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">⚠️ Important</p>
            <p className="text-yellow-700 text-xs">
              Approving this cancellation will permanently cancel the booking and make the car available again.
            </p>
          </div>

          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="success"
              onClick={() => onApprove(request.id)}
              className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve Cancellation</span>
            </Button>
            <Button
              variant="danger"
              onClick={() => onReject(request.id)}
              className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium min-h-[44px]"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Request</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default CancellationApprovalCard;