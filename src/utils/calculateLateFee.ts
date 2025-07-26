import { getMalaysiaTime, toMalaysiaTime, getEndOfDayMalaysia } from '../lib/timezone';

/**
 * Calculate late fee for car returns
 * @param expectedReturn Expected return date/time
 * @param actualReturn Actual return date/time
 * @param dailyPrice Daily rental price
 * @returns Late fee amount
 */
export function calculateLateFee(
  expectedReturn: string | Date,
  actualReturn: string | Date,
  dailyPrice: number
): number {
  const expectedDate = toMalaysiaTime(expectedReturn);
  const actualDate = toMalaysiaTime(actualReturn);
  
  // Use end of day in Malaysia timezone
  const expectedEndOfDay = getEndOfDayMalaysia(expectedDate);
  
  // Calculate hours late (minimum 0)
  const diffMs = Math.max(0, actualDate.getTime() - expectedEndOfDay.getTime());
  const hoursLate = diffMs / (1000 * 60 * 60);
  
  // Calculate late fee: 10% of daily price per hour, rounded up
  const lateFee = Math.ceil(hoursLate) * dailyPrice * 0.1;
  
  return lateFee;
}

/**
 * Check if a return is late
 * @param expectedReturn Expected return date/time
 * @param actualReturn Actual return date/time
 * @returns Whether the return is late
 */
export function isReturnLate(
  expectedReturn: string | Date,
  actualReturn: string | Date
): boolean {
  const expectedDate = toMalaysiaTime(expectedReturn);
  const actualDate = toMalaysiaTime(actualReturn);
  
  // Use end of day in Malaysia timezone
  const expectedEndOfDay = getEndOfDayMalaysia(expectedDate);
  
  return actualDate > expectedEndOfDay;
}

/**
 * Get hours late for display
 * @param expectedReturn Expected return date/time
 * @param actualReturn Actual return date/time
 * @returns Hours late (0 if not late)
 */
export function getHoursLate(
  expectedReturn: string | Date,
  actualReturn: string | Date
): number {
  const expectedDate = toMalaysiaTime(expectedReturn);
  const actualDate = toMalaysiaTime(actualReturn);
  
  // Use end of day in Malaysia timezone
  const expectedEndOfDay = getEndOfDayMalaysia(expectedDate);
  
  const diffMs = Math.max(0, actualDate.getTime() - expectedEndOfDay.getTime());
  return diffMs / (1000 * 60 * 60);
}

/**
 * Calculate overdue fee based on handover time and rental duration
 * This function now properly accounts for booking extensions by using the current end_date
 * @param handoverTime When the car was handed over to customer
 * @param endDate The current end date of the booking (may be extended)
 * @param dailyRate Daily rental rate
 * @returns Overdue fee calculation
 */
export function calculateOverdueFeeFromBooking(
  handoverTime: string | Date,
  endDate: string | Date,
  dailyRate: number
): { hoursOverdue: number; fee: number; isOverdue: boolean } {
  const now = getMalaysiaTime();
  const handover = toMalaysiaTime(handoverTime);
  
  // Use the actual end_date from booking (which includes extensions)
  const expectedReturn = getEndOfDayMalaysia(toMalaysiaTime(endDate));
  
  // Calculate hours overdue (minimum 0)
  const diffMs = Math.max(0, now.getTime() - expectedReturn.getTime());
  const hoursOverdue = diffMs / (1000 * 60 * 60);
  
  // Calculate fee: 10% of daily rate per hour
  const hourlyRate = dailyRate * 0.1;
  const fee = Math.ceil(hoursOverdue) * hourlyRate;
  
  return {
    hoursOverdue,
    fee,
    isOverdue: hoursOverdue >= 1 // Mark as overdue if 1 hour or more
  };
}

/**
 * Calculate overdue fee based on handover time and rental duration (legacy function)
 * @deprecated Use calculateOverdueFeeFromBooking instead for better extension support
 */
export function calculateOverdueFeeFromHandover(
  handoverTime: string | Date,
  rentalDays: number,
  dailyRate: number
): { hoursOverdue: number; fee: number; isOverdue: boolean } {
  const handover = toMalaysiaTime(handoverTime);
  const expectedReturn = new Date(handover);
  expectedReturn.setDate(expectedReturn.getDate() + rentalDays);
  
  return calculateOverdueFeeFromBooking(handoverTime, expectedReturn, dailyRate);
}

/**
 * Format late fee for display
 * @param lateFee Late fee amount
 * @returns Formatted late fee string
 */
export function formatLateFee(lateFee: number): string {
  return `RM ${lateFee.toFixed(2)}`;
}

/**
 * Format duration in hours to days and hours
 * @param hours Total hours
 * @returns Formatted duration string
 */
export function formatDuration(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  
  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }
  return `${remainingHours}h`;
}