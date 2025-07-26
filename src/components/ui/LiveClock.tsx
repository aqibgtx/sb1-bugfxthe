import React from 'react';
import { Clock } from 'lucide-react';
import { useMalaysiaTime } from '../../hooks/useMalaysiaTime';

interface LiveClockProps {
  className?: string;
  showIcon?: boolean;
  format?: 'full' | 'time-only' | 'date-only';
}

/**
 * Live clock component showing Malaysia time
 */
const LiveClock: React.FC<LiveClockProps> = ({ 
  className = '', 
  showIcon = true,
  format = 'full'
}) => {
  const { currentTime, formattedTime } = useMalaysiaTime();

  const getDisplayTime = () => {
    switch (format) {
      case 'time-only':
        return currentTime.toLocaleTimeString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      case 'date-only':
        return currentTime.toLocaleDateString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'full':
      default:
        return formattedTime;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && <Clock className="w-4 h-4 text-gray-500" />}
      <span className="text-sm font-medium text-gray-900" title="Malaysia Standard Time (UTC+8)">
        {getDisplayTime()}
      </span>
    </div>
  );
};

export default LiveClock;