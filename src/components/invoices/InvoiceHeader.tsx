import React from 'react';
import { Car } from 'lucide-react';

interface InvoiceHeaderProps {
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({ companyInfo }) => {
  return (
    <div className="flex justify-between items-center pb-[4%] border-b border-gray-200">
      {/* Logo - 25% width, max 80px */}
      <div className="w-1/4 max-w-[80px] flex items-center">
        <div className="p-2 bg-[#1E88E5] rounded-lg shadow-lg">
          <Car className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
      </div>

      {/* Company Info - 70% width, right aligned */}
      <div className="w-[70%] text-right">
        <h2 className="font-semibold text-sm sm:text-lg text-[#333333] mb-1 font-['Inter'] leading-[1.5]">
          {companyInfo.name}
        </h2>
        <div className="text-xs sm:text-sm text-[#333333] space-y-0.5 font-['Inter'] leading-[1.6]">
          <div>{companyInfo.address}</div>
          <div>{companyInfo.phone}</div>
          <div>{companyInfo.email}</div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;