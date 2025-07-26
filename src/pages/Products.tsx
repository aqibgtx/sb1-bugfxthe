import React from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../components/stripe/ProductCard';
import { stripeProducts } from '../stripe-config';

const Products: React.FC = () => {
  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Choose from our premium car rental services designed to meet your transportation needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stripeProducts.map((product, index) => (
            <motion.div
              key={product.priceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <ProductCard
                priceId={product.priceId}
                name={product.name}
                description={product.description}
                mode={product.mode}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Products;