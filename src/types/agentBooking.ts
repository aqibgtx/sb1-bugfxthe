export interface AgentBookingData {
  selectedCar: any;
  selectedCustomer: any;
  customPriceRequested: number;
  agentNotes: string;
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
}

export interface AgentBookingState {
  currentStep: number;
  loading: boolean;
  submittingBooking: boolean;
  refreshing: boolean;
  receiptUploaded: boolean;
  receiptUrl: string;
  showEnhancedModal: boolean;
  enhancedModalData: {
    bookingData?: any;
    invoiceData?: any;
  };
  isProcessing: boolean;
  cars: any[];
  customers: any[];
  addOns: any[];
}

export interface AgentBookingActions {
  handleCarSelect: (car: any) => void;
  handleDaysChange: (increment: boolean) => void;
  handleAddOnToggle: (addOn: any) => void;
  updateAddOnQuantity: (addOnId: string, quantity: number) => void;
  handleDeliveryKmChange: (km: number) => void;
  calculateTotal: () => number;
  handleReceiptFileSelect: (file: File) => void;
  handleSubmitAgentBookingRequest: () => Promise<void>;
  resetForm: () => void;
  handleCloseEnhancedModal: () => void;
  canProceedToStep: (step: number) => boolean;
  handleRefresh: () => Promise<void>;
}