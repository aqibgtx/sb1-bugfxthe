interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    priceId: 'price_1RZRGDKWfxPa2wH5APPXunRg',
    name: 'Budget Plus Rental Booking',
    description: 'Car rental booking fee',
    mode: 'payment',
  },
];