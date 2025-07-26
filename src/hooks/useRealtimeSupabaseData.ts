import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UseRealtimeDataOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
  realtime?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

class RealtimeDataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private subscribers = new Map<string, Set<() => void>>();
  private channels = new Map<string, any>();
  private defaultStaleTime = 30 * 1000; // 30 seconds for realtime data
  private defaultCacheTime = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, staleTime?: number): void {
    const entry = {
      data,
      timestamp: Date.now(),
      isStale: false
    };
    
    this.cache.set(key, entry);
    this.notifySubscribers(key);

    // Set up stale timer
    setTimeout(() => {
      const currentEntry = this.cache.get(key);
      if (currentEntry && currentEntry.timestamp === entry.timestamp) {
        currentEntry.isStale = true;
        this.notifySubscribers(key);
      }
    }, staleTime || this.defaultStaleTime);

    // Set up cache expiry timer
    setTimeout(() => {
      const currentEntry = this.cache.get(key);
      if (currentEntry && currentEntry.timestamp === entry.timestamp) {
        this.cache.delete(key);
        this.notifySubscribers(key);
      }
    }, this.defaultCacheTime);
  }

  get<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const keySubscribers = this.subscribers.get(key);
      if (keySubscribers) {
        keySubscribers.delete(callback);
        if (keySubscribers.size === 0) {
          this.subscribers.delete(key);
          this.cleanupRealtimeChannel(key);
        }
      }
    };
  }

  private notifySubscribers(key: string): void {
    const keySubscribers = this.subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.forEach(callback => callback());
    }
  }

  setupRealtimeChannel(table: string, callback: () => void): void {
    // Use stable channel name without random suffix
    const channelName = `realtime-${table}`;
    
    if (this.channels.has(channelName)) {
      return; // Channel already exists
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table 
        }, 
        (payload) => {
          console.log(`Realtime update for ${table}:`, payload);
          // Invalidate all cache entries for this table
          this.invalidateTableCache(table);
          callback();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime subscription active for ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Realtime subscription failed for ${table}`);
        }
      });

    this.channels.set(channelName, channel);
  }

  private cleanupRealtimeChannel(key: string): void {
    // Extract table name from key (assuming format like 'users', 'bookings-userId', etc.)
    const table = key.split('-')[0];
    const channelName = `realtime-${table}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`🧹 Cleaned up realtime channel for ${table}`);
    }
  }

  private invalidateTableCache(table: string): void {
    // Invalidate all cache entries that start with the table name
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(table)) {
        entry.isStale = true;
        this.notifySubscribers(key);
      }
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.notifySubscribers(key);
  }

  clear(): void {
    this.cache.clear();
    // Cleanup all channels
    for (const [channelName, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.subscribers.clear();
  }
}

const realtimeCache = new RealtimeDataCache();

export const useRealtimeSupabaseData = <T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: UseRealtimeDataOptions = {}
) => {
  const {
    enabled = true,
    refetchOnWindowFocus = true,
    staleTime = 30 * 1000, // 30 seconds for realtime
    realtime = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Prevent rapid successive calls
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 100) {
      return;
    }
    lastFetchRef.current = now;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cachedEntry = realtimeCache.get<T>(queryKey);
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
      realtimeCache.set(queryKey, result, staleTime);

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
    realtimeCache.invalidate(queryKey);
    fetchData(true);
  }, [queryKey, fetchData]);

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = realtimeCache.subscribe(queryKey, () => {
      const cachedEntry = realtimeCache.get<T>(queryKey);
      if (cachedEntry) {
        setData(cachedEntry.data);
        setIsStale(cachedEntry.isStale);
      }
    });

    return unsubscribe;
  }, [queryKey]);

  // Initial fetch
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

  // Setup realtime subscription
  useEffect(() => {
    if (!realtime || !enabled) return;

    // Extract table name from queryKey
    const table = queryKey.split('-')[0];
    realtimeCache.setupRealtimeChannel(table, () => {
      fetchData(true);
    });
  }, [queryKey, realtime, enabled, fetchData]);

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cachedEntry = realtimeCache.get<T>(queryKey);
      if (!cachedEntry || cachedEntry.isStale) {
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

// Enhanced data fetchers with realtime capabilities
export const useRealtimeUsers = (options?: UseRealtimeDataOptions) => {
  return useRealtimeSupabaseData(
    'users',
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 30 * 1000, ...options }
  );
};

export const useRealtimeCars = (options?: UseRealtimeDataOptions) => {
  return useRealtimeSupabaseData(
    'cars',
    async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 30 * 1000, ...options }
  );
};

export const useRealtimeBookings = (userId?: string, options?: UseRealtimeDataOptions) => {
  const queryKey = userId ? `bookings-${userId}` : 'bookings';
  
  return useRealtimeSupabaseData(
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
    { staleTime: 15 * 1000, ...options } // More frequent updates for bookings
  );
};

export const useRealtimePayments = (options?: UseRealtimeDataOptions) => {
  return useRealtimeSupabaseData(
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
    { staleTime: 15 * 1000, ...options } // More frequent updates for payments
  );
};

// Batch data fetcher with realtime capabilities
export const useRealtimeDashboardData = (userId?: string) => {
  const [data, setData] = useState<{
    users: any[];
    cars: any[];
    bookings: any[];
    payments: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<any[]>([]);

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

    // Setup realtime subscriptions for all tables only once
    if (channelsRef.current.length === 0) {
      channelsRef.current = ['users', 'cars', 'bookings', 'payments'].map(table => {
        return supabase
          .channel(`dashboard-${table}`)
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table 
            }, 
            (payload) => {
              console.log(`Dashboard realtime update for ${table}:`, payload);
              fetchBatchData();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`✅ Dashboard realtime subscription active for ${table}`);
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`❌ Dashboard realtime subscription failed for ${table}`);
            }
          });
      });
    }

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [fetchBatchData]);

  return { data, loading, error, refetch: fetchBatchData };
};

// Cleanup function for when the app unmounts
export const cleanupRealtimeCache = () => {
  realtimeCache.clear();
};