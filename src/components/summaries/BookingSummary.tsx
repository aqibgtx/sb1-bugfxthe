import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';

interface BookingSummaryProps {
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
  calculateTotal: () => number;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedCar,
  selectedCustomer,
  bookingDetails,
  selectedAddOns,
  paymentMethod,
  receiptFile,
  calculateTotal
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Review & Submit</h3>
      
      <Card glass>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Final Review</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Car Details</h5>
              <p className="text-gray-700">{selectedCar?.brand} {selectedCar?.make}</p>
              <p className="text-gray-600 text-sm">{selectedCar?.spec}</p>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Customer</h5>
              <p className="text-gray-700">{selectedCustomer?.name}</p>
              <p className="text-gray-600 text-sm">{selectedCustomer?.email}</p>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Rental Period</h5>
              <p className="text-gray-700">{bookingDetails.startDate} to {bookingDetails.endDate}</p>
              <p className="text-gray-600 text-sm">{bookingDetails.totalDays} days</p>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Payment Method</h5>
              <p className="text-gray-700">{paymentMethod === 'online_banking' ? 'Online Banking (FPX)' : 'Cash'}</p>
              <p className="text-gray-600 text-sm">
                {paymentMethod === 'online_banking' 
                  ? 'Secure payment link will be generated'
                  : (receiptFile ? `Receipt: ${receiptFile.name}` : 'No receipt selected')
                }
              </p>
            </div>
          </div>
          
          {selectedAddOns.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Add-ons</h5>
              <div className="space-y-1">
                {selectedAddOns.map(addOn => (
                  <p key={addOn.id} className="text-gray-700 text-sm">
                    {addOn.name} x{addOn.quantity} - RM {addOn.price_daily * addOn.quantity * bookingDetails.totalDays}
                  </p>
                ))}
              </div>
            </div>
          )}

          {bookingDetails.deliveryEnabled && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Delivery Service</h5>
              <p className="text-gray-700 text-sm">
                Distance: {bookingDetails.deliveryKm}km - RM {bookingDetails.deliveryFee}
              </p>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-blue-600">RM {calculateTotal()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Final Status Information */}
      <Card glass className="border-l-4 border-orange-500 bg-orange-50">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-orange-500 mt-1" />
          <div>
            <h4 className="text-orange-800 font-semibold mb-2">Next Steps</h4>
            <div className="text-orange-700 text-sm space-y-1">
              <p>1. <strong>Booking Request:</strong> Will be submitted and awaiting admin approval</p>
              <p>2. <strong>Payment Processing:</strong> {paymentMethod === 'online_banking' ? 'Secure FPX payment link will be generated for customer' : 'Receipt will be uploaded for admin review'}</p>
              <p>3. <strong>Admin Approval:</strong> Both booking and payment need admin approval</p>
              <p>4. <strong>Car Reservation:</strong> Car will be marked as "rented" once booking is approved</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookingSummary;