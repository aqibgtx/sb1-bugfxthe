import React from 'react';
import { HandHeart } from 'lucide-react';

const OverdueTrackingInfoBanner: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <HandHeart className="w-5 md:w-6 h-5 md:h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="text-blue-900 font-semibold text-sm md:text-base">Overdue Tracking Logic</h3>
          <p className="text-blue-700 text-xs md:text-sm">
            Shows all vehicles that have been handed over but NOT yet returned and are past their expected return time. 
            Expected return = handover time + rental duration. Uses only bookings table data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverdueTrackingInfoBanner;