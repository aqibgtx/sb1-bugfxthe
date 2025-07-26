import React from 'react';

interface InvoiceSummaryProps {
  subtotal: number;
  tax?: number;
  total: number;
}

const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({
  subtotal,
  tax = 0,
  total
}) => {
  return (
    <div className="flex flex-col items-end mb-[4%] sm:mb-[6%]">
      <div className="w-full max-w-[40%] space-y-1">
        {/* Subtotal */}
        <div className="flex justify-between text-xs sm:text-sm text-[#333333] font-['Inter'] leading-[1.6]">
          <span>Subtotal:</span>
          <span>RM {subtotal.toFixed(2)}</span>
        </div>

        {/* Tax (if applicable) */}
        {tax > 0 && (
          <div className="flex justify-between text-xs sm:text-sm text-[#333333] font-['Inter'] leading-[1.6]">
            <span>Tax:</span>
            <span>RM {tax.toFixed(2)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-sm sm:text-lg font-semibold text-[#333333] pt-1 border-t border-[#E0E0E0] font-['Inter'] leading-[1.4]">
          <span>Total:</span>
          <span>RM {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSummary;