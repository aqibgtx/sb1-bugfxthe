import React from 'react';
import { Calendar, DollarSign, Car, User, Clock, Plus } from 'lucide-react';

interface ExtensionSummaryProps {
  booking: any;
  extensionDays: number;
  dailyRate: number;
  extensionAmount: number;
  newEndDate: Date;
}

const ExtensionSummary: React.FC<ExtensionSummaryProps> = ({
  booking,
  extensionDays,
  dailyRate,
  extensionAmount,
  newEndDate
}) => {
  // CRITICAL: Use only the passed parameters, never calculate or fetch
  console.log('ExtensionSummary received parameters:', {
    extensionDays,
    dailyRate,
    extensionAmount
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center space-x-2">
          <Plus className="w-6 h-6 text-blue-600" />
          <span>Booking Extension Summary</span>
        </h3>
        <p className="text-gray-600 mt-1">#{booking.booking_number}</p>
      </div>

      {/* Customer & Vehicle Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-semibold text-gray-900">{booking.customer.name}</p>
              <p className="text-sm text-gray-500">{booking.customer.email}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Car className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Vehicle</p>
              <p className="font-semibold text-gray-900">
                {booking.car?.brand || booking.car_name} {booking.car?.make || ''}
              </p>
              <p className="text-sm text-gray-500">
                Plate: {booking.car?.plate_number || booking.car_plate_number || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extension Details */}
      <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Extension Details</span>
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-blue-700">Original End Date</p>
            <p className="font-semibold text-blue-900">
              {new Date(booking.end_date).toLocaleDateString('en-MY')}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-blue-700">New End Date</p>
            <p className="font-semibold text-blue-900">
              {newEndDate.toLocaleDateString('en-MY')}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-blue-700">Extension Days</p>
            <p className="font-semibold text-blue-900">
              {extensionDays} day{extensionDays > 1 ? 's' : ''}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-blue-700">Daily Rate</p>
            <p className="font-semibold text-blue-900">RM {dailyRate.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
        <h4 className="font-semibold text-green-900 mb-3 flex items-center space-x-2">
          <DollarSign className="w-5 h-5" />
          <span>Payment Summary</span>
        </h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-green-700">Extension Amount:</span>
            <span className="font-bold text-green-900 text-lg">RM {extensionAmount.toFixed(2)}</span>
          </div>
          
          <div className="text-sm text-green-600 pt-2 border-t border-green-200">
            <p>Calculation: {extensionDays} day{extensionDays > 1 ? 's' : ''} × RM {dailyRate.toFixed(2)} = RM {extensionAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Rental Timeline</span>
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Original Start:</span>
            <span className="font-medium">{new Date(booking.start_date).toLocaleDateString('en-MY')}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Original End:</span>
            <span className="font-medium">{new Date(booking.end_date).toLocaleDateString('en-MY')}</span>
          </div>
          
          <div className="flex justify-between border-t border-gray-300 pt-2">
            <span className="text-gray-600">New End Date:</span>
            <span className="font-medium text-blue-600">{newEndDate.toLocaleDateString('en-MY')}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Total Duration:</span>
            <span className="font-medium">{booking.total_days + extensionDays} days</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionSummary;