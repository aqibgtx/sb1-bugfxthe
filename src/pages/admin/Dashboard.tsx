import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Car, Calendar, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SystemAlertsPanel from '../../components/admin/SystemAlertsPanel';
import OverdueBookingsPanel from '../../components/admin/OverdueBookingsPanel';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useOverduePayments } from '../../hooks/useOverduePayments';
import { usePaymentNotifications } from '../../hooks/usePaymentNotifications';
import { formatDateForDisplay } from '../../lib/utils';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<{
    users: any[];
    cars: any[];
    bookings: any[];
    payments: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { 
    fetchUsers, 
    fetchCars, 
    fetchBookings, 
    fetchPayments 
  } = useSupabaseData();

  const { 
    adminOverdueBookings, 
    loading: overdueLoading, 
    runOverdueCheck, 
    refreshData: refreshOverdueData 
  } = useOverduePayments();
  
  const { systemAlerts, loading: alertsLoading, refreshAlerts } = usePaymentNotifications();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Batch API calls
      const [usersResult, carsResult, bookingsResult, paymentsResult] = await Promise.all([
        fetchUsers(),
        fetchCars(),
        fetchBookings(),
        fetchPayments()
      ]);

      setData({
        users: usersResult.data || [],
        cars: carsResult.data || [],
        bookings: bookingsResult.data || [],
        payments: paymentsResult.data || []
      });
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Memoize computed statistics
  const stats = useMemo(() => {
    if (!data) {
      return {
        totalUsers: 0,
        totalCars: 0,
        totalBookings: 0,
        totalRevenue: 0,
        pendingApprovals: 0,
        activeRentals: 0,
        overduePayments: 0,
        criticalAlerts: 0
      };
    }

    const totalUsers = data.users?.length || 0;
    const totalCars = data.cars?.length || 0;
    const totalBookings = data.bookings?.length || 0;
    const activeRentals = data.cars?.filter(car => car.status === 'rented').length || 0;
    const pendingApprovals = data.users?.filter(user => !user.approved).length || 0;
    const totalRevenue = data.payments?.filter(p => p.approved).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    const overduePayments = adminOverdueBookings?.length || 0;
    const criticalAlerts = systemAlerts?.filter(alert => alert.severity === 'error').length || 0;

    return {
      totalUsers,
      totalCars,
      totalBookings,
      totalRevenue,
      pendingApprovals,
      activeRentals,
      overduePayments,
      criticalAlerts
    };
  }, [data, adminOverdueBookings, systemAlerts]);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchData(),
        refreshOverdueData(),
        refreshAlerts()
      ]);
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
    { title: 'Total Cars', value: stats.totalCars, icon: Car, color: 'from-green-500 to-green-600' },
    { title: 'Active Rentals', value: stats.activeRentals, icon: Calendar, color: 'from-purple-500 to-purple-600' },
    { title: 'Total Revenue', value: `RM ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'from-yellow-500 to-yellow-600' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: AlertTriangle, color: 'from-orange-500 to-orange-600' },
    { title: 'Overdue Payments', value: stats.overduePayments, icon: AlertTriangle, color: 'from-red-500 to-red-600' },
  ];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen space-y-8 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-700">Monitor your rental business performance and manage operations</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="secondary"
          className="flex items-center space-x-2 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5`}></div>
              <div className="relative z-10 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-gray-700 text-sm">{stat.title}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* System Alerts */}
      {!alertsLoading && systemAlerts && systemAlerts.length > 0 && (
        <SystemAlertsPanel alerts={systemAlerts} />
      )}

      {/* Overdue Payments Section */}
      <OverdueBookingsPanel
        overdueBookings={adminOverdueBookings || []}
        loading={overdueLoading}
        onRefresh={refreshOverdueData}
        onRunOverdueCheck={runOverdueCheck}
      />

      {/* Recent Activity */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading recent activity...</p>
              </div>
            ) : data?.bookings?.slice(0, 5).map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-mono text-gray-900 text-sm md:text-base">#{booking.booking_number}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      booking.payment_status === 'approved' ? 'bg-green-100 text-green-800' :
                      booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.payment_status}
                    </span>
                  </div>
                  <div className="text-gray-700 text-sm">
                    <p className="truncate">{booking.customer?.name} • {booking.car?.brand} {booking.car?.make}</p>
                    <p>Start: {formatDateForDisplay(booking.start_date)}</p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-gray-900 font-medium">RM {booking.total_amount}</p>
                  <p className="text-gray-600 text-sm">{booking.total_days} days</p>
                </div>
              </motion.div>
            )) || (
              <div className="text-center py-8">
                <p className="text-gray-600">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AdminDashboard;