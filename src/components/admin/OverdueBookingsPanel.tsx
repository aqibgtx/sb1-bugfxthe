import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  User, 
  Car, 
  Phone, 
  Mail,
  RefreshCw,
  Calendar,
  Plus,
  CheckCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface OverdueBooking {
  booking_id: string;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  car_name: string;
  car_plate_number: string;
  original_end_date: string;
  days_overdue: number;
  daily_rate: number;
  amount_overdue: number;
  severity: 'info' | 'warning' | 'critical';
}

interface OverdueBookingsPanelProps {
  overdueBookings: OverdueBooking[];
  loading: boolean;
  onRefresh: () => void;
  onRunOverdueCheck: () => Promise<void>;
  onCreateExtension?: (bookingId: string) => void;
}

const OverdueBookingsPanel: React.FC<OverdueBookingsPanelProps> = ({
  overdueBookings,
  loading,
  onRefresh,
  onRunOverdueCheck,
  onCreateExtension
}) => {
  const [runningCheck, setRunningCheck] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;

  // Pagination
  const totalPages = Math.ceil(overdueBookings.length / bookingsPerPage);
  const startIndex = (currentPage - 1) * bookingsPerPage;
  const paginatedBookings = overdueBookings.slice(startIndex, startIndex + bookingsPerPage);

  const handleRunCheck = async () => {
    setRunningCheck(true);
    try {
      await onRunOverdueCheck();
    } catch (error) {
      console.error('Error running overdue check:', error);
    } finally {
      setRunningCheck(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const criticalBookings = overdueBookings.filter(b => b.severity === 'critical');
  const warningBookings = overdueBookings.filter(b => b.severity === 'warning');
  const totalAmountOverdue = overdueBookings.reduce((sum, b) => sum + (b.amount_overdue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Overdue Payments</h2>
          <p className="text-gray-700">Monitor and manage customers with overdue rental payments</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleRunCheck}
            disabled={runningCheck}
            variant="secondary"
            className="flex items-center space-x-2 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${runningCheck ? 'animate-spin' : ''}`} />
            <span>{runningCheck ? 'Checking...' : 'Run Check'}</span>
          </Button>
          
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="ghost"
            className="flex items-center space-x-2 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-xl font-bold text-gray-900">{criticalBookings.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Warning</p>
              <p className="text-xl font-bold text-gray-900">{warningBookings.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Overdue</p>
              <p className="text-xl font-bold text-gray-900">{overdueBookings.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount Due</p>
              <p className="text-xl font-bold text-gray-900">RM {totalAmountOverdue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overdue Bookings List */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overdue Bookings</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading overdue bookings...</p>
            </div>
          ) : overdueBookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Overdue Payments</h4>
              <p className="text-gray-600">All customers are up to date with their payments.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedBookings.map((booking, index) => (
                  <motion.div
                    key={booking.booking_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-l-4 p-4 rounded-lg ${
                      booking.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      booking.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="font-mono text-sm font-medium">#{booking.booking_number}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(booking.severity)}`}>
                            {booking.severity?.toUpperCase() || 'INFO'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{booking.customer_name}</p>
                              <p className="text-gray-600 truncate">{booking.customer_email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Car className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{booking.car_name}</p>
                              <p className="text-gray-600">{booking.car_plate_number}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">Due: {new Date(booking.original_end_date).toLocaleDateString()}</p>
                              <p className="text-gray-600">{booking.days_overdue} days overdue</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">RM {(booking.amount_overdue || 0).toFixed(2)} overdue</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-600">Daily rate: RM {(booking.daily_rate || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => window.location.href = `mailto:${booking.customer_email}`}
                          variant="secondary"
                          size="sm"
                          className="flex items-center space-x-2 min-h-[44px] md:min-h-[36px]"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Email</span>
                        </Button>

                        {booking.customer_phone && (
                          <Button
                            onClick={() => window.location.href = `tel:${booking.customer_phone}`}
                            variant="secondary"
                            size="sm"
                            className="flex items-center space-x-2 min-h-[44px] md:min-h-[36px]"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Call</span>
                          </Button>
                        )}

                        {onCreateExtension && (
                          <Button
                            onClick={() => onCreateExtension(booking.booking_id)}
                            size="sm"
                            className="flex items-center space-x-2 min-h-[44px] md:min-h-[36px]"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Extend</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + bookingsPerPage, overdueBookings.length)} of {overdueBookings.length} bookings
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="min-h-[44px] md:min-h-[36px]"
                    >
                      Previous
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="min-h-[44px] md:min-h-[36px] min-w-[44px] md:min-w-[36px]"
                      >
                        {page}
                      </Button>
                    ))}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="min-h-[44px] md:min-h-[36px]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OverdueBookingsPanel;