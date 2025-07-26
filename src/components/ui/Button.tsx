import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border border-green-600';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border border-red-600';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm min-h-[44px] md:min-h-[36px]';
      case 'md':
        return 'px-4 py-2 text-sm md:text-base min-h-[44px]';
      case 'lg':
        return 'px-6 py-3 text-base md:text-lg min-h-[44px]';
      default:
        return 'px-4 py-2 text-sm md:text-base min-h-[44px]';
    }
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        rounded-lg font-semibold transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        touch-action-manipulation
        ${className}
      `}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.button>
  );
};

export default Button;