import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover3d?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover3d = false }) => {
  // Simplified flat design with subtle borders
  const baseClasses = 'bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6';
  const hoverClasses = hover3d ? 'hover:shadow-md transition-shadow duration-200' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
};

export default Card;