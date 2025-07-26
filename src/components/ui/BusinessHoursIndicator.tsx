import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useMalaysiaTime } from '../../hooks/useMalaysiaTime';

interface BusinessHoursIndicatorProps {
  className?: string;
  showTime?: boolean;
}

/**
 * Component to display current business hours status in Malaysia timezone
 */
const BusinessHoursIndicator: React.FC<BusinessHoursIndicatorProps> = ({ 
  className = '', 
  showTime = true 
}) => {
  const { formattedTime, businessHours } = useMalaysiaTime();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {businessHours.isOpen ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      
      <div className="flex flex-col">
        {showTime && (
          <span className="text-sm font-medium text-gray-900">
            {formattedTime}
          </span>
        )}
        <span className={`text-xs ${businessHours.isOpen ? 'text-green-600' : 'text-red-600'}`}>
          {businessHours.message}
        </span>
      </div>
    </div>
  );
};

export default BusinessHoursIndicator;