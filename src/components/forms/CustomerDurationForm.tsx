import React from 'react';
import { useMalaysiaTime } from '../../hooks/useMalaysiaTime';
import { motion } from 'framer-motion';
import { User, Calendar, Plus, Minus, Truck, Shield, Info, DollarSign } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CustomerSelect } from '../ui/CustomerSelect';

interface CustomerDurationFormProps {
  customers: any[];
  selectedCustomer: any;
  onCustomerSelect: (customer: any) => void;
  bookingDetails: {
    startDate: string;
    totalDays: number;
  };
  onBookingDetailsChange: (details: any) => void;
  onDaysChange: (increment: boolean) => void;
  hideCustomerSelection?: boolean;
  deliveryType?: string;
  deliveryDistance?: number;
  onDeliveryTypeChange?: (type: string) => void;
  onDeliveryDistanceChange?: (distance: number) => void;
}

const CustomerDurationForm: React.FC<CustomerDurationFormProps> = ({
  customers,
  selectedCustomer,
  onCustomerSelect,
  bookingDetails,
  onBookingDetailsChange,
  onDaysChange,
  hideCustomerSelection = false,
  deliveryType = 'self_pickup',
  deliveryDistance = 0,
  onDeliveryTypeChange,
  onDeliveryDistanceChange
}) => {
  const { currentTime: currentMalaysiaTime } = useMalaysiaTime();

  const calculateDeliveryFee = (type: string, distance: number) => {
    switch (type) {
      case 'self_pickup':
        return 0;
      case 'free_pickup':
        return distance > 7 ? (distance - 7) * 2 : 0;
      case 'vip_delivery':
        return distance * 4;
      default:
        return 0;
    }
  };

  const deliveryOptions = [
    {
      id: 'self_pickup',
      title: 'Self Pickup',
      subtitle: 'Pick up at our office',
      description: 'Collect your vehicle directly from our location',
      icon: User,
      fee: 'Free',
      color: 'green'
    },
    {
      id: 'free_pickup',
      title: 'Pickup Service',
      subtitle: 'Free within 7km, RM2/km beyond',
      description: 'We come to your location. Free within 7km, RM2/km beyond.',
      icon: Truck,
      fee: deliveryType === 'free_pickup' ? 
        (deliveryDistance > 7 ? `RM${((deliveryDistance - 7) * 2).toFixed(2)}` : 'Free') : 
        'Free up to 7km',
      color: 'blue'
    },
    {
      id: 'vip_delivery',
      title: 'VIP Door-to-Door',
      subtitle: 'RM4/km',
      description: 'Premium delivery service to your location',
      icon: Truck,
      fee: deliveryType === 'vip_delivery' ? 
        `RM${(deliveryDistance * 4).toFixed(2)}` : 
        'RM4/km',
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {hideCustomerSelection ? 'Rental Duration & Delivery' : 'Customer, Duration & Delivery'}
        </h2>
        <p className="text-gray-700">
          {hideCustomerSelection ? 'Select your rental period and delivery method' : 'Select customer, rental period and delivery method'}
        </p>
      </div>

      {!hideCustomerSelection && (
        <Card glass>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Select Customer</span>
            </h3>
            <CustomerSelect
              customers={customers}
              selectedCustomer={selectedCustomer}
              onCustomerSelect={onCustomerSelect}
            />
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

      {/* Delivery Method Selection */}
      {onDeliveryTypeChange && onDeliveryDistanceChange && (
        <Card glass className="w-full max-w-full overflow-hidden">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Truck className="w-5 h-5" />
              <span>Delivery Method</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-4 w-full">
              {deliveryOptions.map((option) => {
                const isSelected = deliveryType === option.id;
                const IconComponent = option.icon;
                
                return (
                  <label key={option.id} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryType"
                      value={option.id}
                      checked={isSelected}
                      onChange={(e) => onDeliveryTypeChange(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`
                      p-4 rounded-lg border-2 transition-all duration-200 w-full max-w-full overflow-hidden
                      ${isSelected 
                        ? `border-${option.color}-500 bg-${option.color}-50 shadow-md` 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }
                    `}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`
                            p-2 rounded-full flex-shrink-0
                            ${isSelected 
                              ? `bg-${option.color}-500 text-white` 
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className={`font-medium break-words ${isSelected ? `text-${option.color}-900` : 'text-gray-900'}`}>
                              {option.title}
                            </h4>
                            <p className={`text-sm break-words ${isSelected ? `text-${option.color}-700` : 'text-gray-600'}`}>
                              {option.subtitle}
                            </p>
                            <p className={`text-xs break-words ${isSelected ? `text-${option.color}-600` : 'text-gray-500'}`}>
                              {option.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className={`font-semibold ${isSelected ? `text-${option.color}-900` : 'text-gray-900'}`}>
                            {option.fee}
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Distance Input for Pickup/Delivery Options */}
            {(deliveryType === 'free_pickup' || deliveryType === 'vip_delivery') && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200 w-full max-w-full overflow-hidden">
                <h4 className="font-medium text-gray-900 mb-3">Distance Calculator</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distance from office (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={deliveryDistance}
                      onChange={(e) => onDeliveryDistanceChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-full"
                      placeholder="Enter distance in km"
                    />
                  </div>
                  
                  {deliveryDistance > 0 && (
                    <div className="bg-white p-3 rounded border border-gray-200 w-full max-w-full overflow-hidden">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium flex-shrink-0">{deliveryDistance} km</span>
                      </div>
                      {deliveryType === 'free_pickup' && deliveryDistance > 7 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Chargeable distance:</span>
                          <span className="font-medium flex-shrink-0">{deliveryDistance - 7} km × RM2</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm font-semibold border-t border-gray-200 pt-2 mt-2">
                        <span>Delivery Fee:</span>
                        <span className="text-blue-600 flex-shrink-0">RM{calculateDeliveryFee(deliveryType, deliveryDistance).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

    </div>
  );
};

export default CustomerDurationForm;