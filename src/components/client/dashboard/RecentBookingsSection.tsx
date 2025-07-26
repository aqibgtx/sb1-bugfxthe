import React from 'react';
import { motion } from 'framer-motion';
import Card from '../../ui/Card';
import RecentBookingItem from './RecentBookingItem';

interface RecentBookingsSectionProps {
  bookings: any[];
  loading?: boolean;
}

const RecentBookingsSection: React.FC<RecentBookingsSectionProps> = ({ 
  bookings, 
  loading 
}) => {
  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">My Recent Bookings</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-16"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">My Recent Bookings</h3>
      <div className="space-y-4">
        {bookings.length > 0 ? (
          bookings.map((booking, index) => (
            <RecentBookingItem
              key={booking.id}
              booking={booking}
              index={index}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No bookings yet</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentBookingsSection;