import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Car, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WelcomeHeader from '../../components/client/dashboard/WelcomeHeader';
import DashboardStats from '../../components/client/dashboard/DashboardStats';
import AvailableCarsSection from '../../components/client/dashboard/AvailableCarsSection';
import RecentBookingsSection from '../../components/client/dashboard/RecentBookingsSection';
import ActionButtons from '../../components/client/dashboard/ActionButtons';
import ActivityFeed from '../../components/client/dashboard/ActivityFeed';
import OverduePaymentBanner from '../../components/client/dashboard/OverduePaymentBanner';
import Button from '../../components/ui/Button';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useOverduePayments } from '../../hooks/useOverduePayments';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { batchFetch } = useSupabaseData();
  
  const [cars, setCars] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { customerAlerts, acknowledgeAlert, loading: alertsLoading } = useOverduePayments();

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const results = await batchFetch([
        // Fetch available cars (limit to 3 for dashboard)
        async () => {
          const { data } = await fetch('/api/cars?status=available&limit=3').then(r => r.json()).catch(() => ({ data: [] }));
          return { data };
        },
        // Fetch user's bookings (limit to 3 recent)
        async () => {
          const { data } = await fetch(`/api/bookings?customer_id=${user.id}&limit=3`).then(r => r.json()).catch(() => ({ data: [] }));
          return { data };
        }
      ]);

      const [carsResult, bookingsResult] = results;
      
      setCars(carsResult.data?.filter((car: any) => car.status === 'available') || []);
      setBookings(bookingsResult.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, batchFetch]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoize computed data
  const { availableCars, myBookings, stats, recentActivity } = useMemo(() => {
    if (!cars || !bookings) {
      return {
        availableCars: [],
        myBookings: [],
        stats: { availableCars: 0, totalBookings: 0, totalSpent: 0, activeRentals: 0 },
        recentActivity: []
      };
    }

    // Filter available cars (already filtered from API)
    const available = cars.slice(0, 3);
    
    // Filter user's bookings (already filtered from API)
    const userBookings = bookings.slice(0, 3);

    // Calculate stats
    const totalSpent = userBookings
      .filter(booking => booking.payment_status === 'approved')
      .reduce((sum, booking) => sum + parseFloat(booking.total_amount || 0), 0);
    
    const activeRentals = userBookings.filter(booking => 
      booking.payment_status === 'approved' && new Date(booking.end_date) > new Date()
    ).length;

    // Generate activity feed
    const activities = [
      ...userBookings.map(booking => ({
        id: booking.id,
        type: 'booking' as const,
        title: `Booking #${booking.booking_number}`,
        description: `${booking.car_name || 'Car'} - ${booking.total_days} days`,
        timestamp: new Date(booking.created_at).toLocaleDateString(),
        status: booking.payment_status
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      availableCars: available,
      myBookings: userBookings,
      stats: {
        availableCars: available.length,
        totalBookings: userBookings.length,
        totalSpent,
        activeRentals
      },
      recentActivity: activities
    };
  }, [cars, bookings]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData();
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const handleBookCar = (car: any) => {
    navigate('/client/book-car', { state: { selectedCar: car } });
  };

  const handleViewAllCars = () => {
    navigate('/client/book-car');
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const statCards = useMemo(() => [
    { title: 'Available Cars', value: stats.availableCars, icon: Car, color: 'from-blue-500 to-blue-600' },
    { title: 'My Bookings', value: stats.totalBookings, icon: Calendar, color: 'from-green-500 to-green-600' },
    { title: 'Total Spent', value: `RM ${stats.totalSpent.toLocaleString()}`, icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
    { title: 'Active Rental', value: stats.activeRentals, icon: Users, color: 'from-yellow-500 to-yellow-600' },
  ], [stats]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen space-y-6 lg:space-y-8"
    >
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <WelcomeHeader userName={user?.name} />
        <Button
          onClick={handleRefresh}
          variant="ghost"
          className="flex items-center space-x-2 self-start sm:self-auto"
          disabled={loading || refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Overdue Payment Alerts */}
      {!alertsLoading && customerAlerts.length > 0 && (
        <OverduePaymentBanner
          alerts={customerAlerts}
          onAcknowledge={handleAcknowledgeAlert}
        />
      )}

      {/* Quick Stats */}
      <DashboardStats stats={statCards} loading={loading} />

      {/* Quick Actions */}
      <ActionButtons />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Available Cars */}
        <div className="lg:col-span-2">
          <AvailableCarsSection
            cars={availableCars}
            onBookCar={handleBookCar}
            onViewAll={handleViewAllCars}
            loading={loading}
          />
        </div>

        {/* Right Column - Activity Feed */}
        <div>
          <ActivityFeed activities={recentActivity} loading={loading} />
        </div>
      </div>

      {/* My Recent Bookings */}
      <RecentBookingsSection bookings={myBookings} loading={loading} />
    </motion.div>
  );
};

export default ClientDashboard;