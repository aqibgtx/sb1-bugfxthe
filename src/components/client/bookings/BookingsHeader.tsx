import React from 'react';
import { motion } from 'framer-motion';

const BookingsHeader: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
      <p className="text-gray-700">Track your rental bookings and upload payment proofs</p>
    </motion.div>
  );
};

export default BookingsHeader;