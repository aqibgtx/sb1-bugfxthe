import React from 'react';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import Card from '../ui/Card';
import { OverdueBooking } from '../../types/overdue';

interface OverdueTrackingStatsProps {
  overdueBookings: OverdueBooking[];
}

const OverdueTrackingStats: React.FC<OverdueTrackingStatsProps> = ({ overdueBookings }) => {
  const criticalBookings = overdueBookings.filter(b => b.severity === 'critical').length;
  const totalFees = overdueBookings.reduce((sum, b) => sum + b.overdue_fee, 0);

  return (
    <div className="mobile-grid">
      <Card className="text-center mobile-card">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-red-500 rounded-full">
            <AlertTriangle className="w-5 md:w-6 h-5 md:h-6 text-white" />
          </div>
        </div>
        <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
          {overdueBookings.length}
        </div>
        <div className="text-gray-700 text-xs md:text-sm">Overdue Unreturned Cars</div>
      </Card>

      <Card className="text-center mobile-card">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-yellow-500 rounded-full">
            <Clock className="w-5 md:w-6 h-5 md:h-6 text-white" />
          </div>
        </div>
        <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
          {criticalBookings}
        </div>
        <div className="text-gray-700 text-xs md:text-sm">Critical (48+ hours)</div>
      </Card>

      <Card className="text-center mobile-card">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-green-500 rounded-full">
            <DollarSign className="w-5 md:w-6 h-5 md:h-6 text-white" />
          </div>
        </div>
        <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
          RM {totalFees.toFixed(2)}
        </div>
        <div className="text-gray-700 text-xs md:text-sm">Total Overdue Fees</div>
      </Card>
    </div>
  );
};

export default OverdueTrackingStats;