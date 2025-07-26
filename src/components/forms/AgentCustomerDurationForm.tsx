import React from 'react';
import { useMalaysiaTime } from '../../hooks/useMalaysiaTime';
import { motion } from 'framer-motion';
import { User, Calendar, Plus, Minus, Crown, DollarSign, FileText } from 'lucide-react';
import Card from '../ui/Card';
import { CustomerSelect } from '../ui/CustomerSelect';

interface AgentCustomerDurationFormProps {
  customers: any[];
  selectedCustomer: any;
  onCustomerSelect: (customer: any) => void;
  bookingDetails: {
    startDate: string;
    totalDays: number;
  };
  onBookingDetailsChange: (details: any) => void;
  onDaysChange: (increment: boolean) => void;
  customPriceRequested: number;
  onCustomPriceChange: (price: number) => void;
  agentNotes: string;
  onAgentNotesChange: (notes: string) => void;
  selectedCar: any;
}

const AgentCustomerDurationForm: React.FC<AgentCustomerDurationFormProps> = ({
  customers,
  selectedCustomer,
  onCustomerSelect,
  bookingDetails,
  onBookingDetailsChange,
  onDaysChange,
  customPriceRequested,
  onCustomPriceChange,
  agentNotes,
  onAgentNotesChange,
  selectedCar
}) => {
  const currentMalaysiaTime = useMalaysiaTime();

  const handleStartDateChange = (date: string) => {
    onBookingDetailsChange({
      ...bookingDetails,
      startDate: date
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">VIP Customer & Pricing Details</h3>
      </div>

      {/* Customer Selection */}
      <Card glass>
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Select Customer</span>
        </h4>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Crown className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800 font-medium text-sm">VIP Agent Booking</span>
          </div>
          <p className="text-blue-700 text-sm">
            Staff member is pre-selected as the customer for this VIP booking. You can change this if needed.
          </p>
        </div>
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

        <CustomerSelect
          customers={customers}
          selectedCustomer={selectedCustomer}
          min={currentMalaysiaTime.currentTime.toISOString().split('T')[0]}
          placeholder="Search and select customer for VIP booking..."
        />
      </Card>

      {/* Custom Pricing Section */}
      <Card glass>
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <DollarSign className="w-5 h-5" />
          <span>Custom VIP Pricing</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Standard Daily Rate
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-900 font-semibold">
                RM {selectedCar ? selectedCar.rental_price_daily.toLocaleString() : '0'} / day
              </span>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Custom VIP Rate (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">RM</span>
              <input
                type="number"
                value={customPriceRequested || ''}
                onChange={(e) => onCustomPriceChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter custom rate per day"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>
            {customPriceRequested > 0 && (
              <p className="text-purple-600 text-sm mt-1">
                Custom rate: RM {customPriceRequested.toLocaleString()} / day
              </p>
            )}
          </div>
        </div>

        {customPriceRequested > 0 && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Crown className="w-4 h-4 text-purple-600" />
              <span className="text-purple-800 font-medium text-sm">VIP Custom Pricing Applied</span>
            </div>
            <p className="text-purple-700 text-sm">
              Difference: {customPriceRequested > (selectedCar?.rental_price_daily || 0) ? '+' : ''}
              RM {(customPriceRequested - (selectedCar?.rental_price_daily || 0)).toLocaleString()} per day
            </p>
          </div>
        )}
      </Card>

      {/* Duration Selection */}
      <Card glass>
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Rental Duration</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={bookingDetails.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Number of Days
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => onDaysChange(false)}
                disabled={bookingDetails.totalDays <= 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-gray-900">{bookingDetails.totalDays}</span>
                <p className="text-gray-600 text-sm">day{bookingDetails.totalDays > 1 ? 's' : ''}</p>
              </div>
              
              <button
                type="button"
                onClick={() => onDaysChange(true)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
          <h5 className="font-semibold text-purple-900 mb-2">VIP Pricing Summary</h5>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-700">Daily Rate:</span>
              <span className="text-purple-900 font-medium">
                RM {(customPriceRequested > 0 ? customPriceRequested : (selectedCar?.rental_price_daily || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">Duration:</span>
              <span className="text-purple-900 font-medium">{bookingDetails.totalDays} day{bookingDetails.totalDays > 1 ? 's' : ''}</span>
            </div>
            <div className="border-t border-purple-300 pt-1 mt-2">
              <div className="flex justify-between">
                <span className="text-purple-800 font-semibold">Subtotal:</span>
                <span className="text-purple-900 font-bold">
                  RM {((customPriceRequested > 0 ? customPriceRequested : (selectedCar?.rental_price_daily || 0)) * bookingDetails.totalDays).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* VIP Agent Notes */}
      <Card glass>
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>VIP Agent Notes</span>
        </h4>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Special Instructions or Notes (Optional)
          </label>
          <textarea
            value={agentNotes}
            onChange={(e) => onAgentNotesChange(e.target.value)}
            placeholder="Add any special instructions, requirements, or notes for this VIP booking..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={4}
          />
          <p className="text-gray-500 text-xs mt-1">
            These notes will be visible to admin and help with special handling of this VIP booking.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AgentCustomerDurationForm;