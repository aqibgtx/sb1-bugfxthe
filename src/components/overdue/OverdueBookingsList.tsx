import React from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import OverdueBookingCard from './OverdueBookingCard';
import { OverdueBooking } from '../../types/overdue';

interface OverdueBookingsListProps {
  overdueBookings: OverdueBooking[];
  onViewDetails: (booking: OverdueBooking) => void;
  onContactCustomer: (booking: OverdueBooking) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const OverdueBookingsList: React.FC<OverdueBookingsListProps> = ({
  overdueBookings,
  onViewDetails,
  onContactCustomer,
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (overdueBookings.length === 0) {
    return (
      <Card className="text-center py-12 mobile-card">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">No Overdue Unreturned Rentals</h3>
        <p className="text-gray-700 text-sm md:text-base">All your handed-over rentals are either on time or have been returned.</p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-xs md:text-sm">
            <strong>Note:</strong> This tracks only vehicles that have been handed over to customers but NOT yet returned. 
            Once a car is returned, it will no longer appear here regardless of any late fees.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mobile-spacing">
        {overdueBookings.map((booking, index) => (
          <OverdueBookingCard
            key={booking.id}
            booking={booking}
            index={index}
            onViewDetails={onViewDetails}
            onContactCustomer={onContactCustomer}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Card className="mobile-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="touch-target"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              
              {/* Page numbers */}
              <div className="hidden sm:flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      className="touch-target"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="touch-target"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OverdueBookingsList;