import React from 'react';
import { motion } from 'framer-motion';
import { Car, User, Plus, Upload, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import StepProgress from '../../components/ui/StepProgress';
import BookingHeader from '../../components/booking/BookingHeader';
import BookingStepRenderer from '../../components/booking/BookingStepRenderer';
import BookingNavigation from '../../components/booking/BookingNavigation';
import EnhancedCombinedPaymentInvoiceModal from '../../components/modals/EnhancedCombinedPaymentInvoiceModal';
import { useBookingForm } from '../../hooks/useBookingForm';

const StaffBookCar: React.FC = () => {
  const {
    // State
    currentStep,
    selectedCar,
    selectedCustomer,
    deliveryType,
    deliveryDistance,
    bookingDetails,
    selectedAddOns,
    paymentMethod,
    receiptFile,
    loading,
    submittingBooking,
    refreshing,
    showEnhancedModal,
    enhancedModalData,
    isProcessing,
    cars,
    customers,
    addOns,

    // Actions
    setCurrentStep,
    setDeliveryType,
    setDeliveryDistance,
    setBookingDetails,
    setPaymentMethod,
    handleRefresh,
    handleCarSelect,
    handleCustomerSelect,
    handleDaysChange,
    handleAddOnToggle,
    updateAddOnQuantity,
    calculateTotal,
    handleReceiptFileSelect,
    handleSubmitBookingRequest,
    handleCloseEnhancedModal,
    canProceedToStep
  } = useBookingForm();

  const steps = [
    { number: 1, title: 'Select Car', icon: Car },
    { number: 2, title: 'Customer & Duration', icon: User },
    { number: 3, title: 'Add-ons', icon: Plus },
    { number: 4, title: 'Payment Method', icon: Upload },
    { number: 5, title: 'Review & Submit', icon: CheckCircle }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 md:space-y-8 mobile-container w-full max-w-full overflow-hidden"
    >
      <BookingHeader
        title="Request Car Booking"
        description="Create a booking request with enhanced delivery options"
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Progress Steps */}
      <StepProgress currentStep={currentStep} steps={steps} />

      {/* Step Content */}
      <Card className="mobile-card w-full max-w-full overflow-hidden">
        <BookingStepRenderer
          currentStep={currentStep}
          cars={cars}
          customers={customers}
          addOns={addOns}
          selectedCar={selectedCar}
          selectedCustomer={selectedCustomer}
          bookingDetails={bookingDetails}
          selectedAddOns={selectedAddOns}
          paymentMethod={paymentMethod}
          receiptFile={receiptFile}
          deliveryType={deliveryType}
          deliveryDistance={deliveryDistance}
          onCarSelect={handleCarSelect}
          onCustomerSelect={handleCustomerSelect}
          onBookingDetailsChange={setBookingDetails}
          onDaysChange={handleDaysChange}
          onAddOnToggle={handleAddOnToggle}
          onUpdateAddOnQuantity={updateAddOnQuantity}
          onPaymentMethodChange={setPaymentMethod}
          onReceiptFileSelect={handleReceiptFileSelect}
          onDeliveryTypeChange={setDeliveryType}
          onDeliveryDistanceChange={setDeliveryDistance}
          calculateTotal={calculateTotal}
        />
      </Card>

      {/* Navigation */}
      <div className="w-full max-w-full overflow-hidden">
        <BookingNavigation
        currentStep={currentStep}
        totalSteps={steps.length}
        canProceedToStep={canProceedToStep}
        onPreviousStep={() => setCurrentStep(Math.max(1, currentStep - 1))}
        onNextStep={() => setCurrentStep(currentStep + 1)}
        onSubmit={handleSubmitBookingRequest}
        submitting={submittingBooking}
        isProcessing={isProcessing}
        paymentMethod={paymentMethod}
        receiptFile={receiptFile}
        />
      </div>

      {/* Enhanced Combined Payment & Invoice Modal */}
      <EnhancedCombinedPaymentInvoiceModal
        isOpen={showEnhancedModal}
        onClose={handleCloseEnhancedModal}
        bookingData={enhancedModalData.bookingData}
        paymentMethod={paymentMethod}
        invoiceData={enhancedModalData.invoiceData}
      />
    </motion.div>
  );
};

export default StaffBookCar;