import React from 'react';
import { motion } from 'framer-motion';
import { Car, User, Calendar, DollarSign, Package, Truck, FileText, Crown, Star } from 'lucide-react';
import Card from '../ui/Card';

interface AgentBookingSummaryProps {
  selectedCar: any;
  selectedCustomer: any;
  bookingDetails: {
    startDate: string;
    endDate: string;
    totalDays: number;
    rentalAmount: number;
    deliveryEnabled: boolean;
    deliveryKm: number;
    deliveryFee: number;
  };
  selectedAddOns: any[];
  paymentMethod: string;
  receiptFile: File | null;
  customPriceRequested: number;
  agentNotes: string;
  calculateTotal: () => number;
}

const AgentBookingSummary: React.FC<AgentBookingSummaryProps> = ({
  selectedCar,
  selectedCustomer,
  bookingDetails,
  selectedAddOns,
  paymentMethod,
  receiptFile,
  customPriceRequested,
  agentNotes,
  calculateTotal
}) => {
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'online_banking':
        return 'FPX Online Banking';
      case 'credit_debit_card':
        return 'Credit/Debit Card';
      case 'qr_code':
        return 'QR Code Payment';
      case 'cash':
        return 'Cash Payment';
      default:
        return method;
    }
  };

  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => 
    sum + (addOn.price_daily * addOn.quantity * bookingDetails.totalDays), 0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">VIP Agent Booking Summary</h3>
      </div>

      {/* VIP Status Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Star className="w-6 h-6 text-purple-600" />
          <div>
            <h4 className="text-purple-900 font-semibold">VIP Agent Booking</h4>
            <p className="text-purple-700 text-sm">
              This booking will receive priority handling and special attention from our team.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Vehicle Information */}
          <Card glass>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Car className="w-5 h-5" />
              <span>Selected Vehicle</span>
            </h4>
            
            {selectedCar && (
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  {selectedCar.image_url && (
                    <img
                      src={selectedCar.image_url}
                      alt={`${selectedCar.brand} ${selectedCar.make}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      {selectedCar.brand} {selectedCar.make}
                    </h5>
                    {selectedCar.spec && (
                      <p className="text-gray-600 text-sm">{selectedCar.spec}</p>
                    )}
                    <p className="text-gray-600 text-sm">Plate: {selectedCar.plate_number}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Standard Rate:</span>
                    <span className="text-gray-900 font-medium">RM {selectedCar.rental_price_daily}/day</span>
                  </div>
                  {customPriceRequested > 0 && (
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-200">
                      <span className="text-purple-700 font-medium">VIP Custom Rate:</span>
                      <span className="text-purple-900 font-bold">RM {customPriceRequested}/day</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Customer Information */}
          <Card glass>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Customer Details</span>
            </h4>
            
            {selectedCustomer && (
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-900">{selectedCustomer.name}</h5>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-gray-600">{selectedCustomer.phone}</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Rental Duration */}
          <Card glass>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Rental Period</span>
            </h4>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Start Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(bookingDetails.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">End Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(bookingDetails.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Total Duration:</span>
                  <span className="text-blue-900 font-bold">
                    {bookingDetails.totalDays} day{bookingDetails.totalDays > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Add-ons */}
          {selectedAddOns.length > 0 && (
            <Card glass>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Selected Add-ons</span>
              </h4>
              
              <div className="space-y-3">
                {selectedAddOns.map((addOn) => (
                  <div key={addOn.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{addOn.name}</p>
                      <p className="text-gray-600 text-sm">
                        RM {addOn.price_daily} × {addOn.quantity} × {bookingDetails.totalDays} days
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900">
                      RM {(addOn.price_daily * addOn.quantity * bookingDetails.totalDays).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Delivery */}
          {bookingDetails.deliveryEnabled && (
            <Card glass>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Truck className="w-5 h-5" />
                <span>Delivery Service</span>
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Distance:</span>
                  <span className="text-gray-900 font-medium">{bookingDetails.deliveryKm} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Delivery Fee:</span>
                  <span className="text-gray-900 font-medium">RM {bookingDetails.deliveryFee}</span>
                </div>
              </div>
            </Card>
          )}

          {/* VIP Agent Notes */}
          {agentNotes && (
            <Card glass>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>VIP Agent Notes</span>
              </h4>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-purple-900 text-sm whitespace-pre-wrap">{agentNotes}</p>
              </div>
            </Card>
          )}

          {/* Payment Method */}
          <Card glass>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Payment Information</span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Payment Method:</span>
                <span className="text-gray-900 font-medium">{getPaymentMethodLabel(paymentMethod)}</span>
              </div>
              
              {receiptFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm">
                    <strong>Receipt File:</strong> {receiptFile.name}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Total Cost */}
          <Card glass>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Rental Amount:</span>
                <span className="text-gray-900">RM {bookingDetails.rentalAmount.toLocaleString()}</span>
              </div>
              
              {addOnsTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Add-ons:</span>
                  <span className="text-gray-900">RM {addOnsTotal.toLocaleString()}</span>
                </div>
              )}
              
              {bookingDetails.deliveryFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Delivery Fee:</span>
                  <span className="text-gray-900">RM {bookingDetails.deliveryFee.toLocaleString()}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                  <span className="text-xl font-bold text-purple-600">RM {calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              {customPriceRequested > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Crown className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-800 font-medium text-sm">VIP Custom Pricing Applied</span>
                  </div>
                  <p className="text-purple-700 text-xs">
                    Custom rate of RM {customPriceRequested}/day has been applied to this VIP booking.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentBookingSummary;