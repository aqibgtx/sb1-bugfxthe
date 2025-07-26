import React from 'react';
import CarSelectionForm from '../forms/CarSelectionForm';
import AgentCustomerDurationForm from '../forms/AgentCustomerDurationForm';
import AddOnsDeliveryForm from '../forms/AddOnsDeliveryForm';
import PaymentMethodForm from '../forms/PaymentMethodForm';
import AgentBookingSummary from '../summaries/AgentBookingSummary';
import { AgentBookingData, AgentBookingActions } from '../../types/agentBooking';

interface AgentBookingStepContentProps extends AgentBookingData, Pick<AgentBookingActions, 
  'handleCarSelect' | 'handleDaysChange' | 'handleAddOnToggle' | 'updateAddOnQuantity' | 
  'handleDeliveryTypeChange' | 'handleDeliveryDistanceChange' | 'handleReceiptFileSelect' | 'calculateTotal'
> {
  currentStep: number;
  cars: any[];
  customers: any[];
  addOns: any[];
  deliveryType: string;
  deliveryDistance: number;
  setBookingDetails: (details: any) => void;
  setPaymentMethod: (method: string) => void;
  setCustomPriceRequested: (price: number) => void;
  setAgentNotes: (notes: string) => void;
}

const AgentBookingStepContent: React.FC<AgentBookingStepContentProps> = ({
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
  customPriceRequested,
  agentNotes,
  deliveryType,
  deliveryDistance,
  handleCarSelect,
  handleDaysChange,
  handleAddOnToggle,
  updateAddOnQuantity,
  handleDeliveryTypeChange,
  handleDeliveryDistanceChange,
  handleReceiptFileSelect,
  calculateTotal,
  setBookingDetails,
  setPaymentMethod,
  setCustomPriceRequested,
  setAgentNotes
}) => {
  switch (currentStep) {
    case 1:
      return (
        <CarSelectionForm
          cars={cars}
          onCarSelect={handleCarSelect}
        />
      );

    case 2:
      return (
        <AgentCustomerDurationForm
          customers={customers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={() => {}} // No-op since customer is pre-selected
          bookingDetails={bookingDetails}
          onBookingDetailsChange={setBookingDetails}
          onDaysChange={handleDaysChange}
          customPriceRequested={customPriceRequested}
          onCustomPriceChange={setCustomPriceRequested}
          agentNotes={agentNotes}
          onAgentNotesChange={setAgentNotes}
          selectedCar={selectedCar}
          hideCustomerSelection={true} // Hide customer selection since it's pre-selected
        />
      );

    case 3:
      return (
        <AddOnsDeliveryForm
          addOns={addOns}
          selectedAddOns={selectedAddOns}
          onAddOnToggle={handleAddOnToggle}
          onUpdateAddOnQuantity={updateAddOnQuantity}
          bookingDetails={bookingDetails}
          onBookingDetailsChange={setBookingDetails}
          deliveryType={deliveryType}
          deliveryDistance={deliveryDistance}
          onDeliveryTypeChange={handleDeliveryTypeChange}
          onDeliveryDistanceChange={handleDeliveryDistanceChange}
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
          onPaymentMethodChange={setPaymentMethod}
          receiptFile={receiptFile}
          onReceiptFileSelect={handleReceiptFileSelect}
          calculateTotal={calculateTotal}
        />
      );

    case 5:
      return (
        <AgentBookingSummary
          selectedCar={selectedCar}
          selectedCustomer={selectedCustomer}
          bookingDetails={bookingDetails}
          selectedAddOns={selectedAddOns}
          paymentMethod={paymentMethod}
          receiptFile={receiptFile}
          customPriceRequested={customPriceRequested}
          agentNotes={agentNotes}
          calculateTotal={calculateTotal}
        />
      );

    default:
      return null;
  }
};

export default AgentBookingStepContent;