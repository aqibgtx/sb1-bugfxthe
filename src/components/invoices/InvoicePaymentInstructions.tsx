import React from 'react';

interface InvoicePaymentInstructionsProps {
  paymentMethod: string;
  accountDetails?: string;
  dueDate?: string;
}

const InvoicePaymentInstructions: React.FC<InvoicePaymentInstructionsProps> = ({
  paymentMethod,
  accountDetails,
  dueDate
}) => {
  return (
    <div className="mb-[6%] sm:mb-[6%]">
      <div className="text-xs sm:text-sm text-[#333333] font-['Inter'] leading-[1.6] space-y-1">
        <p>Please pay via {paymentMethod}</p>
        {accountDetails && <p>{accountDetails}</p>}
        {dueDate && (
          <p className="font-medium">
            Payment due by: {dueDate}
          </p>
        )}
        <p className="text-xs text-[#888888] mt-2">
          Please include your invoice number in the payment reference.
        </p>
      </div>
    </div>
  );
};

export default InvoicePaymentInstructions;