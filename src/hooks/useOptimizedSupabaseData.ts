import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UseOptimizedDataOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultStaleTime = 2 * 60 * 1000; // 2 minutes (reduced from 5)
  private defaultCacheTime = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, staleTime?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false
    });

    // Set up stale timer
    setTimeout(() => {
      const entry = this.cache.get(key);
      if (entry) {
        entry.isStale = true;
      }
    }, staleTime || this.defaultStaleTime);

    // Set up cache expiry timer
    setTimeout(() => {
      this.cache.delete(key);
    }, this.defaultCacheTime);
  }

  get<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const dataCache = new DataCache();

export const useOptimizedSupabaseData = <T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: UseOptimizedDataOptions = {}
) => {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 2 * 60 * 1000, // Reduced from 5 minutes to 2 minutes
    cacheTime = 5 * 60 * 1000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cachedEntry = dataCache.get<T>(queryKey);
    if (cachedEntry && !forceRefresh && !cachedEntry.isStale) {
      setData(cachedEntry.data);
      setIsStale(false);
      setError(null);
      return;
    }

    // If we have stale data, show it while fetching fresh data
    if (cachedEntry && cachedEntry.isStale) {
      setData(cachedEntry.data);
      setIsStale(true);
    }

    setLoading(true);
    setError(null);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await queryFn();

      if (!isMountedRef.current) return;

      // Cache the result
      dataCache.set(queryKey, result, staleTime);

      setData(result);
      setIsStale(false);
      setError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      if (err.name !== 'AbortError') {
        console.error(`Error fetching ${queryKey}:`, err);
        setError(err.message || 'An error occurred');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [queryKey, queryFn, enabled, staleTime]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidateQuery = useCallback(() => {
    dataCache.invalidate(queryKey);
    fetchData(true);
  }, [queryKey, fetchData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cachedEntry = dataCache.get<T>(queryKey);
      if (cachedEntry && cachedEntry.isStale) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, queryKey, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    invalidateQuery
  };
};

// Optimized data fetchers with shorter cache times
export const useOptimizedUsers = (options?: UseOptimizedDataOptions) => {
  return useOptimizedSupabaseData(
    'users',
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 1 * 60 * 1000, ...options } // 1 minute for users
  );
};

export const useOptimizedCars = (options?: UseOptimizedDataOptions) => {
  return useOptimizedSupabaseData(
    'cars',
    async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 2 * 60 * 1000, ...options } // 2 minutes for cars
  );
};

export const useOptimizedBookings = (userId?: string, options?: UseOptimizedDataOptions) => {
  const queryKey = userId ? `bookings-${userId}` : 'bookings';
  
  return useOptimizedSupabaseData(
    queryKey,
    async () => {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customer_id(id, name, email, phone),
          staff:staff_id(id, name, email),
          car:car_id(id, brand, make, spec, image_url, rental_price_daily, plate_number)
        `)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.or(`customer_id.eq.${userId},staff_id.eq.${userId}`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 30 * 1000, ...options } // 30 seconds for bookings
  );
};

export const useOptimizedPayments = (options?: UseOptimizedDataOptions) => {
  return useOptimizedSupabaseData(
    'payments',
    async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:booking_id(
            id,
            booking_number,
            customer:customer_id(id, name, email),
            staff:staff_id(id, name, email)
          ),
          payment_method:payment_method_id(id, name, code)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 30 * 1000, ...options } // 30 seconds for payments
  );
};

// Batch data fetcher for dashboard pages with shorter cache times
export const useBatchDashboardData = (userId?: string) => {
  const [data, setData] = useState<{
    users: any[];
    cars: any[];
    bookings: any[];
    payments: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Promise.allSettled to prevent one failed request from breaking others
      const [usersResult, carsResult, bookingsResult, paymentsResult] = await Promise.allSettled([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('cars').select('*').order('created_at', { ascending: false }),
        supabase.from('bookings').select(`
          *,
          customer:customer_id(id, name, email, phone),
          staff:staff_id(id, name, email),
          car:car_id(id, brand, make, spec, image_url, rental_price_daily, plate_number)
        `).order('created_at', { ascending: false }),
        supabase.from('payments').select(`
          *,
          booking:booking_id(
            id,
            booking_number,
            customer:customer_id(id, name, email),
            staff:staff_id(id, name, email)
          )
        `).order('created_at', { ascending: false })
      ]);

      const batchData = {
        users: usersResult.status === 'fulfilled' ? usersResult.value.data || [] : [],
        cars: carsResult.status === 'fulfilled' ? carsResult.value.data || [] : [],
        bookings: bookingsResult.status === 'fulfilled' ? bookingsResult.value.data || [] : [],
        payments: paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : []
      };

      setData(batchData);
    } catch (err: any) {
      console.error('Error fetching batch data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatchData();
    
    // Set up periodic refresh for dashboard data
    const interval = setInterval(fetchBatchData, 60 * 1000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [fetchBatchData]);

  return { data, loading, error, refetch: fetchBatchData };
};