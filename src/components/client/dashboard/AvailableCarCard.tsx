import React from 'react';
import { motion } from 'framer-motion';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';

interface AvailableCarCardProps {
  car: any;
  index: number;
  onBookCar: (car: any) => void;
}

const AvailableCarCard: React.FC<AvailableCarCardProps> = ({ car, index, onBookCar }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card hover3d glass className="overflow-hidden">
        <div className="relative h-48 mb-4">
          <img 
            src={car.image_url || 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400'} 
            alt={`${car.brand} ${car.make}`}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute top-3 right-3">
            <StatusBadge status="available" />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {car.brand} {car.make}
            </h3>
            <p className="text-gray-700">RM {car.rental_price_daily}/day</p>
            {car.spec && <p className="text-gray-600 text-sm">{car.spec}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              GPS
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              AC
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              Bluetooth
            </span>
          </div>

          <Button 
            className="w-full"
            onClick={() => onBookCar(car)}
          >
            Book This Car
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default AvailableCarCard;