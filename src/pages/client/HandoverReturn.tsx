import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw,
  HandHeart,
  RotateCcw,
  CheckCircle,
  Clock,
  Car,
  User,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { EnhancedInvoiceGenerator } from '../../components/invoices/EnhancedInvoiceGenerator';
import HandoverBookingCard from '../../components/handover/HandoverBookingCard';
import ReturnBookingCard from '../../components/handover/ReturnBookingCard';
import HandoverReturnModal from '../../components/handover/HandoverReturnModal';
import EmptyStateCard from '../../components/handover/EmptyStateCard';
import { calculateLateFee, isReturnLate, getHoursLate } from '../../utils/calculateLateFee';
import toast from 'react-hot-toast';

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

const ClientHandoverReturn: React.FC = () => {
  const { user } = useAuth();
  const { fetchBookings } = useSupabaseData();
  
  const [activeTab, setActiveTab] = useState<'handover' | 'return'>('handover');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [handoverBookings, setHandoverBookings] = useState<any[]>([]);
  const [returnBookings, setReturnBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'handover' | 'return'>('handover');
  const [processing, setProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination states for both tabs
  const [handoverPagination, setHandoverPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  const [returnPagination, setReturnPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Batch fetch all required data
  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchBookings();
      const bookings = result.data || [];
      
      // Filter for customer's handover bookings (booking approved but not handed over)
      const handover = bookings.filter(booking => 
        booking.booking_status === 'approved' && 
        !booking.handover_marked &&
        booking.customer_id === user.id // Only customer's own bookings
      );
      
      // Filter for customer's return bookings (handed over but not returned)
      const returns = bookings.filter(booking => 
        booking.handover_marked && 
        booking.handover_time && 
        !booking.return_marked &&
        booking.customer_id === user.id // Only customer's own bookings
      );
      
      setAllBookings(bookings);
      setHandoverBookings(handover);
      setReturnBookings(returns);
      
      // Update pagination totals
      setHandoverPagination(prev => ({ ...prev, totalItems: handover.length }));
      setReturnPagination(prev => ({ ...prev, totalItems: returns.length }));
      
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
      // Set empty arrays on error
      setAllBookings([]);
      setHandoverBookings([]);
      setReturnBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchBookings, user?.id]);

  // Initial data load
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBookings();
      toast.success('Bookings refreshed successfully');
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      toast.error('Failed to refresh bookings');
    } finally {
      setRefreshing(false);
    }
  };

  // Pagination helpers
  const getPaginatedData = (data: any[], pagination: PaginationState) => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number, itemsPerPage: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handlePageChange = (newPage: number, type: 'handover' | 'return') => {
    const pagination = type === 'handover' ? handoverPagination : returnPagination;
    const totalPages = getTotalPages(pagination.totalItems, pagination.itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
      if (type === 'handover') {
        setHandoverPagination(prev => ({ ...prev, currentPage: newPage }));
      } else {
        setReturnPagination(prev => ({ ...prev, currentPage: newPage }));
      }
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number, type: 'handover' | 'return') => {
    if (type === 'handover') {
      setHandoverPagination(prev => ({
        ...prev,
        itemsPerPage: newItemsPerPage,
        currentPage: 1
      }));
    } else {
      setReturnPagination(prev => ({
        ...prev,
        itemsPerPage: newItemsPerPage,
        currentPage: 1
      }));
    }
  };

  const handleHandover = (booking: any) => {
    setSelectedBooking(booking);
    setModalType('handover');
    setShowModal(true);
  };

  const handleReturn = (booking: any) => {
    setSelectedBooking(booking);
    setModalType('return');
    setShowModal(true);
  };

  const handleConfirmAction = async (photoUrl: string, actionTime: string, lateFee?: number, invoiceData?: any) => {
    // Enhanced user validation
    if (!user?.id) {
      console.error('User authentication error: No user ID');
      toast.error('Authentication error. Please log in again.');
      return;
    }

    if (!selectedBooking?.id) {
      console.error('Selected booking error:', { selectedBooking });
      toast.error('Booking selection error. Please try again.');
      return;
    }

    if (!photoUrl?.trim()) {
      console.error('Photo URL error:', { photoUrl });
      toast.error('Photo is required for verification.');
      return;
    }


    setProcessing(true);
    
    try {
      if (modalType === 'handover') {
        // Submit pickup request for approval
        const { error: handoverError } = await supabase
          .from('bookings')
          .update({
            client_pickup_requested: true,
            client_pickup_request_time: actionTime,
            client_pickup_photo_url: photoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedBooking.id)
          .eq('customer_id', user.id); // Ensure customer can only update their own bookings

        if (handoverError) {
          console.error('Handover booking update error:', handoverError);
          throw handoverError;
        }

        toast.success('Pickup request submitted successfully! Awaiting staff approval.');
      } else {
        // Submit dropoff request for approval
        const returnData: any = {
          client_dropoff_requested: true,
          client_dropoff_request_time: actionTime,
          client_dropoff_photo_url: photoUrl,
          updated_at: new Date().toISOString()
        };

        // Add late fee invoice data if available
        if (invoiceData) {
          returnData.late_fee_invoice_url = invoiceData.invoiceUrl;
          returnData.late_fee_invoice_number = invoiceData.invoiceNumber;
          returnData.late_fee = lateFee || 0;
        }


        const { error: returnError } = await supabase
          .from('bookings')
          .update(returnData)
          .eq('id', selectedBooking.id)
          .eq('customer_id', user.id); // Ensure customer can only update their own bookings

        if (returnError) {
          console.error('Return booking update error:', returnError);
          throw returnError;
        }

        // Show success message
        if (lateFee && lateFee > 0) {
          toast.success(`Drop-off request submitted successfully! Late fee invoice ${invoiceData?.invoiceNumber || ''} generated. Awaiting staff approval.`);
        } else {
          toast.success('Drop-off request submitted successfully! Awaiting staff approval.');
        }
      }

      setShowModal(false);
      setSelectedBooking(null);
      await loadBookings(); // Refresh data
    } catch (error) {
      console.error(`Error processing vehicle ${modalType}:`, error);
      toast.error(`Failed to submit ${modalType === 'handover' ? 'pickup' : 'drop-off'} request`);
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  // Pagination component
  const PaginationControls = ({ type }: { type: 'handover' | 'return' }) => {
    const pagination = type === 'handover' ? handoverPagination : returnPagination;
    const data = type === 'handover' ? handoverBookings : returnBookings;
    const totalPages = getTotalPages(pagination.totalItems, pagination.itemsPerPage);

    if (data.length === 0) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Show</span>
          <select
            value={pagination.itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value), type)}
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
            {Math.min(pagination.currentPage * pagination.itemsPerPage, data.length)} of{' '}
            {data.length} results
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage - 1, type)}
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
                onClick={() => handlePageChange(pageNumber, type)}
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
                onClick={() => handlePageChange(totalPages, type)}
                className="min-h-[44px] min-w-[44px]"
              >
                {totalPages}
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage + 1, type)}
            disabled={pagination.currentPage === totalPages}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Get paginated data for current tab
  const paginatedHandoverBookings = getPaginatedData(handoverBookings, handoverPagination);
  const paginatedReturnBookings = getPaginatedData(returnBookings, returnPagination);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 lg:space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Vehicle Pickup & Drop-off</h1>
          <p className="text-gray-700">Confirm vehicle pickup and process drop-offs with photo verification. Track your rental status in real-time.</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          className="flex items-center space-x-2 self-start sm:self-auto min-h-[44px]"
          disabled={isLoading || refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${(isLoading || refreshing) ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Important Notice */}
      <Card className="border-l-4 border-blue-500 bg-blue-50 border border-blue-200">
        <div className="flex items-center space-x-3 mb-3">
          <CheckCircle className="w-6 h-6 text-blue-500" />
          <h3 className="text-blue-800 font-semibold">Customer Self-Service Portal</h3>
        </div>
        <div className="text-blue-700 text-sm space-y-2">
          <p>• <strong>Vehicle Pickup:</strong> Confirm receipt of your rental vehicle by taking a photo when you collect it</p>
          <p>• <strong>Vehicle Drop-off:</strong> Mark your vehicle as returned by taking a photo when you drop it off</p>
          <p>• <strong>Late Returns:</strong> If you return late, a separate late fee invoice will be generated automatically</p>
          <p>• Vehicles become available for other customers immediately upon your drop-off confirmation</p>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('handover')}
          className={`
            flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]
            ${activeTab === 'handover' 
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <HandHeart className="w-5 h-5" />
          <span className="font-medium">Confirm Pickup</span>
          {handoverBookings.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {handoverBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`
            flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]
            ${activeTab === 'return' 
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <RotateCcw className="w-5 h-5" />
          <span className="font-medium">Process Drop-off</span>
          {returnBookings.length > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              {returnBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'handover' ? (
          <Card className="border border-gray-200">
            {paginatedHandoverBookings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <HandHeart className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Ready for Pickup Confirmation</h2>
                  <span className="text-sm text-gray-600">({handoverBookings.length} vehicles)</span>
                </div>
                
                {paginatedHandoverBookings.map((booking, index) => (
                  <HandoverBookingCard
                    key={booking.id}
                    booking={booking}
                    index={index}
                    onHandover={handleHandover}
                  />
                ))}
                
                <PaginationControls type="handover" />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HandHeart className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Vehicles Ready for Pickup</h3>
                <p className="text-gray-700">
                  You don't have any approved bookings waiting for pickup confirmation.
                </p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">
                    <strong>Note:</strong> Once your booking is approved and the vehicle is ready, it will appear here for you to confirm pickup.
                  </p>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="border border-gray-200">
            {paginatedReturnBookings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <RotateCcw className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">My Active Rentals</h2>
                  <span className="text-sm text-gray-600">({returnBookings.length} vehicles)</span>
                </div>
                
                {paginatedReturnBookings.map((booking, index) => (
                  <ReturnBookingCard
                    key={booking.id}
                    booking={booking}
                    index={index}
                    onReturn={handleReturn}
                  />
                ))}
                
                <PaginationControls type="return" />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Rentals</h3>
                <p className="text-gray-700">
                  You don't have any vehicles currently in your possession.
                </p>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    <strong>Note:</strong> Vehicles that you have confirmed pickup for will appear here until you process their drop-off.
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedBooking && (
        <HandoverReturnModal
          selectedBooking={selectedBooking}
          modalType={modalType}
          onClose={closeModal}
          onConfirm={handleConfirmAction}
          processing={processing}
          isClientView={true} // Pass the client view flag
        />
      )}
    </motion.div>
  );
};

export default ClientHandoverReturn;