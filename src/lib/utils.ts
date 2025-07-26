import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
  formatMalaysiaDate, 
  formatMalaysiaDateTime, 
  formatMalaysiaTime,
  getRelativeTime,
  getMalaysiaTime,
  getMalaysiaDateString,
  getMalaysiaDateTimeString,
  isToday,
  isYesterday
} from './timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced date formatting utilities with Malaysia timezone
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return formatMalaysiaDate(date, options);
}

export function formatDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return formatMalaysiaDateTime(date, options);
}

export function formatTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return formatMalaysiaTime(date, options);
}

export function formatRelativeTime(date: string | Date): string {
  return getRelativeTime(date);
}

export function getCurrentTime(): Date {
  return getMalaysiaTime();
}

export function getCurrentDateString(): string {
  return getMalaysiaDateString();
}

export function getCurrentDateTimeString(): string {
  return getMalaysiaDateTimeString();
}

export function formatDateForDisplay(date: string | Date): string {
  if (isToday(date)) {
    return `Today, ${formatTime(date)}`;
  } else if (isYesterday(date)) {
    return `Yesterday, ${formatTime(date)}`;
  } else {
    return formatDateTime(date);
  }
}