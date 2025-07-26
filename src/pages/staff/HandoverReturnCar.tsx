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
  ChevronRight,
  UserCheck,
  X
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
import ApprovalBookingCard from '../../components/handover/ApprovalBookingCard';
import PhotoViewModal from '../../components/handover/PhotoViewModal';
import EnhancedCombinedPaymentInvoiceModal from '../../components/modals/EnhancedCombinedPaymentInvoiceModal';
import { calculateLateFee, isReturnLate, getHoursLate, calculateOverdueFeeFromBooking } from '../../utils/calculateLateFee';
import { getMalaysiaTime, toMalaysiaTime } from '../../lib/timezone';
import toast from 'react-hot-toast';

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

const HandoverReturnCar: React.FC = () => {
  const { user } = useAuth();
  const { fetchBookings } = useSupabaseData();
  
  const [activeTab, setActiveTab] = useState<'handover' | 'return' | 'approval'>('handover');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [handoverBookings, setHandoverBookings] = useState<any[]>([]);
  const [returnBookings, setReturnBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'handover' | 'return'>('handover');
  const [processing, setProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; type: 'pickup' | 'dropoff' }>({ url: '', type: 'pickup' });
  const [showEnhancedPaymentModal, setShowEnhancedPaymentModal] = useState(false);
  const [enhancedPaymentData, setEnhancedPaymentData] = useState<any>(null);

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
      
      // Filter for handover bookings (booking approved but not handed over)
      // Staff can only handover their own assigned bookings
      const handover = bookings.filter(booking => 
        booking.booking_status === 'approved' && 
        !booking.handover_marked &&
        booking.staff_id === user.id
      );
      
      // Filter for return bookings (handed over but not returned) 
      // IMPORTANT: Any staff can receive returns from any customer (no staff_id restriction)
      const returns = bookings.filter(booking => 
        booking.handover_marked && 
        booking.handover_time && 
        !booking.return_marked
        // Removed staff_id restriction - any staff can process returns
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

  const handlePageChange = (newPage: number, type: 'handover' | 'return' | 'approval') => {
    const pagination = type === 'handover' ? handoverPagination : 
                      returnPagination;
    const totalPages = getTotalPages(pagination.totalItems, pagination.itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
      if (type === 'handover') {
        setHandoverPagination(prev => ({ ...prev, currentPage: newPage }));
      } else {
        setReturnPagination(prev => ({ ...prev, currentPage: newPage }));
      }
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number, type: 'handover' | 'return' | 'approval') => {
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

  const handleConfirmAction = async (
    photoUrl: string,
    actionTime: string,
    lateFee?: number,
    lateFeeInvoiceData?: any, // Keep parameter for compatibility but not used
    depositData?: any, 
    returnData?: any,
    currentMileage?: number,
    handoverReturnInvoiceData?: any,
    lateFeePaymentMethod?: string
  ) => {
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
        // Process handover with optional deposit collection
        const handoverUpdateData: any = {
          handover_marked: true,
          handover_photo_url: photoUrl,
          handover_time: actionTime,
          handover_by: user.id,
          booking_status: 'handed_over',
          updated_at: new Date().toISOString()
        };
        
        // Add deposit data if provided
        if (depositData && depositData.amount > 0) {
          handoverUpdateData.deposit_amount = depositData.amount;
          handoverUpdateData.deposit_collected_at = depositData.collectedAt;
          handoverUpdateData.deposit_collected_by = depositData.collectedBy;
        }
        
        const { error: handoverError } = await supabase
          .from('bookings')
          .update(handoverUpdateData)
          .eq('id', selectedBooking.id);

        if (handoverError) {
          console.error('Handover booking update error:', handoverError);
          throw handoverError;
        }

        let successMessage = 'Car handover completed successfully!';
        if (depositData && depositData.amount > 0) {
          successMessage += ` Deposit of RM ${depositData.amount} collected.`;
        }
        if (handoverReturnInvoiceData) {
          successMessage += ` Invoice ${handoverReturnInvoiceData.invoiceNumber} generated.`;
        }
        toast.success(successMessage);
        
        // Show invoice share modal for handover
        if (handoverReturnInvoiceData) {
          setEnhancedPaymentData({
            bookingData: {
              id: selectedBooking.id,
              booking_number: `${selectedBooking.booking_number} (Handover)`,
              customer: selectedBooking.customer,
              car: selectedBooking.car || { brand: selectedBooking.car_name || 'Unknown', make: '' },
              total_days: selectedBooking.total_days,
              total_amount: depositData?.amount || 0
            },
            paymentMethod: 'cash',
            invoiceData: {
              invoiceId: handoverReturnInvoiceData.invoiceUrl?.split('/').pop() || '',
              invoiceNumber: handoverReturnInvoiceData.invoiceNumber,
              previewUrl: handoverReturnInvoiceData.invoiceUrl,
              customerEmail: selectedBooking.customer?.email || '',
              customerName: selectedBooking.customer?.name || '',
              totalAmount: depositData?.amount || 0
            }
          });
          setShowEnhancedPaymentModal(true);
        }
      } else {
        // Process return - set booking_status to 'completed'
        const returnUpdateData: any = {
          return_marked: true,
          return_photo_url: photoUrl,
          actual_return_time: actionTime,
          returned_by: user.id,
          late_fee: lateFee || 0,
          booking_status: 'completed', // Set booking status to completed when car is returned
          updated_at: new Date().toISOString()
        };

        // Add return data if provided (photo arrays and deposit status)
        if (returnData) {
          if (returnData.depositReturnProofUrls?.length > 0) {
            returnUpdateData.deposit_return_proof_urls = returnData.depositReturnProofUrls;
          }
          if (returnData.carReturnProofUrls?.length > 0) {
            returnUpdateData.car_return_proof_urls = returnData.carReturnProofUrls;
          }
          if (returnData.depositStatus) {
            returnUpdateData.deposit_status = returnData.depositStatus;
          }
          if (returnData.depositReturnedAt) {
            returnUpdateData.deposit_returned_at = returnData.depositReturnedAt;
          }
          if (returnData.depositReturnedBy) {
            returnUpdateData.deposit_returned_by = returnData.depositReturnedBy;
          }
        }
        // If payment is approved, also set payment_status to completed
        if (selectedBooking.payment_status === 'approved') {
          returnUpdateData.payment_status = 'completed';
        }

        const { error: returnError } = await supabase
          .from('bookings')
          .update(returnUpdateData)
          .eq('id', selectedBooking.id);

        if (returnError) {
          console.error('Return booking update error:', returnError);
          throw returnError;
        }

        // Update car mileage if provided
        if (currentMileage && currentMileage > 0) {
          const { error: carUpdateError } = await supabase
            .from('cars')
            .update({
              current_mileage: currentMileage,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedBooking.car_id);

          if (carUpdateError) {
            console.error('Car mileage update error:', carUpdateError);
            // Don't throw error, just log it as mileage update is not critical
            toast.error('Failed to update car mileage, but return was processed successfully');
          }
        }
        
        // Create payment record for late fee if applicable
        if (lateFee && lateFee > 0) {
          try {
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                booking_id: selectedBooking.id,
                amount: lateFee,
                payment_method_code: 'LATE_FEE',
                admin_approval_status: 'pending',
                payment_completion_status: 'pending',
                car_name: selectedBooking.car?.brand + ' ' + selectedBooking.car?.make,
                car_plate_number: selectedBooking.car?.plate_number,
                is_agent_booking: selectedBooking.is_agent_booking || false,
                notes: `Late fee payment generated by staff during vehicle return process. Amount: RM ${lateFee}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (paymentError) {
              console.error('Error creating late fee payment record:', paymentError);
              // Don't throw error - continue with return process but log the issue
              toast.error('Late fee recorded but payment record creation failed');
            } else {
              console.log('Late fee payment record created successfully by staff');
            }
          } catch (paymentCreationError) {
            console.error('Error creating late fee payment:', paymentCreationError);
            // Don't throw error - continue with return process
          }
        }
        
        // Success message handling - invoice generation is handled by HandoverReturnModal
        let successMessage = 'Car return processed successfully! Car is now available for booking.';
        if (lateFee && lateFee > 0) {
          successMessage = 'Car return processed successfully! Late fee has been calculated.';
        }
        if (handoverReturnInvoiceData) {
          successMessage = `Car return processed successfully! Return invoice ${handoverReturnInvoiceData.invoiceNumber} generated. Car is now available for booking.`;
        }
        toast.success(successMessage);
        
        // Show invoice share modal for return with potential late fee payment
        if (handoverReturnInvoiceData) {
          const paymentData: any = {
            bookingData: {
              id: selectedBooking.id,
              booking_number: lateFee && lateFee > 0 ? `${selectedBooking.booking_number} (Late Fee)` : `${selectedBooking.booking_number} (Return)`,
              customer: selectedBooking.customer,
              car: selectedBooking.car || { brand: selectedBooking.car_name || 'Unknown', make: '' },
              total_days: selectedBooking.total_days,
              total_amount: lateFee || 0
            },
            paymentMethod: lateFee && lateFee > 0 ? (lateFeePaymentMethod || 'credit_debit_card') : 'cash',
            invoiceData: {
              invoiceId: handoverReturnInvoiceData.invoiceUrl?.split('/').pop() || '',
              invoiceNumber: handoverReturnInvoiceData.invoiceNumber,
              previewUrl: handoverReturnInvoiceData.invoiceUrl,
              customerEmail: selectedBooking.customer?.email || '',
              customerName: selectedBooking.customer?.name || '',
              totalAmount: lateFee || 0
            }
          };
          
          setEnhancedPaymentData(paymentData);
          setShowEnhancedPaymentModal(true);
        }
      }

      setShowModal(false);
      setSelectedBooking(null);
      await loadBookings(); // Refresh data
    } catch (error) {
      console.error(`Error processing car ${modalType}:`, error);
      toast.error(`Failed to process car ${modalType}`);
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  // Pagination component
  const PaginationControls = ({ type }: { type: 'handover' | 'return' | 'approval' }) => {
    const pagination = type === 'handover' ? handoverPagination : 
                      returnPagination;
    const data = type === 'handover' ? handoverBookings : 
                returnBookings;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Handover & Return Cars</h1>
          <p className="text-gray-700">Manage car handovers and returns with photo verification. Cars become available immediately upon return.</p>
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
      <Card className="border-l-4 border-green-500 bg-green-50 border border-green-200">
        <div className="flex items-center space-x-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h3 className="text-green-800 font-semibold">Flexible Return Policy & Instant Availability</h3>
        </div>
        <div className="text-green-700 text-sm">
          <p>
            <strong>Flexible Returns:</strong> Any staff member can receive car returns from any customer - there are no restrictions based on who originally handed over the vehicle.
          </p>
          <p className="mt-1">
            <strong>Instant Availability:</strong> When you mark a car as returned, it will <strong>immediately become available</strong> for new bookings by staff and customers. The system automatically updates the car status in real-time.
          </p>
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
          <span className="font-medium">Handover Cars</span>
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
          <span className="font-medium">Return Cars</span>
          {returnBookings.length > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              {returnBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'handover' && (
          <Card className="border border-gray-200">
            {paginatedHandoverBookings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <HandHeart className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Ready for Handover</h2>
                  <span className="text-sm text-gray-600">({handoverBookings.length} cars)</span>
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
              <EmptyStateCard type="handover" />
            )}
          </Card>
        )}
        
        {activeTab === 'return' && (
          <Card className="border border-gray-200">
            {paginatedReturnBookings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <RotateCcw className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Active Rentals (Handed Over)</h2>
                  <span className="text-sm text-gray-600">({returnBookings.length} cars)</span>
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
              <EmptyStateCard type="return" />
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
          isAdmin={false}
        />
      )}
      
      {/* Enhanced Payment Modal */}
      {showEnhancedPaymentModal && enhancedPaymentData && (
        <EnhancedCombinedPaymentInvoiceModal
          isOpen={showEnhancedPaymentModal}
          onClose={() => {
            setShowEnhancedPaymentModal(false);
            setEnhancedPaymentData(null);
          }}
          bookingData={enhancedPaymentData.bookingData}
          paymentMethod={enhancedPaymentData.paymentMethod}
          invoiceData={enhancedPaymentData.invoiceData}
        />
      )}
    </motion.div>
  );
};

export default HandoverReturnCar;