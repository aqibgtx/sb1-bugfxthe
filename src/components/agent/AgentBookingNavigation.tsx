import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

interface AgentBookingNavigationProps {
  currentStep: number;
  canProceedToStep: (step: number) => boolean;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onSubmit: () => Promise<void>;
  submittingBooking: boolean;
  isProcessing: boolean;
  paymentMethod: string;
  receiptFile: File | null;
}

const AgentBookingNavigation: React.FC<AgentBookingNavigationProps> = ({
  currentStep,
  canProceedToStep,
  onPreviousStep,
  onNextStep,
  onSubmit,
  submittingBooking,
  isProcessing,
  paymentMethod,
  receiptFile
}) => {
  return (
    <div className="flex justify-between">
      <Button
        variant="ghost"
        onClick={onPreviousStep}
        disabled={currentStep === 1}
        className="flex items-center space-x-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Previous</span>
      </Button>

      {currentStep < 5 ? (
        <Button
          onClick={onNextStep}
          disabled={!canProceedToStep(currentStep + 1)}
          className="flex items-center space-x-2"
        >
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={!canProceedToStep(5) || submittingBooking || (paymentMethod === 'cash' && !receiptFile) || isProcessing}
          className="px-8 py-3 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isProcessing ? 'Processing VIP Booking...' : submittingBooking ? 'Submitting...' : 'Submit VIP Agent Booking'}
        </Button>
      )}
    </div>
  );
};

export default AgentBookingNavigation;