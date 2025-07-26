import React from 'react';
import CarSelectionForm from '../forms/CarSelectionForm';
import CustomerDurationForm from '../forms/CustomerDurationForm';
import AddOnsDeliveryForm from '../forms/AddOnsDeliveryForm';
import PaymentMethodForm from '../forms/PaymentMethodForm';
import BookingSummary from '../summaries/BookingSummary';

interface BookingStepRendererProps {
  currentStep: number;
  cars: any[];
  customers: any[];
  addOns: any[];
  selectedCar: any;
  selectedCustomer: any;
  bookingDetails: any;
  selectedAddOns: any[];
  paymentMethod: string;
  receiptFile: File | null;
  deliveryType: string;
  deliveryDistance: number;
  onCarSelect: (car: any) => void;
  onCustomerSelect: (customer: any) => void;
  onBookingDetailsChange: (details: any) => void;
  onDaysChange: (increment: boolean) => void;
  onAddOnToggle: (addOn: any) => void;
  onUpdateAddOnQuantity: (addOnId: string, quantity: number) => void;
  onPaymentMethodChange: (method: string) => void;
  onReceiptFileSelect: (file: File) => void;
  onDeliveryTypeChange: (type: string) => void;
  onDeliveryDistanceChange: (distance: number) => void;
  calculateTotal: () => number;
}

const BookingStepRenderer: React.FC<BookingStepRendererProps> = ({
  currentStep,
  cars,
  customers,
  addOns,
  selectedCar,
  selectedCustomer,
  bookingDetails,
  selectedAddOns,
  paymentMethod,
  receiptFile,
  deliveryType,
  deliveryDistance,
  onCarSelect,
  onCustomerSelect,
  onBookingDetailsChange,
  onDaysChange,
  onAddOnToggle,
  onUpdateAddOnQuantity,
  onPaymentMethodChange,
  onReceiptFileSelect,
  onDeliveryTypeChange,
  onDeliveryDistanceChange,
  calculateTotal
}) => {
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CarSelectionForm
            cars={cars}
            onCarSelect={onCarSelect}
          />
        );

      case 2:
        return (
          <CustomerDurationForm
            customers={customers}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={onCustomerSelect}
            bookingDetails={bookingDetails}
            onBookingDetailsChange={onBookingDetailsChange}
            onDaysChange={onDaysChange}
          />
        );

      case 3:
        return (
          <AddOnsDeliveryForm
            addOns={addOns}
            selectedAddOns={selectedAddOns}
            onAddOnToggle={onAddOnToggle}
            onUpdateAddOnQuantity={onUpdateAddOnQuantity}
            bookingDetails={bookingDetails}
            onBookingDetailsChange={onBookingDetailsChange}
            deliveryType={deliveryType}
            deliveryDistance={deliveryDistance}
            onDeliveryTypeChange={onDeliveryTypeChange}
            onDeliveryDistanceChange={onDeliveryDistanceChange}
            onDeliveryKmChange={() => {}} // Handled in AddOnsDeliveryForm
          />
        );

      case 4:
        return (
          <PaymentMethodForm
            selectedCar={selectedCar}
            selectedCustomer={selectedCustomer}
            bookingDetails={bookingDetails}
            selectedAddOns={selectedAddOns}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={onPaymentMethodChange}
            receiptFile={receiptFile}
            onReceiptFileSelect={onReceiptFileSelect}
            calculateTotal={calculateTotal}
          />
        );

      case 5:
        return (
          <BookingSummary
            selectedCar={selectedCar}
            selectedCustomer={selectedCustomer}
            bookingDetails={bookingDetails}
            selectedAddOns={selectedAddOns}
            paymentMethod={paymentMethod}
            receiptFile={receiptFile}
            calculateTotal={calculateTotal}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="mobile-spacing w-full max-w-full overflow-hidden">
      {renderStepContent()}
    </div>
  );
};

export default BookingStepRenderer;