import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface OverdueAlert {
  id: string;
  booking_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  days_overdue: number;
  amount_due: number;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

interface OverdueBooking {
  booking_id: string;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  car_name: string;
  car_plate_number: string;
  original_end_date: string;
  days_overdue: number;
  daily_rate: number;
  amount_overdue: number;
  severity: 'info' | 'warning' | 'critical';
}

export const useOverduePayments = () => {
  const { user } = useAuth();
  const [customerAlerts, setCustomerAlerts] = useState<OverdueAlert[]>([]);
  const [adminOverdueBookings, setAdminOverdueBookings] = useState<OverdueBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomerAlerts = useCallback(async () => {
    if (!user || user.role !== 'customer') return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('overdue_alerts')
        .select('*')
        .eq('customer_id', user.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerAlerts(data || []);
    } catch (err) {
      console.error('Error loading customer alerts:', err);
      setError('Failed to load payment alerts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAdminOverdueBookings = useCallback(async () => {
    if (!user || !['admin', 'staff'].includes(user.role)) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('overdue_bookings_view')
        .select('*')
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      setAdminOverdueBookings(data || []);
    } catch (err) {
      console.error('Error loading overdue bookings:', err);
      setError('Failed to load overdue bookings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('overdue_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setCustomerAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true }
            : alert
        )
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw new Error('Failed to acknowledge alert');
    }
  };

  const runOverdueCheck = async () => {
    try {
      const { error } = await supabase.rpc('run_overdue_payment_check');
      if (error) throw error;
      
      // Reload data after running check
      await Promise.all([loadCustomerAlerts(), loadAdminOverdueBookings()]);
    } catch (err) {
      console.error('Error running overdue check:', err);
      throw new Error('Failed to run overdue payment check');
    }
  };

  const createBookingExtension = async (bookingId: string, newEndDate: string) => {
    try {
      const { data, error } = await supabase.rpc('create_booking_extension', {
        p_booking_id: bookingId,
        p_new_end_date: newEndDate,
        p_created_by: user?.id
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating booking extension:', err);
      throw new Error('Failed to create booking extension');
    }
  };

  const refreshData = useCallback(async () => {
    if (user?.role === 'customer') {
      await loadCustomerAlerts();
    } else if (['admin', 'staff'].includes(user?.role || '')) {
      await loadAdminOverdueBookings();
    }
  }, [user, loadCustomerAlerts, loadAdminOverdueBookings]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);

      try {
        if (user.role === 'customer') {
          await loadCustomerAlerts();
        } else if (['admin', 'staff'].includes(user.role)) {
          await loadAdminOverdueBookings();
        }
      } catch (err) {
        console.error('Error loading overdue payment data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, loadCustomerAlerts, loadAdminOverdueBookings]);

  return {
    customerAlerts,
    adminOverdueBookings,
    loading,
    error,
    acknowledgeAlert,
    runOverdueCheck,
    createBookingExtension,
    refreshData
  };
};