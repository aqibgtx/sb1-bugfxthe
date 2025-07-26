import React from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface OverdueTrackingHeaderProps {
  onRefresh: () => void;
  loading: boolean;
  refreshing: boolean;
}

const OverdueTrackingHeader: React.FC<OverdueTrackingHeaderProps> = ({
  onRefresh,
  loading,
  refreshing
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Overdue Fee Tracking</h1>
        <p className="text-gray-700 text-sm md:text-base">
          Monitor all overdue rentals that haven't been returned yet. Track additional charges (10% per hour) for unreturned vehicles.
        </p>
      </div>
      <Button
        onClick={onRefresh}
        variant="ghost"
        className="flex items-center space-x-2 self-start sm:self-auto touch-target"
        disabled={loading || refreshing}
      >
        <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
      </Button>
    </div>
  );
};

export default OverdueTrackingHeader;