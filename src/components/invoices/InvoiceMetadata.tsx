import React from 'react';

interface InvoiceMetadataProps {
  invoiceNumber: string;
  invoiceDate: string;
  status: 'paid' | 'due' | 'pending' | 'overdue';
  bookingNumber?: string;
}

const InvoiceMetadata: React.FC<InvoiceMetadataProps> = ({
  invoiceNumber,
  invoiceDate,
  status,
  bookingNumber
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-[#28A745] text-white';
      case 'due':
      case 'overdue':
        return 'bg-[#DC3545] text-white';
      case 'pending':
        return 'bg-[#1E88E5] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'PAID';
      case 'due':
        return 'DUE';
      case 'overdue':
        return 'OVERDUE';
      case 'pending':
        return 'PENDING';
      default:
        return 'UNKNOWN';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-[4%] sm:mb-[6%]">
      {/* Invoice Number & Date - Mobile: 100% width, Tablet+: 50% width */}
      <div className="w-full sm:w-1/2 space-y-2">
        <div className="font-semibold text-sm sm:text-lg text-[#333333] font-['Inter'] leading-[1.4]">
          Invoice #{invoiceNumber}
        </div>
        <div className="font-semibold text-sm sm:text-lg text-[#333333] font-['Inter'] leading-[1.4]">
          Date: {invoiceDate}
        </div>
        {bookingNumber && (
          <div className="font-semibold text-sm sm:text-lg text-[#333333] font-['Inter'] leading-[1.4]">
            Booking: {bookingNumber}
          </div>
        )}
      </div>

      {/* Status Badge - Mobile: 100% width, Tablet+: 50% width, right aligned */}
      <div className="w-full sm:w-1/2 sm:text-right">
        <span className={`inline-block px-2 py-1 text-xs sm:text-sm font-semibold rounded font-['Inter'] ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </span>
      </div>
    </div>
  );
};

export default InvoiceMetadata;