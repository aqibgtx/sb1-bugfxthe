import React from 'react';
import { motion } from 'framer-motion';
import StatusBadge from '../../ui/StatusBadge';

interface RecentBookingItemProps {
  booking: any;
  index: number;
}

const RecentBookingItem: React.FC<RecentBookingItemProps> = ({ booking, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <span className="font-mono text-gray-900">#{booking.booking_number}</span>
          <StatusBadge status={booking.payment_status as any} />
        </div>
        <div className="text-gray-700 text-sm">
          <p>{booking.car?.brand} {booking.car?.make} • Started {new Date(booking.start_date).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-gray-900 font-medium">RM {booking.total_amount}</p>
        <p className="text-gray-600 text-sm">{booking.total_days} days</p>
      </div>
    </motion.div>
  );
};

export default RecentBookingItem;