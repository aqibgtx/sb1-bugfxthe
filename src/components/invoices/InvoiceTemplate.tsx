import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import InvoiceMetadata from './InvoiceMetadata';
import InvoiceDetails from './InvoiceDetails';
import InvoiceLineItems from './InvoiceLineItems';
import InvoiceSummary from './InvoiceSummary';
import InvoicePaymentInstructions from './InvoicePaymentInstructions';
import InvoiceFooter from './InvoiceFooter';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  bookingNumber?: string;
  status: 'paid' | 'due' | 'pending' | 'overdue';
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  car: {
    name: string;
    plateNumber: string;
  };
  booking: {
    startDate: string;
    endDate: string;
    totalDays: number;
    bookingFor?: string;
    deliveryType?: string;
    deliveryDistance?: number;
    hasDelivery?: boolean;
    requiresDeposit?: boolean;
    isLateReturn?: boolean;
    actualReturnTime?: string;
    isAgentBooking?: boolean;
    customPriceRequested?: number;
    agentNotes?: string;
  };
  delivery?: {
    address?: string;
    pickupAddress?: string;
  } | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  accountDetails?: string;
  dueDate?: string;
  terms?: string;
  notes?: string;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  className?: string;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, className = '' }) => {
  const companyInfo = {
    name: 'Budget Plus Rental',
    address: 'Kuala Lumpur, Malaysia',
    phone: '+60 12-345 6789',
    email: 'info@budgetplusrental.com'
  };

  return (
    <div className={`w-full bg-white ${className}`}>
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-container {
            margin: 10mm;
            font-size: 10pt;
          }
          
          .print-container h1,
          .print-container h2,
          .print-container h3 {
            font-size: 12pt;
          }
          
          .print-container {
            page-break-inside: avoid;
          }
          
          .print-row {
            page-break-inside: avoid;
          }
        }
        
        @media (min-width: 576px) {
          .invoice-container {
            max-width: 600px;
          }
        }
        
        @media (min-width: 992px) {
          .invoice-container {
            max-width: 800px;
            padding: 6% 8%;
          }
        }
      `}</style>

      <div className="print-container invoice-container mx-auto p-[4%] sm:p-[6%_8%] font-['Inter'] text-[#333333] leading-relaxed">
        <InvoiceHeader companyInfo={companyInfo} />
        
        <InvoiceMetadata
          invoiceNumber={data.invoiceNumber}
          invoiceDate={data.invoiceDate}
          bookingNumber={data.bookingNumber}
          status={data.status}
        />

        {/* Special Notices */}
        {data.booking.isAgentBooking && (
          <div className="mb-[4%] sm:mb-[6%] p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-purple-800 font-semibold mb-2 flex items-center text-xs sm:text-sm font-['Inter']">
              🌟 VIP Agent Booking
            </h4>
            <p className="text-purple-700 text-xs sm:text-sm font-['Inter'] leading-[1.6]">
              This is a special VIP booking created by our staff member.
            </p>
            {data.booking.customPriceRequested && (
              <p className="text-purple-700 text-xs sm:text-sm mt-1 font-['Inter'] leading-[1.6]">
                Custom price requested: RM{data.booking.customPriceRequested}
              </p>
            )}
            {data.booking.agentNotes && (
              <p className="text-purple-700 text-xs sm:text-sm mt-1 font-['Inter'] leading-[1.6]">
                Agent notes: {data.booking.agentNotes}
              </p>
            )}
          </div>
        )}

        {data.booking.isLateReturn && (
          <div className="mb-[4%] sm:mb-[6%] p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-yellow-800 font-semibold mb-2 flex items-center text-xs sm:text-sm font-['Inter']">
              ⚠️ Late Return Detected
            </h4>
            <p className="text-yellow-700 text-xs sm:text-sm font-['Inter'] leading-[1.6]">
              This booking was returned after the scheduled return date. Late fees have been applied as per our terms and conditions.
            </p>
            {data.booking.actualReturnTime && (
              <p className="text-yellow-700 text-xs sm:text-sm mt-1 font-['Inter'] leading-[1.6]">
                Actual return date: {data.booking.actualReturnTime}
              </p>
            )}
          </div>
        )}

        {data.booking.hasDelivery && (
          <div className="mb-[4%] sm:mb-[6%] p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-blue-800 font-semibold mb-2 flex items-center text-xs sm:text-sm font-['Inter']">
              🚚 Delivery Service Included
            </h4>
            <div className="text-blue-700 text-xs sm:text-sm space-y-1 font-['Inter'] leading-[1.6]">
              <p>Delivery Type: {data.booking.deliveryType === 'free_pickup' ? 'Free Pickup Service' : 
                                data.booking.deliveryType === 'vip_delivery' ? 'VIP Delivery Service' : 'Delivery Service'}</p>
              {data.booking.deliveryDistance && data.booking.deliveryDistance > 0 && (
                <p>Distance: {data.booking.deliveryDistance} km</p>
              )}
              {data.delivery?.address && (
                <p>Delivery Address: {data.delivery.address}</p>
              )}
              {data.delivery?.pickupAddress && data.delivery.pickupAddress !== data.delivery.address && (
                <p>Pickup Address: {data.delivery.pickupAddress}</p>
              )}
            </div>
          </div>
        )}
        
        <InvoiceDetails
          customer={data.customer}
          car={data.car}
          booking={data.booking}
          delivery={data.delivery}
        />
        
        <InvoiceLineItems items={data.lineItems} />
        
        <InvoiceSummary
          subtotal={data.subtotal}
          tax={data.tax}
          total={data.total}
        />
        
        <InvoicePaymentInstructions
          paymentMethod={data.paymentMethod}
          accountDetails={data.accountDetails}
          dueDate={data.dueDate}
        />
        
        <InvoiceFooter
          terms={data.terms}
          notes={data.notes}
        />
      </div>
    </div>
  );
};

export default InvoiceTemplate;