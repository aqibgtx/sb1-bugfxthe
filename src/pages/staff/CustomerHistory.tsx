import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Calendar, Car, DollarSign, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import toast from 'react-hot-toast';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const StaffCustomerHistory: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Pagination state
  const [customersPagination, setCustomersPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15
  });

  const [bookingsPagination, setBookingsPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  const { fetchUsers, fetchBookings } = useSupabaseData();

  // Batch data fetching function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Batch fetch customers with pagination
      const { data: usersData, count: usersCount } = await fetchUsers({
        page: customersPagination.currentPage,
        limit: customersPagination.itemsPerPage
      });
      
      // Filter only customers
      const customerUsers = usersData.filter(user => 
        user.role === 'customer' && user.approved && user.active
      );
      
      setCustomers(customerUsers);
      setFilteredCustomers(customerUsers);
      
      // Update pagination
      setCustomersPagination(prev => ({
        ...prev,
        totalItems: usersCount || 0,
        totalPages: Math.ceil((usersCount || 0) / prev.itemsPerPage)
      }));

      // If customer is selected, fetch their bookings
      if (selectedCustomer) {
        await loadCustomerBookings(selectedCustomer);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, customersPagination.currentPage, customersPagination.itemsPerPage, selectedCustomer]);

  // Load customer bookings with pagination
  const loadCustomerBookings = useCallback(async (customerId: string) => {
    try {
      setBookingsLoading(true);
      
      const { data: bookingsData, count: bookingsCount } = await fetchBookings({
        page: bookingsPagination.currentPage,
        limit: bookingsPagination.itemsPerPage
      });
      
      // Filter bookings for selected customer
      const customerBookings = bookingsData.filter(booking => 
        booking.customer_id === customerId
      );
      
      setBookings(customerBookings);
      
      // Update bookings pagination
      setBookingsPagination(prev => ({
        ...prev,
        totalItems: customerBookings.length,
        totalPages: Math.ceil(customerBookings.length / prev.itemsPerPage)
      }));
      
    } catch (error) {
      console.error('Error loading customer bookings:', error);
      toast.error('Failed to load customer bookings');
    } finally {
      setBookingsLoading(false);
    }
  }, [fetchBookings, bookingsPagination.currentPage, bookingsPagination.itemsPerPage]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter customers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Refresh data function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
      toast.success('Customer data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  // Customer selection handler
  const handleCustomerSelect = useCallback((customer: any) => {
    setSelectedCustomer(customer.id);
    setSelectedCustomerData(customer);
    setSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    
    // Reset bookings pagination when selecting new customer
    setBookingsPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Clear customer selection
  const clearCustomerSelection = useCallback(() => {
    setSelectedCustomer('');
    setSelectedCustomerData(null);
    setSearchTerm('');
    setShowCustomerDropdown(false);
    setBookings([]);
    setBookingsPagination(prev => ({ ...prev, currentPage: 1, totalPages: 1, totalItems: 0 }));
  }, []);

  // Pagination handlers
  const handleCustomersPageChange = useCallback((page: number) => {
    setCustomersPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handleBookingsPageChange = useCallback((page: number) => {
    setBookingsPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Pagination component
  const PaginationControls: React.FC<{
    pagination: PaginationState;
    onPageChange: (page: number) => void;
    loading?: boolean;
  }> = ({ pagination, onPageChange, loading = false }) => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6 px-4">
        <div className="text-sm text-gray-700">
          Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
          {pagination.totalItems} results
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || loading}
            className="touch-target"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              const isActive = page === pagination.currentPage;
              
              return (
                <Button
                  key={page}
                  variant={isActive ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  disabled={loading}
                  className="touch-target min-w-[44px]"
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages || loading}
            className="touch-target"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Calculate stats
  const totalBookings = bookings.length;
  const totalSpent = bookings
    .filter(booking => booking.payment_status === 'paid')
    .reduce((sum, booking) => sum + parseFloat(booking.total_amount || 0), 0);
  const completedBookings = bookings.filter(b => b.payment_status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-12 h-12"></div>
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Customer History</h1>
          <p className="text-gray-700 text-sm md:text-base">View detailed rental history for any customer</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="secondary"
          className="flex items-center space-x-2 touch-target"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Customer Search */}
      <Card className="border border-gray-200 bg-white">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center space-x-2">
          <Search className="w-5 md:w-6 h-5 md:h-6" />
          <span>Search Customer</span>
        </h3>
        
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full pl-12 pr-12 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target"
            />
            {selectedCustomerData && (
              <button
                type="button"
                onClick={clearCustomerSelection}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Customer Dropdown */}
          {showCustomerDropdown && !selectedCustomerData && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                <>
                  {filteredCustomers.map((customer, index) => (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 touch-target"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-medium">{customer.name}</h4>
                          <div className="text-gray-600 text-sm space-y-1">
                            <p>📧 {customer.email}</p>
                            {customer.phone && <p>📱 {customer.phone}</p>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  <PaginationControls
                    pagination={customersPagination}
                    onPageChange={handleCustomersPageChange}
                    loading={loading}
                  />
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No customers found matching your search' : 'No approved customers available'}
                </div>
              )}
            </div>
          )}

          {/* Selected Customer Display */}
          {selectedCustomerData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900 font-semibold text-lg">{selectedCustomerData.name}</h4>
                  <div className="text-gray-700 text-sm space-y-1">
                    <p>📧 {selectedCustomerData.email}</p>
                    {selectedCustomerData.phone && <p>📱 {selectedCustomerData.phone}</p>}
                    {selectedCustomerData.ic_number && <p>🆔 {selectedCustomerData.ic_number}</p>}
                  </div>
                </div>
                <div className="text-green-600">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    ✓ SELECTED
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {/* Customer Details & History */}
      {selectedCustomerData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 md:space-y-8"
        >
          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card className="text-center border border-gray-200 bg-white">
              <div className="p-4">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{totalBookings}</div>
                <div className="text-gray-700 text-sm">Total Bookings</div>
              </div>
            </Card>

            <Card className="text-center border border-gray-200 bg-white">
              <div className="p-4">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-green-500 rounded-full">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">RM {totalSpent.toLocaleString()}</div>
                <div className="text-gray-700 text-sm">Total Spent</div>
              </div>
            </Card>

            <Card className="text-center border border-gray-200 bg-white">
              <div className="p-4">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-purple-500 rounded-full">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{completedBookings}</div>
                <div className="text-gray-700 text-sm">Completed</div>
              </div>
            </Card>
          </div>

          {/* Booking History */}
          <Card className="border border-gray-200 bg-white">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Booking History</h3>
              {bookingsLoading && (
                <div className="loading-spinner w-6 h-6"></div>
              )}
            </div>
            
            {bookings.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm">Booking ID</th>
                        <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm">Car</th>
                        <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm">Duration</th>
                        <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm">Amount</th>
                        <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking, index) => (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="font-mono text-gray-900 text-sm">#{booking.booking_number}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Car className="w-4 h-4 text-gray-600" />
                              <span className="text-gray-900 text-sm">{booking.car?.brand} {booking.car?.make}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-gray-800 text-sm">
                              <p>{new Date(booking.start_date).toLocaleDateString()}</p>
                              <p>to {new Date(booking.end_date).toLocaleDateString()}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-900 font-medium text-sm">RM {booking.total_amount}</span>
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge status={booking.payment_status as any} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <PaginationControls
                  pagination={bookingsPagination}
                  onPageChange={handleBookingsPageChange}
                  loading={bookingsLoading}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Booking History</h4>
                <p className="text-gray-600">This customer hasn't made any bookings yet.</p>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {!selectedCustomer && (
        <Card className="text-center py-12 border border-gray-200 bg-white">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Search for a Customer</h3>
          <p className="text-gray-700">Use the search box above to find customers by name, email, or phone number.</p>
        </Card>
      )}
    </motion.div>
  );
};

export default StaffCustomerHistory;