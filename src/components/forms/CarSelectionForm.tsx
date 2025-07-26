import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Car, Hash, Search, X } from 'lucide-react';
import Card from '../ui/Card';

interface CarSelectionFormProps {
  cars: any[];
  onCarSelect: (car: any) => void;
}

const CarSelectionForm: React.FC<CarSelectionFormProps> = ({ cars, onCarSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter cars based on search term
  const filteredCars = useMemo(() => {
    if (!searchTerm.trim()) {
      return cars;
    }

    const searchLower = searchTerm.toLowerCase();
    return cars.filter(car => {
      // Search by plate number
      const plateMatch = car.plate_number?.toLowerCase().includes(searchLower);
      
      // Search by brand and make
      const brandMatch = car.brand?.toLowerCase().includes(searchLower);
      const makeMatch = car.make?.toLowerCase().includes(searchLower);
      
      // Search by spec
      const specMatch = car.spec?.toLowerCase().includes(searchLower);
      
      // Search by price (convert to string for partial matching)
      const priceMatch = car.rental_price_daily?.toString().includes(searchTerm);
      
      // Search by combined brand + make
      const fullNameMatch = `${car.brand} ${car.make}`.toLowerCase().includes(searchLower);
      
      return plateMatch || brandMatch || makeMatch || specMatch || priceMatch || fullNameMatch;
    });
  }, [cars, searchTerm]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleCarClick = (car: any) => {
    console.log('Car clicked:', car);
    onCarSelect(car);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Select Car</h3>
        
        {/* Debug info */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p>Available cars: {cars.length}</p>
          {filteredCars.length !== cars.length && (
            <p>Filtered cars: {filteredCars.length}</p>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by plate number, car name, price..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Search Results Count */}
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              {filteredCars.length === 0 ? (
                <span className="text-red-600">No cars found matching "{searchTerm}"</span>
              ) : (
                <span>
                  {filteredCars.length} car{filteredCars.length !== 1 ? 's' : ''} found
                  {filteredCars.length !== cars.length && ` out of ${cars.length} total`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {filteredCars.map((car, index) => (
          <motion.div
            key={car.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.1,
              type: "spring", 
              stiffness: 300, 
              damping: 20 
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-transparent hover:border-blue-200 bg-white w-full max-w-full overflow-hidden"
              className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-transparent hover:border-blue-200 bg-white"
              onClick={() => handleCarClick(car)}
            >
              <div className="relative h-32 mb-3">
                <img 
                  src={car.image_url || 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                  alt={`${car.brand} ${car.make}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                {/* Number Plate Badge */}
                <div className="absolute bottom-2 left-2">
                  <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-1">
                      <Hash className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-mono font-bold text-gray-900">{car.plate_number}</span>
                    </div>
                  </div>
                </div>
                {/* Available Badge */}
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    Available
                  </div>
                </div>
              </div>
              <div className="space-y-2 p-4">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg break-words">{car.brand} {car.make}</h4>
                  <p className="text-gray-700 text-sm break-words">{car.spec}</p>
                </div>
                
                {/* Car Details */}
                <div className="flex items-center justify-between text-sm text-gray-600 w-full">
                  <div className="flex items-center space-x-1">
                    <Hash className="w-3 h-3" />
                    <span className="font-mono break-all">{car.plate_number}</span>
                  </div>
                  <span className="flex-shrink-0">{car.current_mileage?.toLocaleString() || 0} km</span>
                </div>
                
                {/* Price */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-blue-600 font-bold text-lg break-words">RM {car.rental_price_daily}/day</p>
                </div>
                
                {/* Select Button */}
                <div className="pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCarClick(car);
                    }}
                    className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg text-center font-medium hover:bg-blue-100 transition-colors"
                  >
                    Select This Car
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Empty States */}
      {cars.length === 0 ? (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Cars Available</h3>
          <p className="text-gray-600">There are currently no cars available for booking.</p>
        </div>
      ) : filteredCars.length === 0 && searchTerm ? (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600 mb-4">
            No cars match your search for "{searchTerm}". Try searching with different keywords.
          </p>
          <button
            onClick={clearSearch}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear Search</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default CarSelectionForm;