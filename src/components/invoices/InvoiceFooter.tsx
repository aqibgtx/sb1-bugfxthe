import React from 'react';

interface InvoiceFooterProps {
  terms?: string;
  notes?: string;
}

const InvoiceFooter: React.FC<InvoiceFooterProps> = ({
  terms,
  notes
}) => {
  return (
    <div className="mt-[4%] sm:mt-[6%] pt-[4%] border-t border-gray-200">
      <div className="text-center text-[10px] sm:text-xs text-[#888888] space-y-2 font-['Inter'] leading-[1.6]">
        {terms && (
          <div>
            <strong>Terms & Conditions:</strong> {terms}
          </div>
        )}
        {notes && (
          <div>
            <strong>Notes:</strong> {notes}
          </div>
        )}
        <div className="text-[10px] sm:text-xs text-[#888888] mt-4">
          Thank you for choosing Budget Plus Rental. Drive safe!
        </div>
      </div>
    </div>
  );
};

export default InvoiceFooter;