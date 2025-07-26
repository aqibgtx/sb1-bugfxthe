import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import BookingsHeader from '../../components/client/bookings/BookingsHeader';
import BookingsList from '../../components/client/bookings/BookingsList';
import BookingStatusFilter from '../../components/client/bookings/BookingStatusFilter';
import PaymentUploadSection from '../../components/client/bookings/PaymentUploadSection';
import BookingDetailsModal from '../../components/client/bookings/BookingDetailsModal';
import UploadInstructions from '../../components/client/bookings/UploadInstructions';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 15;

const ClientBookings: React.FC = () => {
  const { user } = useAuth();
  const { fetchBookings } = useSupabaseData();
  
  // State
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch bookings data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const result = await fetchBookings();
      
      // Filter bookings for current user
      const userBookings = result.data.filter(booking => booking.customer_id === user.id);
      setAllBookings(userBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      setAllBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchBookings]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setAllBookings([]);
      setSelectedBooking(null);
      setUploadingBookingId(null);
    };
  }, []);

  // Memoize filtered bookings and counts
  const { bookings, filterCounts, overdueBookings, totalPages } = useMemo(() => {
    if (!allBookings || !Array.isArray(allBookings)) {
      return { bookings: [], filterCounts: {}, overdueBookings: [], totalPages: 0 };
    }

    // Find overdue bookings (end_date < now AND return_marked = false)
    const now = new Date();
    const overdue = allBookings.filter(booking => {
      const endDate = new Date(booking.end_date);
      return endDate < now && !booking.return_marked && booking.payment_status === 'approved';
    });
    
    // Calculate filter counts
    const counts = {
      all: allBookings.length,
      pending: allBookings.filter(b => b.payment_status === 'pending').length,
      approved: allBookings.filter(b => b.payment_status === 'approved').length,
      completed: allBookings.filter(b => b.payment_status === 'completed').length,
      cancelled: allBookings.filter(b => b.payment_status === 'cancelled').length,
      rejected: allBookings.filter(b => b.payment_status === 'rejected').length
    };

    // Filter bookings based on active filter
    let filteredBookings = allBookings;
    if (activeFilter !== 'all') {
      filteredBookings = allBookings.filter(booking => booking.payment_status === activeFilter);
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { 
      bookings: paginatedBookings, 
      filterCounts: counts, 
      overdueBookings: overdue,
      totalPages
    };
  }, [allBookings, activeFilter, currentPage]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchData();
      toast.success('Bookings refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh bookings');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const handleUploadPayment = (bookingId: string) => {
    setUploadingBookingId(bookingId);
    setShowUploadModal(true);
  };

  const handlePaymentUpload = async (url: string, fileInfo: any) => {
    if (!uploadingBookingId) return;

    try {
      const booking = allBookings.find(b => b.id === uploadingBookingId);
      
      const { error } = await supabase
        .from('payments')
        .insert({
          booking_id: uploadingBookingId,
          amount: booking?.total_amount || 0,
          payment_method_code: 'QR',
          receipt_url: url,
          approved: false
        });

      if (error) throw error;

      toast.success('Payment receipt uploaded successfully!');
      setShowUploadModal(false);
      setUploadingBookingId(null);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error uploading payment:', error);
      toast.error('Failed to upload payment receipt');
    }
  };

  const handlePaymentUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadingBookingId(null);
  };

  const handleCloseDetailsModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  const handleContactAdmin = () => {
    // Open email client with pre-filled subject
    const subject = encodeURIComponent('Overdue Return - Payment Pending');
    const body = encodeURIComponent('Dear Admin,\n\nI have an overdue booking that requires attention. Please contact me regarding the payment status.\n\nThank you.');
    window.location.href = `mailto:admin@budgetplusrental.com?subject=${subject}&body=${body}`;
  };

  const uploadingBooking = useMemo(() => {
    return allBookings.find(b => b.id === uploadingBookingId);
  }, [allBookings, uploadingBookingId]);

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {pages.map(page => (
          <Button
            key={page}
            variant={currentPage === page ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handlePageChange(page)}
            className="min-h-[44px] min-w-[44px]"
          >
            {page}
          </Button>
        ))}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 lg:space-y-8 min-h-screen"
    >
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BookingsHeader />
        <Button
          onClick={handleRefresh}
          variant="ghost"
          className="flex items-center space-x-2 self-start sm:self-auto min-h-[44px]"
          disabled={loading || refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Overdue Returns Warning */}
      {overdueBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-l-4 border-red-500 bg-red-50">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-red-800 font-semibold">Overdue Returns Detected</h3>
              </div>
              <div className="text-red-700 space-y-2">
                <p>
                  You have {overdueBookings.length} booking{overdueBookings.length > 1 ? 's' : ''} that {overdueBookings.length > 1 ? 'are' : 'is'} past the return date. 
                  Payment may be pending until the vehicle{overdueBookings.length > 1 ? 's are' : ' is'} returned.
                </p>
                <div className="space-y-1">
                  {overdueBookings.map(booking => {
                    const daysOverdue = Math.ceil((new Date().getTime() - new Date(booking.end_date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={booking.id} className="text-sm">
                        • Booking #{booking.booking_number} - {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleContactAdmin}
                    size="sm"
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 min-h-[44px]"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Contact Admin</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Status Filter */}
      <BookingStatusFilter
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={filterCounts}
      />

      {/* Bookings List */}
      <BookingsList
        bookings={bookings}
        onViewDetails={handleViewDetails}
        onUploadPayment={handleUploadPayment}
        loading={loading}
      />

      {/* Pagination Controls */}
      <PaginationControls />

      {/* Results Info */}
      {!loading && allBookings.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, bookings.length)} of {filterCounts[activeFilter] || 0} bookings
        </div>
      )}

      {/* Payment Upload Modal */}
      {showUploadModal && uploadingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PaymentUploadSection
            bookingId={uploadingBooking.id}
            bookingNumber={uploadingBooking.booking_number}
            totalAmount={uploadingBooking.total_amount}
            onUploadComplete={handlePaymentUpload}
            onUploadError={handlePaymentUploadError}
            onCancel={handleCloseUploadModal}
          />
        </div>
      )}

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={handleCloseDetailsModal}
          onBookingUpdated={fetchData}
        />
      )}

      {/* Upload Instructions */}
      <UploadInstructions />
    </motion.div>
  );
};

export default ClientBookings;