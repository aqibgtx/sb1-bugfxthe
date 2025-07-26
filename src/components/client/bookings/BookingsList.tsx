import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import Card from '../../ui/Card';
import BookingCard from './BookingCard';

interface BookingsListProps {
  bookings: any[];
  onViewDetails: (booking: any) => void;
  onUploadPayment: (bookingId: string) => void;
  loading?: boolean;
}

const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  onViewDetails,
  onUploadPayment,
  loading
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <Card>
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Bookings Found</h3>
        <p className="text-gray-700">No bookings match your current filter. Try selecting a different status or contact our staff to make a booking.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {bookings.map((booking, index) => (
        <motion.div
          key={booking.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <BookingCard
            booking={booking}
            onViewDetails={onViewDetails}
            onUploadPayment={onUploadPayment}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default BookingsList;