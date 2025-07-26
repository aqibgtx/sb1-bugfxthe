import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Car, Calendar, TrendingUp, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../context/AuthContext';
import { formatDateForDisplay } from '../../lib/utils';
import { getMalaysiaTime } from '../../lib/timezone';
import toast from 'react-hot-toast';

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { fetchBookings, fetchCars, batchFetch } = useSupabaseData();
  
  // State management
  const [bookings, setBookings] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Batch fetch all required data
  const fetchData = useCallback(async (showRefreshToast = false) => {
    try {
      setLoading(true);
      setError(null);

      // Batch fetch bookings and cars data
      const [bookingsResult, carsResult] = await batchFetch([
        () => fetchBookings({ page: pagination.currentPage, limit: pagination.itemsPerPage }),
        () => fetchCars()
      ]);

      // Filter bookings for this staff member
      const staffBookings = bookingsResult.data?.filter((booking: any) => 
        booking.staff_id === user?.id
      ) || [];

      setBookings(staffBookings);
      setCars(carsResult.data || []);
      
      // Update pagination total
      setPagination(prev => ({
        ...prev,
        totalItems: staffBookings.length
      }));

      if (showRefreshToast) {
        toast.success('Dashboard data refreshed successfully');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, pagination.currentPage, pagination.itemsPerPage, fetchBookings, fetchCars, batchFetch]);

  // Initial data load
  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [fetchData, user?.id]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
  }, [fetchData]);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: 1,
      itemsPerPage: newItemsPerPage
    }));
  }, []);

  // Memoize computed data
  const { stats, recentBookings, paginatedBookings } = useMemo(() => {
    if (!bookings || !cars) {
      return {
        stats: { myBookings: 0, activeRentals: 0, pendingApprovals: 0, monthlyRevenue: 0 },
        recentBookings: [],
        paginatedBookings: []
      };
    }

    const activeRentals = cars.filter(car => car.status === 'rented').length;
    const pendingApprovals = bookings.filter(booking => booking.payment_status === 'pending').length;
    
    // Calculate monthly revenue from approved bookings
    const now = getMalaysiaTime();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyRevenue = bookings
      .filter(booking => {
        const bookingDate = getMalaysiaTime(booking.created_at);
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear && 
               booking.payment_status === 'approved';
      })
      .reduce((sum, booking) => sum + parseFloat(booking.total_amount || 0), 0);

    // Paginate bookings
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    return {
      stats: {
        myBookings: bookings.length,
        activeRentals,
        pendingApprovals,
        monthlyRevenue
      },
      recentBookings: bookings.slice(0, 5),
      paginatedBookings
    };
  }, [bookings, cars, pagination.currentPage, pagination.itemsPerPage]);

  const statCards = useMemo(() => [
    { title: 'My Bookings', value: stats.myBookings, icon: Calendar, color: 'from-blue-500 to-blue-600' },
    { title: 'Active Rentals', value: stats.activeRentals, icon: Car, color: 'from-green-500 to-green-600' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Users, color: 'from-yellow-500 to-yellow-600' },
    { title: 'Monthly Revenue', value: `RM ${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
  ], [stats]);

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);
  const hasNextPage = pagination.currentPage < totalPages;
  const hasPrevPage = pagination.currentPage > 1;

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-4 md:p-6 min-h-screen"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Staff Dashboard</h1>
          <p className="text-gray-700">Welcome back! Here's your performance overview</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="secondary"
          className="flex items-center space-x-2 touch-target"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5`}></div>
              <div className="relative z-10 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-gray-700 text-xs md:text-sm">{stat.title}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Bookings */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-900">My Bookings</h3>
            
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm touch-target"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            {paginatedBookings.length > 0 ? (
              paginatedBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 mb-2 sm:mb-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-sm md:text-base text-gray-900">#{booking.booking_number}</span>
                      <StatusBadge status={booking.payment_status as any} />
                    </div>
                    <div className="text-gray-700 text-xs md:text-sm">
                      <p className="mb-1">{booking.customer?.name} • {booking.car?.brand} {booking.car?.make}</p>
                      <p>Start: {new Date(booking.start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-gray-900 font-medium text-sm md:text-base">RM {booking.total_amount}</p>
                    <p className="text-gray-600 text-xs md:text-sm">{booking.total_days} days</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No bookings found</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} bookings
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!hasPrevPage || loading}
                  variant="secondary"
                  size="sm"
                  className="touch-target"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        variant={pagination.currentPage === pageNum ? "primary" : "secondary"}
                        size="sm"
                        className="w-8 h-8 p-0 touch-target"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!hasNextPage || loading}
                  variant="secondary"
                  size="sm"
                  className="touch-target"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity Summary */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentBookings.length > 0 ? (
              recentBookings.slice(0, 3).map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Booking #{booking.booking_number}
                    </p>
                    <p className="text-xs text-gray-600">
                      {booking.customer?.name} • {formatDateForDisplay(booking.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={booking.payment_status as any} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default StaffDashboard;