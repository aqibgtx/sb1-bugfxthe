import React from 'react';
import { formatDate, formatDateTime, formatTime, formatRelativeTime, formatDateForDisplay } from '../../lib/utils';

interface DateTimeDisplayProps {
  date: string | Date;
  format?: 'date' | 'datetime' | 'time' | 'relative' | 'smart';
  className?: string;
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Component for displaying dates and times consistently in Malaysia timezone
 */
const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({ 
  date, 
  format = 'date', 
  className = '',
  options 
}) => {
  const getFormattedDate = () => {
    switch (format) {
      case 'datetime':
        return formatDateTime(date, options);
      case 'time':
        return formatTime(date, options);
      case 'relative':
        return formatRelativeTime(date);
      case 'smart':
        return formatDateForDisplay(date);
      case 'date':
      default:
        return formatDate(date, options);
    }
  };

  return (
    <span className={className} title={formatDateTime(date)}>
      {getFormattedDate()}
    </span>
  );
};

export default DateTimeDisplay;