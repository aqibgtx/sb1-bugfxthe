import { useState, useEffect } from 'react';
import { getMalaysiaTime, formatMalaysiaDateTime, getBusinessHoursStatus } from '../lib/timezone';

/**
 * Hook for real-time Malaysia time display
 */
export const useMalaysiaTime = (updateInterval = 1000) => {
  const [currentTime, setCurrentTime] = useState(getMalaysiaTime());
  const [formattedTime, setFormattedTime] = useState(formatMalaysiaDateTime(getMalaysiaTime()));
  const [businessHours, setBusinessHours] = useState(getBusinessHoursStatus());

  useEffect(() => {
    const updateTime = () => {
      const now = getMalaysiaTime();
      setCurrentTime(now);
      setFormattedTime(formatMalaysiaDateTime(now));
      setBusinessHours(getBusinessHoursStatus());
    };

    // Update immediately
    updateTime();

    // Set up interval for updates
    const interval = setInterval(updateTime, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return {
    currentTime,
    formattedTime,
    businessHours
  };
};

/**
 * Hook for Malaysia timezone date calculations
 */
export const useMalaysiaDateCalculations = () => {
  const { currentTime } = useMalaysiaTime();

  const isOverdue = (endDate: string | Date): boolean => {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    return currentTime > end;
  };

  const getDaysUntilDue = (dueDate: string | Date): number => {
    const due = new Date(dueDate);
    const diffTime = due.getTime() - currentTime.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getHoursOverdue = (endDate: string | Date): number => {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (currentTime <= end) return 0;
    
    const diffMs = currentTime.getTime() - end.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60));
  };

  return {
    currentTime,
    isOverdue,
    getDaysUntilDue,
    getHoursOverdue
  };
};