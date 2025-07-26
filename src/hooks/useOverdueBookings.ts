import { useState, useEffect, useCallback } from 'react';
import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../context/AuthContext';
import { OverdueBooking } from '../types/overdue';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 15;

export const useOverdueBookings = () => {
  const { user } = useAuth();
  const { fetchBookings } = useSupabaseData();
  
  const [overdueBookings, setOverdueBookings] = useState<OverdueBooking[]>([]);
  const [allOverdueBookings, setAllOverdueBookings] = useState<OverdueBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const calculateOverdueFeeFromBookings = useCallback((
    handoverTime: string, 
    totalDays: number, 
    dailyRate: number
  ): { hoursOverdue: number; fee: number; severity: 'warning' | 'critical'; expectedReturn: Date } => {
    const now = new Date();
    const handover = new Date(handoverTime);
    
    // Calculate expected return time: handover time + total rental days
    const expectedReturn = new Date(handover);
    expectedReturn.setDate(expectedReturn.getDate() + totalDays);
    
    // Only calculate overdue if current time is past expected return
    const diffMs = Math.max(0, now.getTime() - expectedReturn.getTime());
    const hoursOverdue = diffMs / (1000 * 60 * 60);
    
    // 10% of daily rate per hour
    const hourlyRate = dailyRate * 0.1;
    const fee = Math.ceil(hoursOverdue) * hourlyRate;
    
    const severity = hoursOverdue >= 48 ? 'critical' : 'warning'; // 48+ hours = critical
    
    return { hoursOverdue, fee, severity, expectedReturn };
  }, []);

  const loadOverdueBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: bookings } = await fetchBookings();
      
      const overdueList: OverdueBooking[] = [];
      
      // Filter for overdue bookings using ONLY bookings table columns:
      // 1. Have been handed over (handover_marked = true)
      // 2. Have NOT been returned yet (return_marked = false) 
      // 3. Are past their expected return time (calculated from handover_time + total_days)
      // 4. Belong to this staff member (staff_id = user.id)
      bookings.forEach(booking => {
        if (
          booking.handover_marked && // Must be handed over
          booking.handover_time && // Must have handover time
          !booking.return_marked && // NOT yet returned (key requirement!)
          booking.staff_id === user?.id // Staff's own bookings
        ) {
          const dailyRate = booking.rental_amount / booking.total_days;
          const overdueCalc = calculateOverdueFeeFromBookings(
            booking.handover_time, 
            booking.total_days, 
            dailyRate
          );
          
          // Only include if actually overdue (past expected return time)
          if (overdueCalc.hoursOverdue > 0) {
            overdueList.push({
              id: booking.id,
              booking_number: booking.booking_number,
              customer: booking.customer,
              car: booking.car,
              start_date: booking.start_date,
              end_date: booking.end_date,
              total_days: booking.total_days,
              rental_amount: booking.rental_amount,
              daily_rate: dailyRate,
              payment_status: booking.payment_status,
              booking_status: booking.booking_status,
              return_marked: booking.return_marked,
              handover_time: booking.handover_time,
              handover_marked: booking.handover_marked,
              created_at: booking.created_at,
              hours_overdue: overdueCalc.hoursOverdue,
              overdue_fee: overdueCalc.fee,
              severity: overdueCalc.severity,
              expected_return_time: overdueCalc.expectedReturn.toISOString()
            });
          }
        }
      });
      
      // Sort by severity and hours overdue
      overdueList.sort((a, b) => {
        if (a.severity === 'critical' && b.severity === 'warning') return -1;
        if (a.severity === 'warning' && b.severity === 'critical') return 1;
        return b.hours_overdue - a.hours_overdue;
      });
      
      setAllOverdueBookings(overdueList);
      
      // Calculate pagination
      const totalItems = overdueList.length;
      const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      setTotalPages(pages);
      
      // Get current page items
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedBookings = overdueList.slice(startIndex, endIndex);
      
      setOverdueBookings(paginatedBookings);
    } catch (error) {
      console.error('Error loading overdue bookings:', error);
      toast.error('Failed to load overdue bookings');
    } finally {
      setLoading(false);
    }
  }, [fetchBookings, user?.id, currentPage, calculateOverdueFeeFromBookings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOverdueBookings();
      toast.success('Overdue tracking refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [loadOverdueBookings]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      
      // Update displayed bookings for new page
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedBookings = allOverdueBookings.slice(startIndex, endIndex);
      setOverdueBookings(paginatedBookings);
    }
  }, [totalPages, allOverdueBookings]);

  const handleContactCustomer = useCallback((booking: OverdueBooking) => {
    const subject = encodeURIComponent(`Overdue Rental - Booking #${booking.booking_number}`);
    const body = encodeURIComponent(
      `Dear ${booking.customer.name},\n\n` +
      `Your rental of ${booking.car.brand} ${booking.car.make} (${booking.car.plate_number}) ` +
      `was handed over on ${new Date(booking.handover_time).toLocaleDateString()} ` +
      `and was due for return ${Math.ceil(booking.hours_overdue)} hours ago.\n\n` +
      `The vehicle is now overdue, resulting in additional charges of RM${booking.overdue_fee.toFixed(2)}.\n\n` +
      `Please contact us immediately to arrange return or payment.\n\n` +
      `Thank you.`
    );
    
    window.location.href = `mailto:${booking.customer.email}?subject=${subject}&body=${body}`;
  }, []);

  useEffect(() => {
    loadOverdueBookings();
  }, [loadOverdueBookings]);

  // Update pagination when page changes
  useEffect(() => {
    if (allOverdueBookings.length > 0) {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedBookings = allOverdueBookings.slice(startIndex, endIndex);
      setOverdueBookings(paginatedBookings);
    }
  }, [currentPage, allOverdueBookings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setOverdueBookings([]);
      setAllOverdueBookings([]);
    };
  }, []);

  return {
    overdueBookings,
    loading,
    refreshing,
    currentPage,
    totalPages,
    handleRefresh,
    handleContactCustomer,
    handlePageChange
  };
};