import React from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface BookingHeaderProps {
  title: string;
  description: string;
  onRefresh: () => void;
  refreshing: boolean;
}

const BookingHeader: React.FC<BookingHeaderProps> = ({
  title,
  description,
  onRefresh,
  refreshing
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-700 text-sm sm:text-base">{description}</p>
      </div>
      <Button
        onClick={onRefresh}
        disabled={refreshing}
        variant="secondary"
        className="flex items-center space-x-2 min-h-[44px] min-w-[44px] w-full sm:w-auto"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        <span className="sm:hidden">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
      </Button>
    </div>
  );
};

export default BookingHeader;