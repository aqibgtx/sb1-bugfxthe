import React from 'react';
import { HandHeart, RotateCcw } from 'lucide-react';
import Card from '../ui/Card';

interface EmptyStateCardProps {
  type: 'handover' | 'return';
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({ type }) => {
  return (
    <Card className="text-center py-12 border border-gray-200">
      <div className={`w-16 h-16 ${type === 'handover' ? 'bg-blue-500/20' : 'bg-green-500/20'} rounded-full flex items-center justify-center mx-auto mb-4`}>
        {type === 'handover' ? (
          <HandHeart className="w-8 h-8 text-blue-400" />
        ) : (
          <RotateCcw className="w-8 h-8 text-green-400" />
        )}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {type === 'handover' ? 'No Cars Ready for Handover' : 'No Active Rentals'}
      </h3>
      <p className="text-gray-700">
        {type === 'handover' 
          ? 'All approved bookings have been handed over or are awaiting approval.'
          : 'No cars have been handed over yet or all have been returned.'
        }
      </p>
      {type === 'return' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">
            <strong>Note:</strong> Only vehicles that you have personally handed over will appear here for return processing.
          </p>
        </div>
      )}
    </Card>
  );
};

export default EmptyStateCard;