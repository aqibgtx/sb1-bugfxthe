import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, MapPin, Truck, Crown, Calculator, Info, Navigation } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface AddOnsDeliveryFormProps {
  addOns: any[];
  selectedAddOns: any[];
  onAddOnToggle: (addOn: any) => void;
  onUpdateAddOnQuantity: (addOnId: string, quantity: number) => void;
  bookingDetails: {
    startDate: string;
    endDate: string;
    totalDays: number;
    rentalAmount: number;
    deliveryFee: number;
  };
  onBookingDetailsChange: (details: any) => void;
  // New props for centralized delivery system
  deliveryType: string;
  deliveryDistance: number;
  onDeliveryTypeChange: (type: string) => void;
  onDeliveryDistanceChange: (distance: number) => void;
  // Legacy props for backward compatibility
  onDeliveryKmChange?: (km: number) => void;
}

const AddOnsDeliveryForm: React.FC<AddOnsDeliveryFormProps> = ({
  addOns,
  selectedAddOns,
  onAddOnToggle,
  onUpdateAddOnQuantity,
  bookingDetails,
  onBookingDetailsChange,
  deliveryType,
  deliveryDistance,
  onDeliveryTypeChange,
  onDeliveryDistanceChange,
  onDeliveryKmChange
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDistance, setGpsDistance] = useState<number>(0);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string>('');

  // Company location (you can update these coordinates to your actual location)
  const companyLocation = { lat: 3.1390, lng: 101.6869 }; // Kuala Lumpur coordinates

  const calculatePickupFee = (distance: number) => {
    return distance > 7 ? (distance - 7) * 2 : 0; // Free for 7km, RM2/km after that
  };

  const calculateDeliveryFee = (distance: number) => {
    return distance * 4; // RM4 per km
  };

  const deliveryOptions = [
    {
      id: 'self_pickup',
      title: 'Self Pickup',
      subtitle: 'Pick up at our office',
      description: 'Collect your vehicle directly from our location',
      icon: MapPin,
      fee: 'Free',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'free_pickup',
      title: 'Pickup Service',
      subtitle: deliveryDistance <= 7 ? 'Free within 7km' : `RM2/km beyond 7km`,
      description: 'We come to your location and bring you to our office. Free within 7km, RM2/km beyond that.',
      icon: Navigation,
      fee: deliveryType === 'free_pickup' ? 
        (deliveryDistance > 7 ? `RM${((deliveryDistance - 7) * 2).toFixed(2)}` : 'Free') : 
        'Free up to 7km',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'vip_delivery',
      title: 'Door-to-Door Delivery',
      subtitle: 'We bring it to you',
      description: 'Premium delivery service to your preferred location',
      icon: Crown,
      fee: 'RM4/km',
      color: 'purple',
      gradient: 'from-purple-500 to-indigo-600'
    }
  ];

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setLoadingGPS(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser');
      setLoadingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        // Calculate distance to company
        const distance = calculateDistance(userLat, userLng, companyLocation.lat, companyLocation.lng);
        setGpsDistance(distance);
        setLoadingGPS(false);
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setGpsError(errorMessage);
        setLoadingGPS(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleDeliveryOptionChange = (optionId: string) => {
    onDeliveryTypeChange(optionId);
    
    if (optionId === 'self_pickup') {
      onDeliveryDistanceChange(0);
    } else {
      // Use GPS distance if available, otherwise keep current distance or set to 1
      const distance = gpsDistance > 0 ? gpsDistance : (deliveryDistance > 0 ? deliveryDistance : 1);
      onDeliveryDistanceChange(distance);
    }
  };

  const handleDistanceChange = (distance: number) => {
    const newDistance = Math.max(0, Math.min(200, distance));
    onDeliveryDistanceChange(newDistance);
    
    // Legacy support
    if (onDeliveryKmChange) {
      onDeliveryKmChange(newDistance);
    }
  };

  // Update GPS distance when it changes
  useEffect(() => {
    if (gpsDistance > 0 && deliveryType !== 'self_pickup') {
      handleDistanceChange(gpsDistance);
    }
  }, [gpsDistance, deliveryType]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Enhance Your Experience</h3>
        <p className="text-gray-600">Add extra services and choose your preferred delivery method</p>
      </div>
      
      {/* Add-ons Section */}
      <Card glass className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
          <h4 className="text-xl font-semibold text-gray-900 mb-2">Available Add-ons</h4>
          <p className="text-gray-600 text-sm">Enhance your rental with our premium services</p>
        </div>
        
        <div className="p-6">
          {addOns.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {addOns.map((addOn, index) => {
                const selectedAddOn = selectedAddOns.find(item => item.id === addOn.id);
                const isSelected = !!selectedAddOn;
                
                return (
                  <motion.div
                    key={addOn.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-[1.02]' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                    onClick={() => !isSelected && onAddOnToggle(addOn)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
                            ${isSelected ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}
                          `}>
                            {addOn.name.charAt(0)}
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 text-lg">{addOn.name}</h5>
                            <p className="text-gray-600 text-sm">RM {addOn.price_daily}/day × {bookingDetails.totalDays} days</p>
                            <p className="text-blue-600 font-medium">
                              Total: RM {(addOn.price_daily * bookingDetails.totalDays * (selectedAddOn?.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {isSelected ? (
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAddOnQuantity(addOn.id, selectedAddOn.quantity - 1);
                              }}
                              className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <span className="font-bold text-xl text-gray-900 w-8 text-center">{selectedAddOn.quantity}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAddOnQuantity(addOn.id, selectedAddOn.quantity + 1);
                              }}
                              className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddOnToggle(addOn);
                            }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No add-ons available at the moment</p>
            </div>
          )}
        </div>
      </Card>

      {/* Delivery Service Section */}
      <Card glass className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900">Delivery Options</h4>
          </div>
          <p className="text-gray-600 text-sm">Choose how you'd like to receive your vehicle</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* GPS Location Button */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <Navigation className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Auto-Calculate Distance</h4>
                  <p className="text-gray-600 text-sm">Use GPS to automatically calculate distance from your location</p>
                </div>
              </div>
              <Button
                onClick={getCurrentLocation}
                disabled={loadingGPS}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto min-h-[44px]"
              >
                {loadingGPS ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Getting Location...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Navigation className="w-4 h-4" />
                    <span>Get My Location</span>
                  </div>
                )}
              </Button>
            </div>
            
            {gpsError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{gpsError}</p>
              </div>
            )}
            
            {gpsDistance > 0 && (
              <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Distance from our office:</span>
                  <span className="font-bold text-green-600">{gpsDistance} km</span>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Method Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
            {deliveryOptions.map((option) => {
              const isSelected = deliveryType === option.id;
              const IconComponent = option.icon;
              
              return (
                <motion.label
                  key={option.id}
                  className="relative cursor-pointer group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    type="radio"
                    name="deliveryOption"
                    value={option.id}
                    checked={isSelected}
                    onChange={(e) => handleDeliveryOptionChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`
                    relative p-3 sm:p-4 lg:p-6 rounded-xl border-2 transition-all duration-300 overflow-hidden w-full
                    ${isSelected 
                      ? `border-${option.color}-500 bg-gradient-to-br from-${option.color}-50 to-${option.color}-100 shadow-xl` 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg group-hover:shadow-xl'
                    }
                  `}>
                    {/* Background Gradient */}
                    {isSelected && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-5`} />
                    )}
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className={`
                          p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0
                          ${isSelected 
                            ? `bg-gradient-to-r ${option.gradient} text-white` 
                            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                          }
                        `}>
                          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className={`
                          px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0 ml-2
                          ${isSelected 
                            ? `bg-${option.color}-500 text-white` 
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}>
                          {option.fee}
                        </div>
                      </div>
                      
                      <h4 className={`font-bold text-base sm:text-lg mb-1 sm:mb-2 ${isSelected ? `text-${option.color}-900` : 'text-gray-900'}`}>
                        {option.title}
                      </h4>
                      <p className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 break-words ${isSelected ? `text-${option.color}-700` : 'text-gray-600'}`}>
                        {option.subtitle}
                      </p>
                      <p className={`text-xs sm:text-sm leading-relaxed break-words ${isSelected ? `text-${option.color}-600` : 'text-gray-500'}`}>
                        {option.description}
                      </p>
                    </div>
                    
                  </div>
                </motion.label>
              );
            })}
          </div>

          {/* Distance Calculator for Delivery */}
          {deliveryType !== 'self_pickup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-purple-200 w-full max-w-full overflow-hidden"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                  <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h4 className="font-semibold text-sm sm:text-base text-gray-900">Distance Calculator</h4>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {deliveryType === 'free_pickup' ? 'Pickup Distance (km)' : 'Delivery Distance (km)'}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full">
                    <div className="flex-1">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={deliveryDistance}
                        onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider max-w-full"
                        style={{
                          background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${deliveryDistance}%, #e5e7eb ${deliveryDistance}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                        <span>1km</span>
                        <span className="hidden sm:inline">25km</span>
                        <span className="hidden sm:inline">50km</span>
                        <span className="hidden sm:inline">75km</span>
                        <span>100km</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={deliveryDistance}
                        onChange={(e) => handleDistanceChange(parseInt(e.target.value) || 1)}
                        className="w-16 sm:w-20 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent flex-shrink-0"
                      />
                      <span className="text-gray-600 text-sm font-medium">km</span>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                {deliveryDistance > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-3 sm:p-4 rounded-lg border border-purple-200 shadow-sm w-full max-w-full overflow-hidden"
                  >
                    <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-3">
                      <h5 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight flex-1 min-w-0">
                        {deliveryType === 'free_pickup' ? 'Pickup Fee Calculation' : 'Delivery Fee Calculation'}
                      </h5>
                      <div className="flex items-center space-x-1 text-purple-600 ml-2 flex-shrink-0">
                        <Info className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm whitespace-nowrap">
                          {deliveryType === 'free_pickup' ? 'Pickup Service' : 'Premium Service'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium flex-shrink-0">{deliveryDistance} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rate:</span>
                        <span className="font-medium text-right flex-shrink-0 max-w-[60%] break-words">
                          {deliveryType === 'free_pickup' 
                            ? 'Free for 7km, RM 2.00/km after' 
                            : 'RM 4.00 per km'
                          }
                        </span>
                      </div>
                      {deliveryType === 'free_pickup' && deliveryDistance <= 7 && (
                        <div className="flex justify-between text-green-600">
                          <span>Free Zone:</span>
                          <span className="font-medium text-right flex-shrink-0 max-w-[60%] break-words">Within 7km - No charge!</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-1.5 sm:pt-2">
                        <span className="font-semibold text-gray-900">
                          Total {deliveryType === 'free_pickup' ? 'Pickup' : 'Delivery'} Fee:
                        </span>
                        <span className="font-bold text-lg sm:text-xl text-purple-600 flex-shrink-0">
                          RM {bookingDetails.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Important Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-amber-900 mb-1 text-sm sm:text-base">Important Notice</h5>
                      <p className="text-amber-800 text-xs sm:text-sm leading-relaxed break-words">
                        {deliveryType === 'free_pickup' 
                          ? 'Pickup service includes transportation to our office. Additional charges for toll fees may apply based on actual route.'
                          : 'Delivery fee covers transportation only. Additional charges for toll fees and fuel costs may apply based on actual route and will be calculated separately.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AddOnsDeliveryForm;