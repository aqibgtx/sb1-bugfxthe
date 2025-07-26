import React from 'react';
import { Crown } from 'lucide-react';

const AgentBookingBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <Crown className="w-6 h-6 text-purple-600" />
        <div>
          <h3 className="text-purple-900 font-semibold">VIP Agent Booking Portal</h3>
          <p className="text-purple-700 text-sm">
            Special booking system for staff with custom pricing, priority handling, and enhanced features. Customer is pre-selected as the logged-in staff member.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentBookingBanner;