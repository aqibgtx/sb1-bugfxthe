import React from 'react';
import { Crown, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface AgentBookingHeaderProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

const AgentBookingHeader: React.FC<AgentBookingHeaderProps> = ({
  onRefresh,
  refreshing
}) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">VIP Agent Booking</h1>
        </div>
        <p className="text-gray-700">Create premium VIP bookings with custom pricing and special handling</p>
      </div>
      <Button
        onClick={onRefresh}
        disabled={refreshing}
        variant="secondary"
        className="flex items-center space-x-2"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
      </Button>
    </div>
  );
};

export default AgentBookingHeader; 