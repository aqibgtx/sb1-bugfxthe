import React from 'react';

interface InvoiceDetailsProps {
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  car: {
    name: string;
    plateNumber: string;
  };
  booking: {
    startDate: string;
    endDate: string;
    totalDays: number;
    bookingFor?: string;
    deliveryType?: string;
    deliveryDistance?: number;
    hasDelivery?: boolean;
    requiresDeposit?: boolean;
  };
  delivery?: {
    address?: string;
    pickupAddress?: string;
  } | null;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  customer,
  car,
  booking,
  delivery
}) => {
  const getDeliveryTypeDisplay = (deliveryType: string) => {
    switch (deliveryType) {
      case 'free_pickup':
        return 'Free Pickup Service';
      case 'vip_delivery':
        return 'VIP Delivery Service';
      case 'self_pickup':
        return 'Self Pickup';
      default:
        return 'Delivery Service';
    }
  };

  return (
    <div className="space-y-6 mb-[4%] sm:mb-[6%]">
      {/* Customer Info */}
      <div>
        <div className="text-xs sm:text-sm font-semibold text-[#333333] mb-2 font-['Inter'] leading-[1.5]">
          Customer:
        </div>
        <div className="text-xs sm:text-sm text-[#333333] space-y-2 font-['Inter'] leading-[1.6]">
          <div className="font-medium">{customer.name}</div>
          <div>{customer.email}</div>
          {customer.phone && <div>{customer.phone}</div>}
        </div>
      </div>

      {/* Car Info */}
      <div>
        <div className="text-xs sm:text-sm font-semibold text-[#333333] mb-2 font-['Inter'] leading-[1.5]">
          Car:
        </div>
        <div className="text-xs sm:text-sm text-[#333333] space-y-2 font-['Inter'] leading-[1.6]">
          <div className="font-medium">{car.name}</div>
          <div>Plate: {car.plateNumber}</div>
        </div>
      </div>

      {/* Booking Dates */}
      <div>
        <div className="text-xs sm:text-sm font-semibold text-[#333333] mb-2 font-['Inter'] leading-[1.5]">
          Dates:
        </div>
        <div className="text-xs sm:text-sm text-[#333333] space-y-2 font-['Inter'] leading-[1.6]">
          <div>Pickup: {booking.startDate}</div>
          <div>Return: {booking.endDate}</div>
          <div className="font-medium">{booking.totalDays} day{booking.totalDays > 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Booking For */}
      {booking.bookingFor && (
        <div>
          <div className="text-xs sm:text-sm font-semibold text-[#333333] mb-2 font-['Inter'] leading-[1.5]">
            Booking For:
          </div>
          <div className="text-xs sm:text-sm text-[#333333] space-y-2 font-['Inter'] leading-[1.6]">
            <div>{booking.bookingFor === 'myself' ? 'Customer (Self)' : 'Someone Else'}</div>
            {booking.requiresDeposit && (
              <div className="text-xs text-amber-600 italic">Security deposit required</div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Information */}
      {booking.hasDelivery && booking.deliveryType && booking.deliveryType !== 'self_pickup' && (
        <div>
          <div className="text-xs sm:text-sm font-semibold text-[#333333] mb-2 font-['Inter'] leading-[1.5]">
            Delivery Service:
          </div>
          <div className="text-xs sm:text-sm text-[#333333] space-y-2 font-['Inter'] leading-[1.6]">
            <div className="font-medium">{getDeliveryTypeDisplay(booking.deliveryType)}</div>
            {booking.deliveryDistance && booking.deliveryDistance > 0 && (
              <div>Distance: {booking.deliveryDistance} km</div>
            )}
            {delivery?.address && (
              <div>Address: {delivery.address}</div>
            )}
            {delivery?.pickupAddress && delivery.pickupAddress !== delivery.address && (
              <div>Pickup: {delivery.pickupAddress}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;