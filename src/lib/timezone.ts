// Malaysia timezone utilities
// Malaysia Standard Time (MST) is UTC+8

export const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';
export const MALAYSIA_UTC_OFFSET = 8;

/**
 * Get current date and time in Malaysia timezone
 */
export function getMalaysiaTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: MALAYSIA_TIMEZONE }));
}

/**
 * Convert any date to Malaysia timezone
 */
export function toMalaysiaTime(date: string | Date): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return new Date(inputDate.toLocaleString("en-US", { timeZone: MALAYSIA_TIMEZONE }));
}

/**
 * Format date in Malaysia timezone for display
 */
export function formatMalaysiaDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  
  return inputDate.toLocaleDateString('en-MY', defaultOptions);
}

/**
 * Format date and time in Malaysia timezone for display
 */
export function formatMalaysiaDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  return inputDate.toLocaleString('en-MY', defaultOptions);
}

/**
 * Format time only in Malaysia timezone
 */
export function formatMalaysiaTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: MALAYSIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  return inputDate.toLocaleString('en-MY', defaultOptions);
}

/**
 * Get Malaysia date string for input fields (YYYY-MM-DD)
 */
export function getMalaysiaDateString(date?: string | Date): string {
  const inputDate = date ? (typeof date === 'string' ? new Date(date) : date) : getMalaysiaTime();
  const malaysiaDate = toMalaysiaTime(inputDate);
  
  return malaysiaDate.toISOString().split('T')[0];
}

/**
 * Get Malaysia datetime string for input fields (YYYY-MM-DDTHH:mm)
 */
export function getMalaysiaDateTimeString(date?: string | Date): string {
  const inputDate = date ? (typeof date === 'string' ? new Date(date) : date) : getMalaysiaTime();
  const malaysiaDate = toMalaysiaTime(inputDate);
  
  // Format for datetime-local input
  const year = malaysiaDate.getFullYear();
  const month = String(malaysiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(malaysiaDate.getDate()).padStart(2, '0');
  const hours = String(malaysiaDate.getHours()).padStart(2, '0');
  const minutes = String(malaysiaDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert Malaysia time to UTC for database storage
 */
export function malaysiaTimeToUTC(date: string | Date): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // If the date doesn't have timezone info, assume it's Malaysia time
  if (typeof date === 'string' && !date.includes('T') && !date.includes('Z')) {
    // Date string without time, assume start of day in Malaysia
    const malaysiaDateTime = new Date(`${date}T00:00:00`);
    return new Date(malaysiaDateTime.getTime() - (MALAYSIA_UTC_OFFSET * 60 * 60 * 1000));
  }
  
  return inputDate;
}

/**
 * Get relative time string in Malaysia timezone
 */
export function getRelativeTime(date: string | Date): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const now = getMalaysiaTime();
  const malaysiaDate = toMalaysiaTime(inputDate);
  
  const diffMs = now.getTime() - malaysiaDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return formatMalaysiaDate(malaysiaDate);
  }
}

/**
 * Check if a date is today in Malaysia timezone
 */
export function isToday(date: string | Date): boolean {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const today = getMalaysiaTime();
  const malaysiaDate = toMalaysiaTime(inputDate);
  
  return malaysiaDate.toDateString() === today.toDateString();
}

/**
 * Check if a date is yesterday in Malaysia timezone
 */
export function isYesterday(date: string | Date): boolean {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const yesterday = getMalaysiaTime();
  yesterday.setDate(yesterday.getDate() - 1);
  const malaysiaDate = toMalaysiaTime(inputDate);
  
  return malaysiaDate.toDateString() === yesterday.toDateString();
}

/**
 * Get business hours status in Malaysia timezone
 */
export function getBusinessHoursStatus(): { isOpen: boolean; message: string } {
  const now = getMalaysiaTime();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Business hours: Monday-Friday 9AM-6PM, Saturday 9AM-1PM
  const isWeekday = day >= 1 && day <= 5;
  const isSaturday = day === 6;
  const isSunday = day === 0;
  
  if (isSunday) {
    return { isOpen: false, message: 'Closed on Sundays' };
  }
  
  if (isWeekday && hour >= 9 && hour < 18) {
    return { isOpen: true, message: 'Open until 6:00 PM' };
  }
  
  if (isSaturday && hour >= 9 && hour < 13) {
    return { isOpen: true, message: 'Open until 1:00 PM' };
  }
  
  // Determine next opening time
  if (isWeekday && hour < 9) {
    return { isOpen: false, message: 'Opens at 9:00 AM' };
  } else if (isWeekday && hour >= 18) {
    return { isOpen: false, message: 'Opens tomorrow at 9:00 AM' };
  } else if (isSaturday && hour < 9) {
    return { isOpen: false, message: 'Opens at 9:00 AM' };
  } else if (isSaturday && hour >= 13) {
    return { isOpen: false, message: 'Opens Monday at 9:00 AM' };
  }
  
  return { isOpen: false, message: 'Opens Monday at 9:00 AM' };
}

/**
 * Calculate duration between two dates in Malaysia timezone
 */
export function calculateDuration(startDate: string | Date, endDate: string | Date): {
  days: number;
  hours: number;
  minutes: number;
  totalHours: number;
} {
  const start = toMalaysiaTime(startDate);
  const end = toMalaysiaTime(endDate);
  
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, totalHours };
}

/**
 * Add days to a date in Malaysia timezone
 */
export function addDaysInMalaysiaTime(date: string | Date, days: number): Date {
  const malaysiaDate = toMalaysiaTime(date);
  malaysiaDate.setDate(malaysiaDate.getDate() + days);
  return malaysiaDate;
}

/**
 * Get start of day in Malaysia timezone
 */
export function getStartOfDayMalaysia(date?: string | Date): Date {
  const inputDate = date ? toMalaysiaTime(date) : getMalaysiaTime();
  inputDate.setHours(0, 0, 0, 0);
  return inputDate;
}

/**
 * Get end of day in Malaysia timezone
 */
export function getEndOfDayMalaysia(date?: string | Date): Date {
  const inputDate = date ? toMalaysiaTime(date) : getMalaysiaTime();
  inputDate.setHours(23, 59, 59, 999);
  return inputDate;
}

/**
 * Check if a booking is overdue based on Malaysia timezone
 */
export function isBookingOverdue(endDate: string | Date): boolean {
  const now = getMalaysiaTime();
  const bookingEnd = getEndOfDayMalaysia(endDate);
  return now > bookingEnd;
}

/**
 * Get overdue hours in Malaysia timezone
 */
export function getOverdueHours(endDate: string | Date): number {
  const now = getMalaysiaTime();
  const bookingEnd = getEndOfDayMalaysia(endDate);
  
  if (now <= bookingEnd) return 0;
  
  const diffMs = now.getTime() - bookingEnd.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}