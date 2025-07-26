import React from 'react';
import { useMalaysiaTime } from '../../hooks/useMalaysiaTime';
import { Calendar, Plus, Minus, User } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import BookingForSelection from './BookingForSelection';

interface EnhancedCustomerDurationFormProps {
  customers: any[];
  selectedCustomer: any;
  onCustomerSelect: (customer: any) => void;
  bookingDetails: any;
  onBookingDetailsChange: (details: any) => void;
  onDaysChange: (increment: boolean) => void;
  hideCustomerSelection?: boolean;
  bookingFor: string;
  onBookingForChange: (value: string) => void;
  deliveryType?: string;
  deliveryDistance?: number;
  onDeliveryTypeChange?: (type: string) => void;
  onDeliveryDistanceChange?: (distance: number) => void;
}

const EnhancedCustomerDurationForm: React.FC<EnhancedCustomerDurationFormProps> = ({
  customers,
  selectedCustomer,
  onCustomerSelect,
  bookingDetails,
  onBookingDetailsChange,
  onDaysChange,
  hideCustomerSelection = false,
  bookingFor,
  onBookingForChange
}) => {
  const { currentTime: currentMalaysiaTime } = useMalaysiaTime();

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {hideCustomerSelection ? 'Rental Duration' : 'Customer & Duration'}
        </h2>
        <p className="text-gray-700">
          {hideCustomerSelection ? 'Select your rental period' : 'Select customer and rental period'}
        </p>
      </div>

      {/* Booking For Selection */}
      <Card glass>
        <BookingForSelection 
          bookingFor={bookingFor} 
          onBookingForChange={onBookingForChange} 
        />
      </Card>

      {!hideCustomerSelection && (
        <Card glass>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Select Customer</span>
            </h3>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => onCustomerSelect(customer)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${selectedCustomer?.id === customer.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${selectedCustomer?.id === customer.id ? 'text-blue-900' : 'text-gray-900'}`}>
                        {customer.name}
                      </h4>
                      <p className={`text-sm ${selectedCustomer?.id === customer.id ? 'text-blue-700' : 'text-gray-600'}`}>
                        {customer.email}
                      </p>
                      {customer.phone && (
                        <p className={`text-xs ${selectedCustomer?.id === customer.id ? 'text-blue-600' : 'text-gray-500'}`}>
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    {selectedCustomer?.id === customer.id && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card glass>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Rental Period</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Start Date</label>
              <div className="text-xs text-gray-500 mb-1">
                Current time: {currentMalaysiaTime.toLocaleString('en-MY', { 
                  timeZone: 'Asia/Kuala_Lumpur',
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })} (Malaysia Time)
              </div>
              <input
                type="date"
                value={bookingDetails.startDate}
                onChange={(e) => onBookingDetailsChange({
                  ...bookingDetails,
                  startDate: e.target.value
                })}
                min={currentMalaysiaTime.toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Duration (Days)</label>
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDaysChange(false)}
                  disabled={bookingDetails.totalDays <= 1}
                  className="flex items-center justify-center w-10 h-10"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-gray-900">{bookingDetails.totalDays}</div>
                  <div className="text-gray-600 text-sm">
                    {bookingDetails.totalDays === 1 ? 'day' : 'days'}
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDaysChange(true)}
                  className="flex items-center justify-center w-10 h-10"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedCustomerDurationForm;