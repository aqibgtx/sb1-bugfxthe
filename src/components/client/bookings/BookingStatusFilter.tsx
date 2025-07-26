import React from 'react';
import { motion } from 'framer-motion';
import Button from '../../ui/Button';

interface BookingStatusFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: Record<string, number>;
}

const BookingStatusFilter: React.FC<BookingStatusFilterProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  const filters = [
    { key: 'all', label: 'All Bookings', count: counts.all || 0 },
    { key: 'pending', label: 'Pending', count: counts.pending || 0 },
    { key: 'approved', label: 'Approved', count: counts.approved || 0 },
    { key: 'completed', label: 'Completed', count: counts.completed || 0 },
    { key: 'cancelled', label: 'Cancelled', count: counts.cancelled || 0 }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((filter, index) => (
        <motion.div
          key={filter.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Button
            variant={activeFilter === filter.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(filter.key)}
            className="flex items-center space-x-2 min-h-[44px]"
          >
            <span>{filter.label}</span>
            {filter.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeFilter === filter.key 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {filter.count}
              </span>
            )}
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

export default BookingStatusFilter;