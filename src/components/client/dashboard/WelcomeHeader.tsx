import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeHeaderProps {
  userName?: string;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        Welcome Back{userName ? `, ${userName}` : ''}!
      </h1>
      <p className="text-gray-700 text-sm md:text-base">Discover our available cars and manage your bookings</p>
    </motion.div>
  );
};

export default WelcomeHeader;