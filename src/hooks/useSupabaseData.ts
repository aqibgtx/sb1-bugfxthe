import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const useSupabaseData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generic fetch function with better error handling and pagination support
  const fetchData = useCallback(async <T>(
    table: string,
    select: string = '*',
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending?: boolean },
    pagination?: { page: number; limit: number }
  ): Promise<{ data: T[]; count?: number }> => {
    try {
      let query = supabase.from(table).select(select, { count: 'exact' });
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      // Add pagination if specified
      if (pagination) {
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      throw err;
    }
  }, []);

  // Specific data fetchers with proper joins and pagination support
  const fetchUsers = useCallback((pagination?: { page: number; limit: number }) => 
    fetchData('users', '*', undefined, { column: 'created_at', ascending: false }, pagination), [fetchData]);
  
  const fetchCars = useCallback((pagination?: { page: number; limit: number }) => 
    fetchData('cars', '*', undefined, { column: 'created_at', ascending: false }, pagination), [fetchData]);
  
  const fetchBookings = useCallback((pagination?: { page: number; limit: number }) => 
    fetchData('bookings', `
      *,
      customer:customer_id(id, name, email, phone),
      staff:staff_id(id, name, email),
      car:car_id(id, brand, make, spec, image_url, rental_price_daily, plate_number)
    `, undefined, { column: 'created_at', ascending: false }, pagination), [fetchData]);
  
  const fetchPayments = useCallback((pagination?: { page: number; limit: number }) => 
    fetchData('payments', `
      *,
      booking:booking_id(
        id,
        booking_number,
        customer:customer_id(id, name, email),
        staff:staff_id(id, name, email)
      ),
      payment_method:payment_method_id(id, name, code)
    `, undefined, { column: 'created_at', ascending: false }, pagination), [fetchData]);
  
  const fetchSoldCars = useCallback((pagination?: { page: number; limit: number }) => 
    fetchData('sold_cars', `
      *,
      car:car_id(id, brand, make, spec, purchase_price, image_url)
    `, undefined, { column: 'sold_date', ascending: false }, pagination), [fetchData]);
  
  const fetchPaymentMethods = useCallback(() => fetchData('payment_methods', '*', { active: true }), [fetchData]);
  
  const fetchAddOns = useCallback(() => fetchData('add_ons', '*', { active: true }), [fetchData]);

  const fetchDocuments = useCallback((userId?: string, pagination?: { page: number; limit: number }) => {
    const filters = userId ? { user_id: userId } : undefined;
    return fetchData('documents', `
      *,
      user:user_id(id, name, email)
    `, filters, { column: 'uploaded_at', ascending: false }, pagination);
  }, [fetchData]);

  const fetchBookingAddOns = useCallback((bookingId: string) => fetchData('booking_add_ons', `
    *,
    add_on:add_on_id(id, name, code, price_daily)
  `, { booking_id: bookingId }), [fetchData]);

  const fetchDeliveryDetails = useCallback((bookingId?: string) => {
    const filters = bookingId ? { booking_id: bookingId } : undefined;
    return fetchData('delivery_details', '*', filters);
  }, [fetchData]);

  // Batch fetch function for multiple related data
  const batchFetch = useCallback(async (requests: Array<() => Promise<any>>) => {
    try {
      setLoading(true);
      const results = await Promise.allSettled(requests);
      
      // Return results, handling both fulfilled and rejected promises
      return results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error('Batch fetch error:', result.reason);
          return { data: [], error: result.reason };
        }
      });
    } catch (error) {
      console.error('Batch fetch error:', error);
      setError(error instanceof Error ? error.message : 'Batch fetch failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setLoading,
    setError,
    fetchData,
    fetchUsers,
    fetchCars,
    fetchBookings,
    fetchPayments,
    fetchSoldCars,
    fetchPaymentMethods,
    fetchAddOns,
    fetchDocuments,
    fetchBookingAddOns,
    fetchDeliveryDetails,
    batchFetch
  };
};

// Hook for optimized data fetching with caching
export const useOptimizedSupabaseData = (table: string, dependencies: any[] = []) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: any[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchOptimizedData = useCallback(async () => {
    const cacheKey = `${table}_${JSON.stringify(dependencies)}`;
    const cached = cacheRef.current.get(cacheKey);
    
    // Return cached data if it's still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data: fetchedData, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const result = fetchedData || [];
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      setData(result);
      return result;
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [table, ...dependencies]);

  const refreshData = useCallback(async () => {
    // Clear cache for this table
    const cacheKey = `${table}_${JSON.stringify(dependencies)}`;
    cacheRef.current.delete(cacheKey);
    return await fetchOptimizedData();
  }, [fetchOptimizedData, table, ...dependencies]);

  useEffect(() => {
    fetchOptimizedData();
  }, [fetchOptimizedData]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  return {
    data,
    loading,
    error,
    refreshData,
    fetchData: fetchOptimizedData
  };
};

// Hook for manual stats with refresh capability
export const useManualStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCars: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    activeRentals: 0
  });
  const [loading, setLoading] = useState(true);

  const updateStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if supabase client is available
      if (!supabase) {
        console.warn('Supabase client not available for stats update');
        return;
      }

      // Batch all stat queries for better performance
      const [users, cars, bookings, payments] = await Promise.allSettled([
        supabase.from('users').select('id, role, approved'),
        supabase.from('cars').select('id, status'),
        supabase.from('bookings').select('id, payment_status, total_amount'),
        supabase.from('payments').select('id, approved, amount')
      ]);

      const usersData = users.status === 'fulfilled' ? users.value.data || [] : [];
      const carsData = cars.status === 'fulfilled' ? cars.value.data || [] : [];
      const bookingsData = bookings.status === 'fulfilled' ? bookings.value.data || [] : [];
      const paymentsData = payments.status === 'fulfilled' ? payments.value.data || [] : [];

      const totalUsers = usersData.length;
      const totalCars = carsData.length;
      const totalBookings = bookingsData.length;
      const activeRentals = carsData.filter(car => car.status === 'rented').length;
      const pendingApprovals = usersData.filter(user => !user.approved).length;
      const totalRevenue = paymentsData.filter(p => p.approved).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      setStats({
        totalUsers,
        totalCars,
        totalBookings,
        totalRevenue,
        pendingApprovals,
        activeRentals
      });
    } catch (error) {
      console.error('Error updating stats:', error);
      // Don't throw the error, just log it to prevent component crashes
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    await updateStats();
  }, [updateStats]);

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  return { stats, loading, refreshStats };
};