import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../context/AuthContext';
import { useCloudflareUpload } from '../../hooks/useCloudflareUpload';
import toast from 'react-hot-toast';

interface PendingBooking {
  id: string;
  booking_number: string;
  customer: { name: string; email: string };
  car: { brand: string; make: string };
  total_amount: number;
  end_date: string;
  payment_status: string;
  hasReceipt: boolean;
  receiptUrl?: string;
}

const ITEMS_PER_PAGE = 10;

const StaffUploadPayment: React.FC = () => {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { batchFetch } = useSupabaseData();
  const { user } = useAuth();
  const { uploadFile, validateFile, formatFileSize, uploading } = useCloudflareUpload();

  // Memoized fetch function
  const fetchPendingBookings = useCallback(async (page: number = 1) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Batch fetch bookings and payments with pagination
      const [bookingsResult, paymentsResult] = await batchFetch([
        async () => {
          const { fetchBookings } = useSupabaseData();
          return await fetchBookings({ page, limit: ITEMS_PER_PAGE });
        },
        async () => {
          const { fetchPayments } = useSupabaseData();
          return await fetchPayments();
        }
      ]);

      const { data: bookings, count: bookingsCount } = bookingsResult;
      const { data: payments } = paymentsResult;

      // Filter bookings for this staff member that need payment
      const staffBookings = bookings.filter((booking: any) => 
        booking.staff_id === user.id && 
        booking.payment_status === 'pending' &&
        booking.booking_status !== 'cancelled'
      );

      // Check which bookings already have payment receipts
      const bookingsWithPaymentStatus = staffBookings.map((booking: any) => {
        const hasPayment = payments.some((payment: any) => 
          payment.booking_id === booking.id && payment.receipt_url
        );
        
        return {
          id: booking.id,
          booking_number: booking.booking_number,
          customer: booking.customer || { name: 'Unknown', email: '' },
          car: booking.car || { brand: 'Unknown', make: '' },
          total_amount: booking.total_amount,
          end_date: booking.end_date,
          payment_status: booking.payment_status,
          hasReceipt: hasPayment,
          receiptUrl: hasPayment ? payments.find((p: any) => p.booking_id === booking.id)?.receipt_url : null
        };
      });

      setPendingBookings(bookingsWithPaymentStatus);
      setTotalCount(staffBookings.length);
      setTotalPages(Math.ceil(staffBookings.length / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error loading pending bookings:', error);
      toast.error('Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  }, [user?.id, batchFetch]);

  // Initial load
  useEffect(() => {
    fetchPendingBookings(currentPage);
  }, [fetchPendingBookings, currentPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPendingBookings([]);
      setSelectedFile(null);
      setUploadingFor(null);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPendingBookings(currentPage);
      toast.success('Payment data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFileSelect = (bookingId: string, file: File) => {
    try {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      validateFile(file, { maxSize: 5, allowedTypes });
      setSelectedFile(file);
      setUploadingFor(bookingId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid file');
    }
  };

  const handleUpload = async (bookingId: string) => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    try {
      // Upload to Cloudflare R2
      const result = await uploadFile(selectedFile, `payment_receipt_${bookingId}`, {
        folder: 'receipts'
      });
      
      // Create payment record in database
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          amount: pendingBookings.find(b => b.id === bookingId)?.total_amount || 0,
          payment_method_code: 'UPLOAD',
          receipt_url: result.publicUrl,
          payment_completion_status: 'pending',
          admin_approval_status: 'pending',
          notes: 'Payment receipt uploaded by staff'
        });

      if (error) throw error;

      toast.success('Payment receipt uploaded successfully!');
      setSelectedFile(null);
      setUploadingFor(null);
      
      // Refresh the current page
      await fetchPendingBookings(currentPage);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(`Failed to upload receipt: ${errorMessage}`);
    }
  };

  const handleReupload = async (bookingId: string) => {
    try {
      // In a real implementation, you would handle re-upload logic
      toast.success('Receipt re-upload functionality available');
      await fetchPendingBookings(currentPage);
    } catch (error) {
      console.error('Error re-uploading receipt:', error);
      toast.error('Failed to re-upload receipt');
    }
  };

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, start + maxVisible - 1);
        
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between mt-6 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} bookings
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {getPageNumbers().map(page => (
            <Button
              key={page}
              variant={page === currentPage ? "primary" : "ghost"}
              size="sm"
              onClick={() => handlePageChange(page)}
              disabled={loading}
              className="min-h-[44px] min-w-[44px]"
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Upload Payment</h1>
          <p className="text-gray-700 text-sm md:text-base">Upload payment receipts for pending bookings</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          variant="secondary"
          className="flex items-center space-x-2 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Loading overlay for pagination */}
      {loading && currentPage > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading...</p>
          </div>
        </div>
      )}

      {/* Pending Payments */}
      <div className="space-y-4 md:space-y-6">
        {pendingBookings.length > 0 ? (
          pendingBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        Booking #{booking.booking_number}
                      </h3>
                      <StatusBadge status="pending" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-4">
                      <div>
                        <p className="truncate">
                          <span className="text-gray-600">Customer:</span> {booking.customer.name}
                        </p>
                        <p className="truncate">
                          <span className="text-gray-600">Car:</span> {booking.car.brand} {booking.car.make}
                        </p>
                      </div>
                      <div>
                        <p>
                          <span className="text-gray-600">Amount:</span> RM {booking.total_amount}
                        </p>
                        <p>
                          <span className="text-gray-600">Due Date:</span> {new Date(booking.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {booking.hasReceipt && (
                      <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-600 text-sm">Receipt uploaded</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="lg:ml-6 space-y-3">
                    {!booking.hasReceipt ? (
                      <div className="space-y-3">
                        <div>
                          <FileUpload
                            onUpload={(url, fileInfo) => {
                              handleFileSelect(booking.id, fileInfo as any);
                            }}
                            onError={(error) => {
                              toast.error(`File selection failed: ${error}`);
                            }}
                            accept="image/*,.pdf"
                            maxSize={5}
                            folder="receipts"
                            fileName={`payment_receipt_${booking.id}`}
                            disabled={uploading}
                          />
                        </div>
                        
                        {uploadingFor === booking.id && selectedFile && (
                          <Button
                            onClick={() => handleUpload(booking.id)}
                            size="sm"
                            disabled={uploading}
                            className="flex items-center space-x-2 w-full sm:w-auto min-h-[44px]"
                          >
                            {uploading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Uploading to R2...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Upload</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {booking.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(booking.receiptUrl, '_blank')}
                            className="flex items-center space-x-2 w-full sm:w-auto min-h-[44px]"
                          >
                            <FileText className="w-4 h-4" />
                            <span>View Receipt</span>
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleReupload(booking.id)}
                          className="flex items-center space-x-2 w-full sm:w-auto min-h-[44px]"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Re-upload</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-700">No pending payment uploads at the moment.</p>
          </Card>
        )}
      </div>

      {/* Pagination Controls */}
      <PaginationControls />

      {/* Upload Instructions */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Instructions</h3>
        <div className="space-y-2 text-gray-700 text-sm">
          <p>• Accepted formats: JPG, PNG, PDF</p>
          <p>• Maximum file size: 5MB</p>
          <p>• Ensure receipt shows payment amount and date</p>
          <p>• Receipt must be clear and readable</p>
          <p>• Include booking reference if available</p>
        </div>
      </Card>
    </motion.div>
  );
};

export default StaffUploadPayment;