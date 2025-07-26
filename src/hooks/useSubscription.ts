import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../stripe-config';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (priceId: string | null) => {
    if (!priceId) return 'No Active Plan';
    const product = stripeProducts.find(p => p.priceId === priceId);
    return product?.name || 'Unknown Plan';
  };

  return {
    subscription,
    loading,
    getProductName,
    refreshSubscription: loadSubscription,
  };
};