import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

interface BookingNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceedToStep: (step: number) => boolean;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onSubmit: () => void;
  submitting: boolean;
  isProcessing: boolean;
  paymentMethod: string;
  receiptFile: File | null;
}

const BookingNavigation: React.FC<BookingNavigationProps> = ({
  currentStep,
  totalSteps,
  canProceedToStep,
  onPreviousStep,
  onNextStep,
  onSubmit,
  submitting,
  isProcessing,
  paymentMethod,
  receiptFile
}) => {
  const isLastStep = currentStep === totalSteps;
  const canSubmit = canProceedToStep(totalSteps) && 
    (paymentMethod !== 'cash' || receiptFile !== null) && 
    !submitting && 
    !isProcessing;

  return (
    <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
      <Button
        variant="ghost"
        onClick={onPreviousStep}
        disabled={currentStep === 1}
        className="flex items-center justify-center space-x-2 min-h-[44px] min-w-[44px] w-full sm:w-auto"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Previous</span>
      </Button>

      {!isLastStep ? (
        <Button
          onClick={onNextStep}
          disabled={!canProceedToStep(currentStep + 1)}
          className="flex items-center justify-center space-x-2 min-h-[44px] min-w-[44px] w-full sm:w-auto"
        >
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="px-8 py-3 text-lg min-h-[44px] min-w-[44px] w-full sm:w-auto"
        >
          {isProcessing ? 'Processing...' : submitting ? 'Submitting...' : 'Submit Booking Request'}
        </Button>
      )}
    </div>
  );
};

export default BookingNavigation;