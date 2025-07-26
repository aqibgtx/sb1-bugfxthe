import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useStripe } from '../../hooks/useStripe';

interface ProductCardProps {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price?: string;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  priceId,
  name,
  description,
  mode,
  price = 'MYR 1.00',
  className = ''
}) => {
  const { createCheckoutSession, loading } = useStripe();

  const handlePurchase = () => {
    createCheckoutSession(priceId, mode);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card glass hover3d className="h-full">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{name}</h3>
              <p className="text-2xl font-bold text-blue-600">{price}</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6 flex-grow">{description}</p>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500" />
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500" />
              <span>Instant confirmation</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500" />
              <span>24/7 customer support</span>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? 'Processing...' : `Pay ${price}`}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ProductCard;