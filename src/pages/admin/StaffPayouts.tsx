import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Truck, 
  Calculator,
  Download,
  Eye,
  RefreshCw,
  Crown,
  UserPlus,
  Navigation,
  Clock,
  AlertTriangle,
  Flag,
  Car,
  Edit,
  Plus,
  Minus,
  Save,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Staff Type Definitions
interface StaffType {
  id: string;
  name: string;
  basicSalary: number;
  description: string;
  color: string;
  icon: any;
}

interface StaffPayout {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_type: string;
  basic_salary: number;
  
  // Field Staff specific (calculated from bookings)
  total_delivery_km?: number;
  delivery_allowance?: number;
  referral_commission?: number;
  
  // Performance metrics (from bookings)
  total_bookings?: number;
  total_booking_value?: number;
  approved_bookings?: number;
  completed_bookings?: number;
  
  // Payment metrics
  total_payments_processed?: number;
  payment_approval_rate?: number;
  
  // General
  total_earnings: number;
  net_payout: number;
  bookings: any[];
  payments: any[];
}

const STAFF_TYPES: StaffType[] = [
  {
    id: 'field_staff',
    name: 'Field Staff',
    basicSalary: 1500,
    description: 'Customer service, delivery, and field operations',
    color: 'from-blue-500 to-blue-600',
    icon: Truck
  },
  {
    id: 'marketing',
    name: 'Marketing',
    basicSalary: 1000,
    description: 'Posting, editing, managing pages',
    color: 'from-purple-500 to-purple-600',
    icon: TrendingUp
  },
  {
    id: 'database_registration',
    name: 'Database Registration',
    basicSalary: 800,
    description: 'Add/Edit/Upload customer documents',
    color: 'from-green-500 to-green-600',
    icon: Users
  },
  {
    id: 'accounting',
    name: 'Accounting / Payment / Tax',
    basicSalary: 2500,
    description: 'Handle accounting, payroll, and taxes',
    color: 'from-yellow-500 to-yellow-600',
    icon: Calculator
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    basicSalary: 3500,
    description: 'Manage company operations',
    color: 'from-orange-500 to-orange-600',
    icon: Crown
  },
  {
    id: 'director',
    name: 'Director',
    basicSalary: 10000,
    description: 'Oversee all department managers and company control',
    color: 'from-red-500 to-red-600',
    icon: Flag
  }
];

// Field Staff Commission Rates
const FIELD_STAFF_RATES = {
  DELIVERY_ALLOWANCE: 0.05, // RM0.05/km
  REFERRAL_COMMISSION: 10, // RM10 per referral
  BOOKING_COMMISSION: 0.02, // 2% of booking value
  COMPLETION_BONUS: 50, // RM50 per completed booking
};

// Pagination constants
const ITEMS_PER_PAGE = 15;

const AdminStaffPayouts: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [staffPayouts, setStaffPayouts] = useState<StaffPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffPayout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { fetchUsers, fetchBookings } = useSupabaseData();

  // Batch fetch all required data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Batch all data fetches
      const monthStart = new Date(selectedMonth + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const [staffResult, bookingsResult, paymentsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('role', 'staff')
          .eq('registration_status', 'approved')
          .eq('active', true),
        
        supabase
          .from('bookings')
          .select(`
            *,
            customer:customer_id(name, email),
            car:car_id(brand, make, plate_number)
          `)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
        
        supabase
          .from('payments')
          .select(`
            *,
            booking:booking_id(staff_id, customer_id, total_amount)
          `)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
      ]);

      if (staffResult.error) throw staffResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const staffMembers = staffResult.data || [];
      const monthBookings = bookingsResult.data || [];
      const monthPayments = paymentsResult.data || [];

      // Calculate payouts for each staff member
      const payouts: StaffPayout[] = await Promise.all(
        staffMembers.map(async (staff) => {
          const staffType = staff.staff_type || 'field_staff';
          const staffTypeConfig = STAFF_TYPES.find(type => type.id === staffType) || STAFF_TYPES[0];
          
          // Get staff's bookings
          const staffBookings = monthBookings?.filter(booking => booking.staff_id === staff.id) || [];
          
          // Get staff's payments (payments for bookings they handled)
          const staffPayments = monthPayments?.filter(payment => 
            payment.booking?.staff_id === staff.id
          ) || [];

          // Calculate referrals (users referred by this staff member)
          const { data: referrals } = await supabase
            .from('users')
            .select('id, created_at')
            .eq('referred_by', staff.id)
            .eq('registration_status', 'approved')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          // Calculate basic metrics
          const totalBookings = staffBookings.length;
          const approvedBookings = staffBookings.filter(b => b.booking_status === 'approved').length;
          const completedBookings = staffBookings.filter(b => b.booking_status === 'completed').length;
          const totalBookingValue = staffBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

          // Calculate payment metrics
          const totalPaymentsProcessed = staffPayments.length;
          const approvedPayments = staffPayments.filter(p => p.admin_approval_status === 'approved').length;
          const paymentApprovalRate = totalPaymentsProcessed > 0 ? (approvedPayments / totalPaymentsProcessed) * 100 : 0;

          // Calculate field staff specific metrics
          let totalDeliveryKm = 0;
          let deliveryAllowance = 0;
          let referralCommission = 0;
          let bookingCommission = 0;
          let completionBonus = 0;

          if (staffType === 'field_staff') {
            // Calculate delivery kilometers
            staffBookings.forEach(booking => {
              if (booking.delivery_type !== 'self_pickup' && booking.delivery_distance) {
                totalDeliveryKm += booking.delivery_distance;
              }
            });

            deliveryAllowance = totalDeliveryKm * FIELD_STAFF_RATES.DELIVERY_ALLOWANCE;
            referralCommission = (referrals?.length || 0) * FIELD_STAFF_RATES.REFERRAL_COMMISSION;
            bookingCommission = totalBookingValue * FIELD_STAFF_RATES.BOOKING_COMMISSION;
            completionBonus = completedBookings * FIELD_STAFF_RATES.COMPLETION_BONUS;
          }

          // Calculate total earnings
          const totalEarnings = staffTypeConfig.basicSalary + deliveryAllowance + referralCommission + bookingCommission + completionBonus;
          const netPayout = totalEarnings; // No deductions calculated from bookings/payments only

          const payout: StaffPayout = {
            staff_id: staff.id,
            staff_name: staff.name,
            staff_email: staff.email,
            staff_type: staffType,
            basic_salary: staffTypeConfig.basicSalary,
            
            // Field staff specific
            total_delivery_km: totalDeliveryKm,
            delivery_allowance: deliveryAllowance,
            referral_commission: referralCommission,
            
            // Performance metrics
            total_bookings: totalBookings,
            total_booking_value: totalBookingValue,
            approved_bookings: approvedBookings,
            completed_bookings: completedBookings,
            
            // Payment metrics
            total_payments_processed: totalPaymentsProcessed,
            payment_approval_rate: paymentApprovalRate,
            
            // Totals
            total_earnings: totalEarnings,
            net_payout: netPayout,
            bookings: staffBookings,
            payments: staffPayments
          };

          return payout;
        })
      );

      setStaffPayouts(payouts);
      setTotalPages(Math.ceil(payouts.length / ITEMS_PER_PAGE));
      setCurrentPage(1); // Reset to first page when data changes
      
    } catch (error) {
      console.error('Error loading staff payouts:', error);
      toast.error('Failed to load staff payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth]);

  const handleRefresh = async () => {
    await fetchAllData();
    toast.success('Staff payouts refreshed');
  };

  const handleExportCSV = () => {
    const csvData = staffPayouts.map(payout => {
      const baseData = `${payout.staff_name},${payout.staff_email},${payout.staff_type},${payout.basic_salary}`;
      
      if (payout.staff_type === 'field_staff') {
        return `${baseData},${payout.total_delivery_km || 0},${payout.delivery_allowance || 0},${payout.referral_commission || 0},${payout.total_bookings || 0},${payout.completed_bookings || 0},${payout.total_payments_processed || 0},${payout.total_earnings},${payout.net_payout}`;
      }
      
      return `${baseData},0,0,0,${payout.total_bookings || 0},${payout.completed_bookings || 0},${payout.total_payments_processed || 0},${payout.total_earnings},${payout.net_payout}`;
    }).join('\n');
    
    const headers = 'Staff Name,Email,Type,Basic Salary,Delivery KM,Delivery Allowance,Referral Commission,Total Bookings,Completed Bookings,Payments Processed,Total Earnings,Net Payout\n';
    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-payouts-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Staff payouts exported to CSV');
  };

  // Pagination logic
  const paginatedPayouts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return staffPayouts.slice(startIndex, endIndex);
  }, [staffPayouts, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalStats = useMemo(() => {
    const statsByType = STAFF_TYPES.map(type => ({
      type: type.name,
      count: staffPayouts.filter(p => p.staff_type === type.id).length,
      totalPayout: staffPayouts
        .filter(p => p.staff_type === type.id)
        .reduce((sum, p) => sum + p.net_payout, 0)
    }));

    return {
      totalStaff: staffPayouts.length,
      totalPayouts: staffPayouts.reduce((sum, p) => sum + p.net_payout, 0),
      totalEarnings: staffPayouts.reduce((sum, p) => sum + p.total_earnings, 0),
      totalBookings: staffPayouts.reduce((sum, p) => sum + (p.total_bookings || 0), 0),
      totalBookingValue: staffPayouts.reduce((sum, p) => sum + (p.total_booking_value || 0), 0),
      statsByType
    };
  }, [staffPayouts]);

  const getStaffTypeConfig = (typeId: string) => {
    return STAFF_TYPES.find(type => type.id === typeId) || STAFF_TYPES[0];
  };

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, staffPayouts.length)} of {staffPayouts.length} staff
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          
          {pageNumbers.map(page => (
            <Button
              key={page}
              size="sm"
              variant={currentPage === page ? "primary" : "ghost"}
              onClick={() => handlePageChange(page)}
              className="min-w-[44px]"
            >
              {page}
            </Button>
          ))}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center space-x-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
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
      className="space-y-6 mobile-container"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Staff Payouts</h1>
          <p className="text-gray-700 text-sm md:text-base">Performance-based payroll calculated from bookings and payments data</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 mobile-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 mobile-button"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card className="mobile-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Payroll Period</h3>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="mobile-grid">
        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totalStats.totalStaff}</div>
          <div className="text-gray-700 text-sm">Total Staff</div>
        </Card>

        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">RM {totalStats.totalPayouts.toLocaleString()}</div>
          <div className="text-gray-700 text-sm">Total Payouts</div>
        </Card>

        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full">
              <Car className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totalStats.totalBookings}</div>
          <div className="text-gray-700 text-sm">Total Bookings</div>
        </Card>

        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">RM {totalStats.totalBookingValue.toLocaleString()}</div>
          <div className="text-gray-700 text-sm">Booking Value</div>
        </Card>
      </div>

      {/* Staff Types Overview */}
      <Card className="mobile-card">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Types & Compensation Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAFF_TYPES.map((type) => {
              const Icon = type.icon;
              const staffCount = staffPayouts.filter(p => p.staff_type === type.id).length;
              const totalPayout = staffPayouts
                .filter(p => p.staff_type === type.id)
                .reduce((sum, p) => sum + p.net_payout, 0);
              
              return (
                <div key={type.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 bg-gradient-to-r ${type.color} rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{type.name}</h4>
                      <p className="text-sm text-gray-600">{staffCount} staff</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{type.description}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Base Salary:</span>
                      <span className="font-bold text-green-600">
                        RM {type.basicSalary.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Payout:</span>
                      <span className="font-bold text-blue-600">
                        RM {totalPayout.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Field Staff Commission Structure */}
      <Card className="mobile-card">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Field Staff Commission Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Delivery Allowance</span>
              </div>
              <p className="text-sm text-green-800">RM0.05 per kilometer</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Referral Commission</span>
              </div>
              <p className="text-sm text-blue-800">RM10 per successful referral</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Booking Commission</span>
              </div>
              <p className="text-sm text-purple-800">2% of total booking value</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Flag className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">Completion Bonus</span>
              </div>
              <p className="text-sm text-orange-800">RM50 per completed booking</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Staff Payouts Table */}
      <Card>
        <div className="mobile-card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Staff Payout Details</h3>
          
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-4">
            {paginatedPayouts.map((payout, index) => {
              const typeConfig = getStaffTypeConfig(payout.staff_type);
              const Icon = typeConfig.icon;
              
              return (
                <motion.div
                  key={payout.staff_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 bg-gradient-to-r ${typeConfig.color} rounded-lg`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{payout.staff_name}</h4>
                        <p className="text-sm text-gray-600">{typeConfig.name}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(payout);
                        setShowDetails(true);
                      }}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Details</span>
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Basic Salary</p>
                      <p className="font-medium text-gray-900">RM {payout.basic_salary.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bookings</p>
                      <p className="font-medium text-gray-900">{payout.total_bookings || 0}</p>
                    </div>
                    {payout.staff_type === 'field_staff' && (
                      <>
                        <div>
                          <p className="text-gray-600">Delivery KM</p>
                          <p className="font-medium text-gray-900">{payout.total_delivery_km || 0} km</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Allowance</p>
                          <p className="font-medium text-green-600">RM {(payout.delivery_allowance || 0).toFixed(2)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-gray-600">Completed</p>
                      <p className="font-medium text-blue-600">{payout.completed_bookings || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payments</p>
                      <p className="font-medium text-purple-600">{payout.total_payments_processed || 0}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total Payout:</span>
                      <span className="text-xl font-bold text-green-600">RM {payout.net_payout.toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block mobile-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Staff</th>
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Type</th>
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Basic Salary</th>
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Performance</th>
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Commissions</th>
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Total Payout</th>
                  <th className="text-left py-4 px-4 text-gray-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayouts.map((payout, index) => {
                  const typeConfig = getStaffTypeConfig(payout.staff_type);
                  const Icon = typeConfig.icon;
                  
                  return (
                    <motion.tr
                      key={payout.staff_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 bg-gradient-to-r ${typeConfig.color} rounded-lg`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{payout.staff_name}</p>
                            <p className="text-sm text-gray-600">{payout.staff_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-900 font-medium">{typeConfig.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-900 font-medium">RM {payout.basic_salary.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{payout.total_bookings || 0} bookings</p>
                          <p className="text-blue-600">{payout.completed_bookings || 0} completed</p>
                          <p className="text-purple-600">{payout.total_payments_processed || 0} payments</p>
                          {payout.payment_approval_rate > 0 && (
                            <p className="text-green-600">{payout.payment_approval_rate.toFixed(1)}% approval</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {payout.staff_type === 'field_staff' ? (
                          <div className="text-sm">
                            <p className="text-green-600">+RM {(payout.delivery_allowance || 0).toFixed(2)} delivery</p>
                            <p className="text-blue-600">+RM {payout.referral_commission || 0} referrals</p>
                            <p className="text-purple-600">+RM {((payout.total_booking_value || 0) * 0.02).toFixed(2)} commission</p>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xl font-bold text-green-600">RM {payout.net_payout.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedStaff(payout);
                            setShowDetails(true);
                          }}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Details</span>
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <PaginationControls />

          {staffPayouts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Staff Data</h3>
              <p className="text-gray-600">No staff members found for the selected month.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Staff Details Modal */}
      {showDetails && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {(() => {
                  const typeConfig = getStaffTypeConfig(selectedStaff.staff_type);
                  const Icon = typeConfig.icon;
                  return (
                    <div className={`p-3 bg-gradient-to-r ${typeConfig.color} rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedStaff.staff_name}</h2>
                  <p className="text-gray-700">{getStaffTypeConfig(selectedStaff.staff_type).name} - {selectedMonth}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Payout Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="text-center p-4">
                  <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">RM {selectedStaff.basic_salary.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Basic Salary</div>
                </Card>
                
                <Card className="text-center p-4">
                  <Car className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{selectedStaff.total_bookings || 0}</div>
                  <div className="text-sm text-gray-600">Total Bookings</div>
                </Card>

                <Card className="text-center p-4">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">RM {(selectedStaff.total_booking_value || 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Booking Value</div>
                </Card>

                <Card className="text-center p-4">
                  <Calculator className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">RM {selectedStaff.net_payout.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Payout</div>
                </Card>
              </div>

              {/* Field Staff Detailed Breakdown */}
              {selectedStaff.staff_type === 'field_staff' && (
                <Card className="mb-6">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Field Staff Performance Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Bookings:</span>
                            <span className="text-gray-900 font-medium">{selectedStaff.total_bookings || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Approved Bookings:</span>
                            <span className="text-green-600 font-medium">{selectedStaff.approved_bookings || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed Bookings:</span>
                            <span className="text-blue-600 font-medium">{selectedStaff.completed_bookings || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery Distance:</span>
                            <span className="text-gray-900 font-medium">{selectedStaff.total_delivery_km || 0} km</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payments Processed:</span>
                            <span className="text-purple-600 font-medium">{selectedStaff.total_payments_processed || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Approval Rate:</span>
                            <span className="text-green-600 font-medium">{(selectedStaff.payment_approval_rate || 0).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Commission Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery Allowance:</span>
                            <span className="text-green-600 font-medium">+RM {(selectedStaff.delivery_allowance || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Referral Commission:</span>
                            <span className="text-blue-600 font-medium">+RM {selectedStaff.referral_commission || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Booking Commission (2%):</span>
                            <span className="text-purple-600 font-medium">+RM {((selectedStaff.total_booking_value || 0) * 0.02).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completion Bonus:</span>
                            <span className="text-orange-600 font-medium">+RM {((selectedStaff.completed_bookings || 0) * 50).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Recent Bookings */}
              {selectedStaff.bookings && selectedStaff.bookings.length > 0 && (
                <Card className="mb-6">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                    <div className="space-y-3">
                      {selectedStaff.bookings.slice(0, 5).map((booking, index) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              <Car className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">#{booking.booking_number}</p>
                              <p className="text-sm text-gray-600">{booking.car_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              RM {booking.total_amount?.toLocaleString() || '0'}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">
                              {booking.booking_status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Recent Payments */}
              {selectedStaff.payments && selectedStaff.payments.length > 0 && (
                <Card>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments Processed</h3>
                    <div className="space-y-3">
                      {selectedStaff.payments.slice(0, 5).map((payment, index) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-green-100 text-green-600">
                              <DollarSign className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{payment.payment_method_code}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              RM {payment.amount?.toLocaleString() || '0'}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">
                              {payment.admin_approval_status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminStaffPayouts;