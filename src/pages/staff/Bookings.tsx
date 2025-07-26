import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Ban, FileText, AlertTriangle, Clock, Car, Hash, RefreshCw, ChevronLeft, ChevronRight, Upload, X, Calendar, DollarSign, User, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import BookingExtensionModal from '../../components/booking/BookingExtensionModal';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import DepositDeductionModal from '../../components/modals/DepositDeductionModal';

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

const StaffBookings: React.FC = () => {
  const { user } = useAuth();
  const { fetchBookings } = useSupabaseData();
  
  // State management
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showDepositDeductionModal, setShowDepositDeductionModal] = useState(false);
  const [submittingDeductionRequest, setSubmittingDeductionRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with true for initial load
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 15,
    totalItems: 0
  });

  // Memoize filtered bookings, cancellation requests, and counts
  const { bookings, pendingCancellations, filterCounts, overdueBookings } = useMemo(() => {
    const staffBookings = allBookings.filter(booking => booking.staff_id === user?.id);
    const requests = cancellationRequests.filter(req => req.status === 'pending');
    
    // Find overdue bookings (end_date < now AND return_marked = false)
    const now = new Date();
    const overdue = staffBookings.filter(booking => {
      const endDate = new Date(booking.end_date);
      return endDate < now && !booking.return_marked && ['approved', 'ongoing', 'extended', 'handed_over'].includes(booking.booking_status);
    });
    
    // Calculate filter counts
    const counts = {
      all: staffBookings.length,
      pending_approval: staffBookings.filter(b => b.booking_status === 'pending_approval').length,
      approved: staffBookings.filter(b => b.booking_status === 'approved').length,
      handed_over: staffBookings.filter(b => b.booking_status === 'handed_over').length,
      extended: staffBookings.filter(b => b.booking_status === 'extended').length,
      completed: staffBookings.filter(b => b.booking_status === 'completed').length,
      cancelled: staffBookings.filter(b => b.booking_status === 'cancelled').length,
      overdue: overdue.length
    };

    // Filter bookings based on active filter
    let filteredBookings = staffBookings;
    if (activeFilter === 'overdue') {
      filteredBookings = overdue;
    } else if (activeFilter !== 'all') {
      filteredBookings = staffBookings.filter(booking => booking.booking_status === activeFilter);
    }
    
    return {
      bookings: filteredBookings,
      pendingCancellations: requests,
      filterCounts: counts,
      overdueBookings: overdue
    };
  }, [allBookings, cancellationRequests, user?.id, activeFilter]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return bookings.slice(startIndex, endIndex);
  }, [bookings, pagination.currentPage, pagination.itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(bookings.length / pagination.itemsPerPage);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  // Batch fetch all required data
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Batch fetch bookings and cancellation requests
      const [bookingsResult, cancellationRequestsResult] = await Promise.allSettled([
        fetchBookings(),
        supabase
          .from('cancellation_requests')
          .select(`
            *,
            booking:booking_id(id, booking_number),
            staff:staff_id(id, name)
          `)
          .order('created_at', { ascending: false })
      ]);

      // Handle bookings result
      if (bookingsResult.status === 'fulfilled') {
        setAllBookings(bookingsResult.value.data || []);
        setPagination(prev => ({
          ...prev,
          totalItems: bookingsResult.value.data?.length || 0
        }));
      } else {
        console.error('Error fetching bookings:', bookingsResult.reason);
        toast.error('Failed to load bookings');
        setAllBookings([]);
      }

      // Handle cancellation requests result
      if (cancellationRequestsResult.status === 'fulfilled') {
        const { data, error } = cancellationRequestsResult.value;
        if (error) {
          console.error('Error fetching cancellation requests:', error);
          setCancellationRequests([]);
        } else {
          setCancellationRequests(data || []);
        }
      } else {
        console.error('Error fetching cancellation requests:', cancellationRequestsResult.reason);
        setCancellationRequests([]);
      }

    } catch (error) {
      console.error('Error in batch fetch:', error);
      toast.error('Failed to load data');
      setAllBookings([]);
      setCancellationRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchBookings]);

  // Initial data load
  React.useEffect(() => {
    if (user?.id) {
      fetchAllData();
    } else {
      setIsLoading(false);
    }
  }, [fetchAllData, user?.id]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1 // Reset to first page
    }));
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const handleExtendBooking = (booking: any) => {
    setSelectedBooking(booking);
    setShowExtensionModal(true);
  };

  const handleDepositDeduction = (booking: any) => {
    setSelectedBooking(booking);
    setShowDepositDeductionModal(true);
  };

  // Handle staff deposit deduction request
  const handleStaffDepositDeductionRequest = async (deductionData: {
    requestedAmount: number;
    reason: string;
    damageDescription?: string;
    evidencePhotos: string[];
  }) => {
    try {
      setSubmittingDeductionRequest(true);
      
      const { error } = await supabase
        .from('deposit_deduction_requests')
        .insert({
          booking_id: selectedBooking.id,
          requested_by: user?.id,
          requested_amount: deductionData.requestedAmount,
          reason: deductionData.reason,
          damage_description: deductionData.damageDescription,
          evidence_photos: deductionData.evidencePhotos
        });

      if (error) throw error;

      toast.success('Deposit deduction request submitted for admin approval');
      setShowDepositDeductionModal(false);
    } catch (error) {
      console.error('Error submitting deposit deduction request:', error);
      toast.error('Failed to submit deposit deduction request');
    } finally {
      setSubmittingDeductionRequest(false);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'completed',
          payment_status: 'completed' 
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking completed successfully');
      await fetchAllData(); // Refresh data
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Failed to complete booking');
    }
  };

  const getBookingCancellationRequest = (bookingId: string) => {
    return cancellationRequests.find(req => req.booking_id === bookingId && req.status === 'pending');
  };

  const isOverdue = (booking: any) => {
    if (!booking.end_date || booking.return_marked) return false;
    if (!['approved', 'ongoing', 'extended', 'handed_over'].includes(booking.booking_status)) return false;
    
    const now = new Date();
    // Use end of day for the booking end date to account for extensions
    const endDate = new Date(booking.end_date + 'T23:59:59.999Z');
    return endDate < now;
  };

  const getDaysOverdue = (booking: any) => {
    if (!booking.end_date) return 0;
    const now = new Date();
    // Use end of day for the booking end date to account for extensions
    const endDate = new Date(booking.end_date + 'T23:59:59.999Z');
    return Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const CarInfoDisplay = ({ car }: { car: any }) => {
    if (!car) return <span className="text-gray-500">No car info</span>;
    
    return (
      <div className="flex items-center space-x-2">
        <Car className="w-4 h-4 text-gray-600" />
        <div className="flex flex-col">
          <span className="text-gray-900 font-medium">
            {car.brand} {car.make}
          </span>
          <div className="flex items-center space-x-1">
            <Hash className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600 text-xs font-mono">
              {car.plate_number}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Status Filter Component
  const StatusFilter = () => {
    const filters = [
      { key: 'all', label: 'All Bookings', count: filterCounts.all || 0 },
      { key: 'pending_approval', label: 'Pending', count: filterCounts.pending_approval || 0 },
      { key: 'approved', label: 'Approved', count: filterCounts.approved || 0 },
      { key: 'handed_over', label: 'Handed Over', count: filterCounts.handed_over || 0 },
      { key: 'extended', label: 'Extended', count: filterCounts.extended || 0 },
      { key: 'overdue', label: 'Overdue', count: filterCounts.overdue || 0 },
      { key: 'completed', label: 'Completed', count: filterCounts.completed || 0 },
      { key: 'cancelled', label: 'Cancelled', count: filterCounts.cancelled || 0 }
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((filter, index) => (
          <motion.div
            key={filter.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant={activeFilter === filter.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleFilterChange(filter.key)}
              className={`flex items-center space-x-2 min-h-[44px] ${
                filter.key === 'overdue' && filter.count > 0 ? 'border-red-300 text-red-700 hover:bg-red-50' : ''
              }`}
            >
              <span>{filter.label}</span>
              {filter.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeFilter === filter.key 
                    ? 'bg-white/20 text-white' 
                    : filter.key === 'overdue'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {filter.count}
                </span>
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    );
  };

  // Pagination component
  const PaginationControls = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>Show</span>
        <select
          value={pagination.itemsPerPage}
          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm min-h-[44px]"
        >
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={20}>20</option>
        </select>
        <span>per page</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">
          Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
          {Math.min(pagination.currentPage * pagination.itemsPerPage, bookings.length)} of{' '}
          {bookings.length} results
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNumber = i + 1;
          return (
            <Button
              key={pageNumber}
              variant={pagination.currentPage === pageNumber ? "primary" : "ghost"}
              size="sm"
              onClick={() => handlePageChange(pageNumber)}
              className="min-h-[44px] min-w-[44px]"
            >
              {pageNumber}
            </Button>
          );
        })}
        
        {totalPages > 5 && (
          <>
            {totalPages > 6 && <span className="text-gray-400">...</span>}
            <Button
              variant={pagination.currentPage === totalPages ? "primary" : "ghost"}
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              className="min-h-[44px] min-w-[44px]"
            >
              {totalPages}
            </Button>
          </>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === totalPages}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // Show loading spinner only during initial load or when no user
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show message if no user is logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your bookings</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 md:space-y-8 p-4 md:p-0"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-700 text-sm md:text-base">Manage your rental bookings and track their status</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="secondary"
          className="flex items-center space-x-2 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Status Filter */}
      <StatusFilter />

      {/* Pending Cancellation Requests Alert */}
      {pendingCancellations.length > 0 && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-center space-x-3 mb-3">
            <Clock className="w-6 h-6 text-yellow-500" />
            <h3 className="text-yellow-800 font-semibold">Pending Cancellation Requests</h3>
          </div>
          <div className="space-y-2">
            {pendingCancellations.map(request => (
              <div key={request.id} className="flex justify-between items-center text-sm">
                <span className="text-yellow-700">
                  Booking #{request.booking?.booking_number} - Awaiting admin approval
                </span>
                <span className="text-yellow-800 font-medium">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bookings Table */}
      <Card>
        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-4">
          {paginatedBookings.map((booking, index) => {
            const cancellationRequest = getBookingCancellationRequest(booking.id);
            const overdueStatus = isOverdue(booking);
            
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-mono text-gray-900 font-medium">#{booking.booking_number}</span>
                      {cancellationRequest && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                          CANCELLATION PENDING
                        </span>
                      )}
                      {overdueStatus && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          {getDaysOverdue(booking)}d OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <StatusBadge status={booking.booking_status as any} type="booking" />
                      <StatusBadge status={booking.payment_status as any} type="payment" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900 font-bold">RM {booking.total_amount}</div>
                    <div className="text-gray-600 text-sm">{booking.total_days} days</div>
                  </div>
                </div>

                {/* Car Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <CarInfoDisplay car={booking.car} />
                </div>

                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Customer:</span> <span className="text-gray-900">{booking.customer?.name}</span></p>
                  <p><span className="text-gray-600">Duration:</span> <span className="text-gray-900">{new Date(booking.start_date).toLocaleDateString()} to {new Date(booking.end_date).toLocaleDateString()}</span></p>
                </div>

                <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleViewDetails(booking)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors min-h-[44px]"
                  >
                    View Details
                  </button>
                  {['approved', 'ongoing', 'extended', 'handed_over'].includes(booking.booking_status) && (
                    <button
                      onClick={() => handleExtendBooking(booking)}
                      className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors min-h-[44px]"
                    >
                      {booking.booking_status === 'extended' ? 'Extend Again' : 'Extend'}
                    </button>
                  )}
                  {booking.payment_status === 'approved' && booking.booking_status === 'approved' && (
                    <button
                      onClick={() => handleCompleteBooking(booking.id)}
                      className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors min-h-[44px]"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Booking ID</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Vehicle</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Customer</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Duration</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Amount</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Booking Status</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Payment Status</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((booking, index) => {
                const cancellationRequest = getBookingCancellationRequest(booking.id);
                const overdueStatus = isOverdue(booking);
                
                return (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-gray-900">#{booking.booking_number}</span>
                        {cancellationRequest && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                            CANCELLATION PENDING
                          </span>
                        )}
                        {overdueStatus && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                            {getDaysOverdue(booking)}d OVERDUE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <CarInfoDisplay car={booking.car} />
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-900">{booking.customer?.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-700 text-sm">
                        <p>{new Date(booking.start_date).toLocaleDateString()}</p>
                        <p>to {new Date(booking.end_date).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-900 font-medium">RM {booking.total_amount}</span>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={booking.booking_status as any} type="booking" />
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={booking.payment_status as any} type="payment" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="text-gray-600 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {['approved', 'ongoing', 'extended', 'handed_over'].includes(booking.booking_status) && (
                          <button
                            onClick={() => handleExtendBooking(booking)}
                            className="text-gray-600 hover:text-green-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title={booking.booking_status === 'extended' ? 'Extend Again' : 'Extend Booking'}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {bookings.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">No bookings found</p>
          </div>
        )}

        {/* Pagination Controls */}
        {bookings.length > 0 && <PaginationControls />}
      </Card>

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <StaffBookingDetailsModal
          booking={selectedBooking}
          onClose={() => {
            setShowModal(false);
            setSelectedBooking(null);
          }}
          onBookingUpdated={fetchAllData}
          onExtendBooking={handleExtendBooking}
          onDepositDeduction={handleDepositDeduction}
        />
      )}

      {/* Booking Extension Modal */}
      {showExtensionModal && selectedBooking && (
        <BookingExtensionModal
          booking={selectedBooking}
          onClose={() => {
            setShowExtensionModal(false);
            setSelectedBooking(null);
          }}
          onExtensionComplete={fetchAllData}
          isAdmin={false}
        />
      )}

      {/* Deposit Deduction Modal */}
      {showDepositDeductionModal && selectedBooking && (
        <DepositDeductionModal
          isOpen={showDepositDeductionModal}
          onClose={() => {
            setShowDepositDeductionModal(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          onSubmit={handleStaffDepositDeductionRequest}
          submitting={submittingDeductionRequest}
        />
      )}
    </motion.div>
  );
};

// Staff Booking Details Modal Component
const StaffBookingDetailsModal: React.FC<{
  booking: any;
  onClose: () => void;
  onBookingUpdated: () => void;
  onExtendBooking: (booking: any) => void;
  onDepositDeduction: (booking: any) => void;
}> = ({ booking, onClose, onBookingUpdated, onExtendBooking, onDepositDeduction }) => {
  const { user } = useAuth();
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [submittingCancellation, setSubmittingCancellation] = useState(false);

  // Calculate deposit information
  const depositCollected = booking.deposit_amount || 0;
  const depositDeducted = booking.deposit_deducted || 0;
  const remainingDeposit = depositCollected - depositDeducted;

  const canRequestCancellation = () => {
    return ['pending_approval', 'approved'].includes(booking.booking_status) && 
           !['cancelled', 'completed'].includes(booking.payment_status);
  };

  const canCancelDirectly = () => {
    // Can cancel directly if booking is not approved yet
    return booking.booking_status === 'pending_approval' && booking.payment_status === 'pending';
  };

  const handleDirectCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      // Use RPC function to handle cancellation to avoid trigger conflicts
      const { error } = await supabase.rpc('cancel_booking_direct', {
        p_booking_id: booking.id,
        p_reason: 'Cancelled by staff before approval.',
        p_staff_id: user?.id
      });

      if (error) {
        // Fallback to manual update if RPC doesn't exist
        console.warn('RPC function not available, using fallback method');
        
        // First update payment status
        const { error: paymentError } = await supabase
          .from('payments')
          .update({ 
            admin_approval_status: 'cancelled',
            payment_completion_status: 'cancelled'
          })
          .eq('booking_id', booking.id);

        if (paymentError) {
          console.warn('Payment update error:', paymentError);
        }

        // Then update booking status in a separate transaction
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ 
            booking_status: 'cancelled',
            payment_status: 'cancelled',
            notes: (booking.notes || '') + ' | Cancelled by staff before approval.',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (bookingError) throw bookingError;
      }

      toast.success('Booking cancelled successfully');
      onBookingUpdated();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking. Please try again or contact admin.');
    }
  };

  const handleSubmitCancellationRequest = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setSubmittingCancellation(true);

      // Check if this booking has been cancelled before
      const { data: existingRequests, error: checkError } = await supabase
        .from('cancellation_requests')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('staff_id', user?.id);

      if (checkError) throw checkError;

      let cancellationNote = cancellationReason;
      
      if (existingRequests && existingRequests.length > 0) {
        cancellationNote = `[SUBSEQUENT CANCELLATION] ${cancellationReason}`;
      }

      const { error } = await supabase
        .from('cancellation_requests')
        .insert({
          booking_id: booking.id,
          staff_id: user?.id,
          reason: cancellationNote
        });

      if (error) throw error;

      const isSubsequent = existingRequests && existingRequests.length > 0;
      
      toast.success(
        isSubsequent 
          ? 'Subsequent cancellation request submitted for admin approval'
          : 'Cancellation request submitted for admin approval'
      );
      
      setShowCancellationForm(false);
      setCancellationReason('');
      onBookingUpdated();
      onClose();
    } catch (error) {
      console.error('Error submitting cancellation request:', error);
      toast.error('Failed to submit cancellation request');
    } finally {
      setSubmittingCancellation(false);
    }
  };

  const CarInfoDisplay = ({ car }: { car: any }) => {
    if (!car) return <span className="text-gray-500">No car info</span>;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex flex-col">
              <span className="text-blue-900 font-semibold">
                {car.brand} {car.make}
              </span>
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700 text-sm font-mono font-bold">
                  {car.plate_number}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showCancellationForm) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-gray-200 rounded-xl w-full max-w-sm sm:max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
        >
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Request Cancellation</h3>
          </div>
          
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              Booking: <span className="font-mono">#{booking.booking_number}</span>
            </p>
            <p className="text-gray-700 mb-4">
              This cancellation request will be sent to admin for approval.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Reason for Cancellation *
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this booking..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[44px]"
              rows={3}
              required
            />
          </div>

          </div>
          
          <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCancellationForm(false);
                setCancellationReason('');
              }}
              className="w-full sm:flex-1 min-h-[44px]"
              disabled={submittingCancellation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCancellationRequest}
              disabled={!cancellationReason.trim() || submittingCancellation}
              className="w-full sm:flex-1 min-h-[44px]"
            >
              {submittingCancellation ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-200 rounded-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            Booking Details - #{booking.booking_number}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
          {/* Vehicle Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Information</h3>
            <CarInfoDisplay car={booking.car} />
          </div>

          {/* Booking Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Rental Information</h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Start Date: {new Date(booking.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>End Date: {new Date(booking.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Duration: {booking.total_days} days</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Total Amount: RM {booking.total_amount}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Booking Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={booking.booking_status} type="booking" />
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Payment Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={booking.payment_status} type="payment" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Customer: </span>
                  <span className="text-gray-900">{booking.customer?.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Information */}
          {depositCollected > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Security Deposit</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-purple-600">Collected:</span>
                    <p className="font-medium text-purple-800">RM {depositCollected}</p>
                  </div>
                  <div>
                    <span className="text-purple-600">Deducted:</span>
                    <p className="font-medium text-red-600">RM {depositDeducted}</p>
                  </div>
                  <div>
                    <span className="text-purple-600">Remaining:</span>
                    <p className="font-medium text-green-600">RM {remainingDeposit}</p>
                  </div>
                </div>
                
                {booking.deposit_deduction_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-red-800">Deduction Reason</span>
                    </div>
                    <p className="text-red-700 text-sm">{booking.deposit_deduction_reason}</p>
                  </div>
                )}
                
                {remainingDeposit > 0 && (
                  <Button
                    onClick={() => onDepositDeduction(booking)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white min-h-[44px]"
                  >
                    Request Deposit Deduction
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            {['approved', 'ongoing', 'extended', 'handed_over'].includes(booking.booking_status) && (
              <Button
                onClick={() => {
                  onExtendBooking(booking);
                  onClose();
                }}
                className="flex items-center space-x-2 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>{booking.booking_status === 'extended' ? 'Request Extension Again' : 'Request Extension'}</span>
              </Button>
            )}
            {booking.booking_status === 'extended' && (
              <Button
                onClick={() => {
                  onExtendBooking(booking);
                  onClose();
                }}
                className="flex items-center space-x-2 min-h-[44px] bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                <span>Request Extension Again</span>
              </Button>
            )}
            
            {canRequestCancellation() && (
              <>
                {canCancelDirectly() ? (
                  <Button
                    variant="danger"
                    onClick={handleDirectCancel}
                    className="flex items-center space-x-2 min-h-[44px]"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel Booking</span>
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => setShowCancellationForm(true)}
                    className="flex items-center space-x-2 min-h-[44px]"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Request Cancellation</span>
                  </Button>
                )}
              </>
            )}
            
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="min-h-[44px]"
            >
              Close
            </Button>
          </div>
      </motion.div>
    </div>
  );
};

export default StaffBookings;