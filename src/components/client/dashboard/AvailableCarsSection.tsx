import React from 'react';
import { motion } from 'framer-motion';
import { Car } from 'lucide-react';
import Button from '../../ui/Button';
import AvailableCarCard from './AvailableCarCard';
import EmptyState from './EmptyState';

interface AvailableCarsSectionProps {
  cars: any[];
  onBookCar: (car: any) => void;
  onViewAll: () => void;
  loading?: boolean;
}

const AvailableCarsSection: React.FC<AvailableCarsSectionProps> = ({
  cars,
  onBookCar,
  onViewAll,
  loading
}) => {
  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Available Cars</h2>
          <div className="animate-pulse bg-gray-200 rounded h-8 w-20"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 md:h-64"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Available Cars</h2>
        <Button variant="ghost" onClick={onViewAll} className="text-sm md:text-base">
          View All
        </Button>
      </div>
      
      {cars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {cars.map((car, index) => (
            <AvailableCarCard
              key={car.id}
              car={car}
              index={index}
              onBookCar={onBookCar}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Car}
          title="No Available Cars"
          message="All cars are currently rented. Please check back later."
        />
      )}
    </div>
  );
};

export default AvailableCarsSection;