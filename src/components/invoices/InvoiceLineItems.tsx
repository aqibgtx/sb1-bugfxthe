import React from 'react';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceLineItemsProps {
  items: LineItem[];
}

const InvoiceLineItems: React.FC<InvoiceLineItemsProps> = ({ items }) => {
  return (
    <div className="mb-[4%] sm:mb-[6%]">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[#E0E0E0] text-xs sm:text-sm font-semibold text-[#333333] font-['Inter'] leading-[1.5]">
        <div className="col-span-6 text-left">Description</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Rate</div>
        <div className="col-span-2 text-right">Amount</div>
      </div>

      {/* Table Rows */}
      <div className="space-y-0">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 py-2 text-xs sm:text-sm text-[#333333] font-['Inter'] leading-[1.6]">
            <div className="col-span-6 text-left">{item.description}</div>
            <div className="col-span-2 text-center">{item.quantity}</div>
            <div className="col-span-2 text-right">RM {item.rate.toFixed(2)}</div>
            <div className="col-span-2 text-right font-medium">RM {item.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceLineItems;