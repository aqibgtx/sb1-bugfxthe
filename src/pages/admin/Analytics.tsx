import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Car, 
  Calendar,
  AlertTriangle,
  Users,
  Clock,
  Target,
  RefreshCw,
  Download,
  Filter,
  X,
  ChevronDown
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import toast from 'react-hot-toast';

interface BusinessMetrics {
  // Revenue Metrics
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  
  // Operational Metrics
  totalBookings: number;
  completedBookings: number;
  averageBookingValue: number;
  
  // Fleet Metrics
  totalCars: number;
  activeRentals: number;
  utilizationRate: number;
  
  // Problem Areas
  overduePayments: number;
  overdueAmount: number;
  pendingApprovals: number;
  
  // Trends
  monthlyData: any[];
  topPerformingCars: any[];
  bookingStatusData: any[];
  paymentMethodData: any[];
}

interface FilterOptions {
  dateRange: 'custom' | '7days' | '30days' | '3months' | '6months' | '1year';
  customStartDate: string;
  customEndDate: string;
  carStatus: 'all' | 'available' | 'rented' | 'maintenance';
  bookingStatus: 'all' | 'pending_approval' | 'approved' | 'ongoing' | 'completed' | 'cancelled';
  paymentStatus: 'all' | 'pending' | 'approved' | 'completed' | 'cancelled';
  staffFilter: 'all' | 'with_staff' | 'self_booking';
  revenueThreshold: number;
}

const AdminAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '3months',
    customStartDate: '',
    customEndDate: '',
    carStatus: 'all',
    bookingStatus: 'all',
    paymentStatus: 'all',
    staffFilter: 'all',
    revenueThreshold: 0
  });
  
  const { fetchCars, fetchBookings, fetchPayments, fetchUsers } = useSupabaseData();

  useEffect(() => {
    loadBusinessMetrics();
  }, [filters]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();

    if (filters.dateRange === 'custom') {
      startDate = filters.customStartDate ? new Date(filters.customStartDate) : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = filters.customEndDate ? new Date(filters.customEndDate) : now;
    } else {
      const days = {
        '7days': 7,
        '30days': 30,
        '3months': 90,
        '6months': 180,
        '1year': 365
      }[filters.dateRange] || 90;
      
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const loadBusinessMetrics = async () => {
    try {
      setLoading(true);
      
      const [carsResult, bookingsResult, paymentsResult, usersResult] = await Promise.all([
        fetchCars(),
        fetchBookings(),
        fetchPayments(),
        fetchUsers()
      ]);

      const cars = carsResult.data || [];
      const bookings = bookingsResult.data || [];
      const payments = paymentsResult.data || [];
      const users = usersResult.data || [];

      const { startDate, endDate } = getDateRange();

      // Apply filters
      const filteredCars = cars.filter(car => 
        filters.carStatus === 'all' || car.status === filters.carStatus
      );

      const filteredBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        const dateInRange = bookingDate >= startDate && bookingDate <= endDate;
        const statusMatch = filters.bookingStatus === 'all' || booking.booking_status === filters.bookingStatus;
        const staffMatch = filters.staffFilter === 'all' || 
          (filters.staffFilter === 'with_staff' && booking.staff_id) ||
          (filters.staffFilter === 'self_booking' && !booking.staff_id);
        
        return dateInRange && statusMatch && staffMatch;
      });

      const filteredPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        const dateInRange = paymentDate >= startDate && paymentDate <= endDate;
        const statusMatch = filters.paymentStatus === 'all' || payment.admin_approval_status === filters.paymentStatus;
        const amountMatch = parseFloat(payment.amount || '0') >= filters.revenueThreshold;
        
        return dateInRange && statusMatch && amountMatch;
      });

      // Calculate current and previous period for growth comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = startDate;

      const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);

      // Revenue calculations (only from approved payments)
      const approvedPayments = filteredPayments.filter(p => p.admin_approval_status === 'approved');
      const totalRevenue = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      
      const currentMonthRevenue = approvedPayments
        .filter(p => new Date(p.created_at) >= currentMonthStart)
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      
      const lastMonthRevenue = approvedPayments
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          return paymentDate >= lastMonthStart && paymentDate < currentMonthStart;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // Booking metrics
      const completedBookings = filteredBookings.filter(b => b.booking_status === 'completed').length;
      const averageBookingValue = filteredBookings.length > 0 
        ? totalRevenue / filteredBookings.length 
        : 0;

      // Fleet metrics
      const activeRentals = filteredCars.filter(c => c.status === 'rented').length;
      const utilizationRate = filteredCars.length > 0 ? (activeRentals / filteredCars.length) * 100 : 0;

      // Problem areas
      const overdueThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const overduePayments = filteredPayments.filter(p => 
        p.admin_approval_status === 'pending' && 
        new Date(p.created_at) < overdueThreshold
      ).length;
      
      const overdueAmount = filteredPayments
        .filter(p => 
          p.admin_approval_status === 'pending' && 
          new Date(p.created_at) < overdueThreshold
        )
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const pendingApprovals = filteredBookings.filter(b => b.booking_status === 'pending_approval').length;

      // Generate monthly trend data
      const monthlyData = [];
      const monthsToShow = Math.min(12, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0);
        
        const monthBookings = filteredBookings.filter(b => {
          const bookingDate = new Date(b.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });
        
        const monthRevenue = approvedPayments
          .filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate >= monthStart && paymentDate <= monthEnd;
          })
          .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

        monthlyData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: Math.round(monthRevenue),
          bookings: monthBookings.length,
          completed: monthBookings.filter(b => b.booking_status === 'completed').length,
          cancelled: monthBookings.filter(b => b.booking_status === 'cancelled').length
        });
      }

      // Top performing cars (by revenue)
      const carRevenue = filteredCars.map(car => {
        const carBookings = filteredBookings.filter(b => b.car_id === car.id);
        const carPayments = approvedPayments.filter(p => 
          carBookings.some(b => b.id === p.booking_id)
        );
        const revenue = carPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        
        return {
          name: `${car.brand} ${car.make}`,
          plateNumber: car.plate_number,
          revenue: Math.round(revenue),
          bookings: carBookings.length,
          status: car.status,
          utilizationRate: carBookings.length > 0 ? (carBookings.filter(b => b.booking_status === 'completed').length / carBookings.length) * 100 : 0
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      // Booking status distribution
      const bookingStatusCounts = filteredBookings.reduce((acc, booking) => {
        acc[booking.booking_status] = (acc[booking.booking_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bookingStatusData = Object.entries(bookingStatusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count,
        percentage: ((count / filteredBookings.length) * 100).toFixed(1)
      }));

      // Payment method distribution
      const paymentMethodCounts = filteredPayments.reduce((acc, payment) => {
        const method = payment.payment_method_code || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const paymentMethodData = Object.entries(paymentMethodCounts).map(([method, count]) => ({
        name: method,
        value: count,
        percentage: ((count / filteredPayments.length) * 100).toFixed(1)
      }));

      setMetrics({
        totalRevenue,
        monthlyRevenue: currentMonthRevenue,
        revenueGrowth,
        totalBookings: filteredBookings.length,
        completedBookings,
        averageBookingValue,
        totalCars: filteredCars.length,
        activeRentals,
        utilizationRate,
        overduePayments,
        overdueAmount,
        pendingApprovals,
        monthlyData,
        topPerformingCars: carRevenue,
        bookingStatusData,
        paymentMethodData
      });

    } catch (error) {
      console.error('Error loading business metrics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: '3months',
      customStartDate: '',
      customEndDate: '',
      carStatus: 'all',
      bookingStatus: 'all',
      paymentStatus: 'all',
      staffFilter: 'all',
      revenueThreshold: 0
    });
  };

  const handleRefresh = async () => {
    await loadBusinessMetrics();
    toast.success('Analytics refreshed');
  };

  const handleExport = () => {
    if (!metrics) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Date Range', `${filters.dateRange === 'custom' ? `${filters.customStartDate} to ${filters.customEndDate}` : filters.dateRange}`],
      ['Total Revenue', `RM ${metrics.totalRevenue.toLocaleString()}`],
      ['Monthly Revenue', `RM ${metrics.monthlyRevenue.toLocaleString()}`],
      ['Revenue Growth', `${metrics.revenueGrowth.toFixed(1)}%`],
      ['Total Bookings', metrics.totalBookings],
      ['Completed Bookings', metrics.completedBookings],
      ['Average Booking Value', `RM ${metrics.averageBookingValue.toFixed(2)}`],
      ['Fleet Utilization', `${metrics.utilizationRate.toFixed(1)}%`],
      ['Overdue Payments', metrics.overduePayments],
      ['Pending Approvals', metrics.pendingApprovals],
      [''],
      ['Top Performing Cars'],
      ['Car', 'Revenue', 'Bookings'],
      ...metrics.topPerformingCars.map(car => [car.name, `RM ${car.revenue}`, car.bookings])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Metrics exported');
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 h-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Business Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into your rental business performance</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50 text-blue-600' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          <Button variant="ghost" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.customStartDate}
                    onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.customEndDate}
                    onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Car Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Car Status</label>
              <select
                value={filters.carStatus}
                onChange={(e) => handleFilterChange('carStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Cars</option>
                <option value="available">Available</option>
                <option value="rented">Currently Rented</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            {/* Booking Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Status</label>
              <select
                value={filters.bookingStatus}
                onChange={(e) => handleFilterChange('bookingStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Bookings</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Payments</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Staff Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
              <select
                value={filters.staffFilter}
                onChange={(e) => handleFilterChange('staffFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Bookings</option>
                <option value="with_staff">Staff Assisted</option>
                <option value="self_booking">Self Bookings</option>
              </select>
            </div>

            {/* Revenue Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Revenue (RM)</label>
              <input
                type="number"
                value={filters.revenueThreshold}
                onChange={(e) => handleFilterChange('revenueThreshold', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                RM {metrics.totalRevenue.toLocaleString()}
              </p>
              <p className={`text-sm ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% from last month
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalBookings}</p>
              <p className="text-sm text-gray-500">
                {metrics.completedBookings} completed ({((metrics.completedBookings / metrics.totalBookings) * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fleet Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.utilizationRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">
                {metrics.activeRentals}/{metrics.totalCars} cars active
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Car className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
              <p className="text-2xl font-bold text-gray-900">
                RM {metrics.averageBookingValue.toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">Per booking</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Problem Areas */}
      {(metrics.overduePayments > 0 || metrics.pendingApprovals > 0) && (
        <Card className="p-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Attention Required</h3>
              <div className="space-y-2">
                {metrics.overduePayments > 0 && (
                  <p className="text-red-800">
                    <strong>{metrics.overduePayments}</strong> overdue payments worth{' '}
                    <strong>RM {metrics.overdueAmount.toLocaleString()}</strong>
                  </p>
                )}
                {metrics.pendingApprovals > 0 && (
                  <p className="text-red-800">
                    <strong>{metrics.pendingApprovals}</strong> bookings pending approval
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Booking Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#374151" 
                  tick={{ fill: '#374151', fontSize: 10 }}
                  tickMargin={8}
                  height={50}
                />
                <YAxis 
                  yAxisId="left" 
                  stroke="#374151" 
                  tick={{ fill: '#374151', fontSize: 10 }}
                  tickMargin={8}
                  width={60}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#374151" 
                  tick={{ fill: '#374151', fontSize: 10 }}
                  tickMargin={8}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  name="Revenue (RM)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  name="Bookings"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Booking Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={metrics.bookingStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${percentage}%`}
                  outerRadius={90}
                  innerRadius={30}
                  fill="#8884d8"
                  dataKey="value"
                  labelStyle={{ 
                    fill: '#374151', 
                    fontWeight: 600, 
                    fontSize: 11
                  }}
                >
                  {metrics.bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [`${value} bookings`, name]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Monthly Booking Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Booking Activity</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#374151" 
                  tick={{ fill: '#374151', fontSize: 10 }}
                  tickMargin={8}
                  height={50}
                />
                <YAxis 
                  stroke="#374151" 
                  tick={{ fill: '#374151', fontSize: 10 }}
                  tickMargin={8}
                  width={50}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="bookings" fill="#3b82f6" name="Total Bookings" />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Method Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={metrics.paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${percentage}%`}
                  outerRadius={90}
                  innerRadius={30}
                  fill="#8884d8"
                  dataKey="value"
                  labelStyle={{ 
                    fill: '#374151', 
                    fontWeight: 600, 
                    fontSize: 11
                  }}
                >
                  {metrics.paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [`${value} payments`, name]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Performing Cars */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Cars</h3>
        <div className="space-y-4">
          {metrics.topPerformingCars.map((car, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{car.name}</p>
                  <p className="text-sm text-gray-500">{car.plateNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">RM {car.revenue.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{car.bookings} bookings</p>
                <p className="text-xs text-gray-400">{car.utilizationRate.toFixed(1)}% completion rate</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                car.status === 'rented' ? 'bg-green-100 text-green-800' :
                car.status === 'available' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {car.status}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default AdminAnalytics;