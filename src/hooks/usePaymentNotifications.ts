import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PaymentNotification {
  id: string;
  booking_number: string;
  customer_name: string;
  amount: number;
  created_at: string;
  days_pending: number;
}

interface OverdueReturn {
  id: string;
  booking_number: string;
  customer_name: string;
  end_date: string;
  days_overdue: number;
}

interface SystemAlert {
  id: string;
  type: 'payment_pending' | 'service_due' | 'document_expiry' | 'booking_overdue' | 'cancellation_request' | 'overdue_returns';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  count?: number;
  data?: any;
  created_at: string;
}

export const usePaymentNotifications = () => {
  const [pendingPayments, setPendingPayments] = useState<PaymentNotification[]>([]);
  const [overdueReturns, setOverdueReturns] = useState<OverdueReturn[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPendingPayments = useCallback(async () => {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          created_at,
          booking:booking_id(
            id,
            booking_number,
            customer:customer_id(id, name, email)
          )
        `)
        .eq('approved', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const notifications: PaymentNotification[] = payments?.map(payment => {
        const daysPending = Math.floor(
          (new Date().getTime() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: payment.id,
          booking_number: payment.booking?.booking_number || 'Unknown',
          customer_name: payment.booking?.customer?.name || 'Unknown',
          amount: parseFloat(payment.amount || '0'),
          created_at: payment.created_at,
          days_pending: daysPending
        };
      }) || [];

      setPendingPayments(notifications);
      return notifications;
    } catch (error) {
      console.error('Error loading pending payments:', error);
      return [];
    }
  }, []);

  const loadOverdueReturns = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: overdueBookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          end_date,
          customer:customer_id(id, name, email)
        `)
        .eq('return_marked', false)
        .lt('end_date', today)
        .neq('payment_status', 'paid')
        .order('end_date', { ascending: true });

      if (error) throw error;

      const overdueReturnsData: OverdueReturn[] = overdueBookings?.map(booking => {
        const endDate = new Date(booking.end_date);
        const todayDate = new Date();
        const daysOverdue = Math.floor(
          (todayDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: booking.id,
          booking_number: booking.booking_number || 'Unknown',
          customer_name: booking.customer?.name || 'Unknown',
          end_date: booking.end_date,
          days_overdue: daysOverdue
        };
      }) || [];

      setOverdueReturns(overdueReturnsData);
      return overdueReturnsData;
    } catch (error) {
      console.error('Error loading overdue returns:', error);
      return [];
    }
  }, []);

  const loadSystemAlerts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Batch API calls
      const [
        pendingPaymentsData,
        overdueReturnsData,
        carsData,
        bookingsData,
        cancellationRequestsData,
        carDocumentsData
      ] = await Promise.all([
        loadPendingPayments(),
        loadOverdueReturns(),
        supabase.from('cars').select('*'),
        supabase.from('bookings').select(`
          *,
          customer:customer_id(id, name, email),
          car:car_id(id, brand, make)
        `),
        supabase.from('cancellation_requests').select(`
          *,
          booking:booking_id(id, booking_number),
          staff:staff_id(id, name)
        `).eq('status', 'pending'),
        supabase.from('car_documents').select('*')
      ]);

      const alerts: SystemAlert[] = [];

      // 1. Unpaid Overdue Returns Alert (HIGHEST PRIORITY)
      if (overdueReturnsData.length > 0) {
        alerts.push({
          id: 'overdue-returns',
          type: 'overdue_returns',
          title: 'Unpaid Overdue Returns',
          message: `${overdueReturnsData.length} unpaid booking${overdueReturnsData.length > 1 ? 's' : ''} past return date`,
          severity: 'error',
          count: overdueReturnsData.length,
          data: overdueReturnsData,
          created_at: new Date().toISOString()
        });
      }

      // 2. Pending Payment Alerts
      if (pendingPaymentsData.length > 0) {
        const urgentPayments = pendingPaymentsData.filter(p => p.days_pending >= 3);
        const recentPayments = pendingPaymentsData.filter(p => p.days_pending < 3);

        if (urgentPayments.length > 0) {
          alerts.push({
            id: 'urgent-payments',
            type: 'payment_pending',
            title: 'Urgent Payment Approvals',
            message: `${urgentPayments.length} payment${urgentPayments.length > 1 ? 's' : ''} pending for 3+ days`,
            severity: 'error',
            count: urgentPayments.length,
            data: urgentPayments,
            created_at: new Date().toISOString()
          });
        }

        if (recentPayments.length > 0) {
          alerts.push({
            id: 'pending-payments',
            type: 'payment_pending',
            title: 'Payment Approvals Needed',
            message: `${recentPayments.length} payment${recentPayments.length > 1 ? 's' : ''} awaiting approval`,
            severity: 'warning',
            count: recentPayments.length,
            data: recentPayments,
            created_at: new Date().toISOString()
          });
        }
      }

      // 3. Service Due Alerts
      const serviceAlerts = carsData.data?.filter(car => {
        const mileageSinceService = (car.current_mileage || 0) - (car.last_service_mileage || 0);
        return mileageSinceService >= (car.service_interval || 5000);
      }) || [];

      if (serviceAlerts.length > 0) {
        alerts.push({
          id: 'service-due',
          type: 'service_due',
          title: 'Vehicle Service Due',
          message: `${serviceAlerts.length} vehicle${serviceAlerts.length > 1 ? 's' : ''} need${serviceAlerts.length === 1 ? 's' : ''} service`,
          severity: 'warning',
          count: serviceAlerts.length,
          data: serviceAlerts,
          created_at: new Date().toISOString()
        });
      }

      // 4. Overdue Bookings
      const today = new Date();
      const overdueBookings = bookingsData.data?.filter(booking => {
        if (booking.payment_status === 'completed') return false;
        const endDate = new Date(booking.end_date);
        return endDate < today && booking.booking_status === 'approved';
      }) || [];

      if (overdueBookings.length > 0) {
        alerts.push({
          id: 'overdue-bookings',
          type: 'booking_overdue',
          title: 'Overdue Bookings',
          message: `${overdueBookings.length} booking${overdueBookings.length > 1 ? 's' : ''} past due date`,
          severity: 'error',
          count: overdueBookings.length,
          data: overdueBookings,
          created_at: new Date().toISOString()
        });
      }

      // 5. Cancellation Requests
      if (cancellationRequestsData.data && cancellationRequestsData.data.length > 0) {
        alerts.push({
          id: 'cancellation-requests',
          type: 'cancellation_request',
          title: 'Cancellation Requests',
          message: `${cancellationRequestsData.data.length} cancellation request${cancellationRequestsData.data.length > 1 ? 's' : ''} pending approval`,
          severity: 'warning',
          count: cancellationRequestsData.data.length,
          data: cancellationRequestsData.data,
          created_at: new Date().toISOString()
        });
      }

      // 6. Document Expiry Alerts
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringDocs = carDocumentsData.data?.filter(doc => {
        if (!doc.expiry_date) return false;
        const expiryDate = new Date(doc.expiry_date);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
      }) || [];

      const expiredDocs = carDocumentsData.data?.filter(doc => {
        if (!doc.expiry_date) return false;
        const expiryDate = new Date(doc.expiry_date);
        return expiryDate < today;
      }) || [];

      if (expiredDocs.length > 0) {
        alerts.push({
          id: 'expired-documents',
          type: 'document_expiry',
          title: 'Expired Documents',
          message: `${expiredDocs.length} document${expiredDocs.length > 1 ? 's' : ''} have expired`,
          severity: 'error',
          count: expiredDocs.length,
          data: expiredDocs,
          created_at: new Date().toISOString()
        });
      }

      if (expiringDocs.length > 0) {
        alerts.push({
          id: 'expiring-documents',
          type: 'document_expiry',
          title: 'Documents Expiring Soon',
          message: `${expiringDocs.length} document${expiringDocs.length > 1 ? 's' : ''} expiring within 30 days`,
          severity: 'warning',
          count: expiringDocs.length,
          data: expiringDocs,
          created_at: new Date().toISOString()
        });
      }

      // Sort alerts by severity (error first, then warning, then info)
      alerts.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setSystemAlerts(alerts);
    } catch (error) {
      console.error('Error loading system alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [loadPendingPayments, loadOverdueReturns]);

  useEffect(() => {
    loadSystemAlerts();
  }, [loadSystemAlerts]);

  return {
    pendingPayments,
    overdueReturns,
    systemAlerts,
    loading,
    refreshAlerts: loadSystemAlerts
  };
};