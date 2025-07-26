import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, User, TrendingUp, Car, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import toast from 'react-hot-toast';

const AdminSoldCars: React.FC = () => {
  const { fetchSoldCars, setLoading } = useSupabaseData();
  const [soldCars, setSoldCars] = useState<any[]>([]);
  const [loading, setLoadingState] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 12;

  const fetchData = async (page: number = 1) => {
    try {
      setLoadingState(true);
      const pagination = { page, limit: itemsPerPage };
      const result = await fetchSoldCars(pagination);
      setSoldCars(result.data || []);
      setTotalCount(result.count || 0);
    } catch (error) {
      console.error('Error loading sold cars:', error);
      toast.error('Failed to load sold cars');
    } finally {
      setLoadingState(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchData(currentPage);
      toast.success('Sold cars data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchData(page);
  };

  useEffect(() => {
    fetchData(1);
    
    // Cleanup function to clear data on unmount
    return () => {
      setSoldCars([]);
      setTotalCount(0);
    };
  }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const totalPurchaseValue = soldCars.reduce((sum, car) => sum + parseFloat(car.car?.purchase_price || 0), 0);
  const totalSaleValue = soldCars.reduce((sum, car) => sum + parseFloat(car.sale_price || 0), 0);
  const totalRevenue = soldCars.reduce((sum, car) => sum + parseFloat(car.total_rental_revenue || 0), 0);
  const netResult = totalRevenue + totalSaleValue - totalPurchaseValue;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-3 sm:space-y-4 lg:space-y-8 mobile-container"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Sold Cars</h1>
          <p className="text-gray-700 text-sm sm:text-base">Track sold vehicles and their performance history</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center space-x-2 mobile-button"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mobile-grid">
        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="p-2 sm:p-3 bg-blue-600 rounded-full">
              <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">{totalCount}</div>
          <div className="text-gray-700 text-xs sm:text-sm">Cars Sold</div>
        </Card>

        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="p-2 sm:p-3 bg-green-600 rounded-full">
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">RM {totalSaleValue.toLocaleString()}</div>
          <div className="text-gray-700 text-xs sm:text-sm">Total Sale Value</div>
        </Card>

        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="p-2 sm:p-3 bg-purple-600 rounded-full">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">RM {totalRevenue.toLocaleString()}</div>
          <div className="text-gray-700 text-xs sm:text-sm">Rental Revenue</div>
        </Card>

        <Card className="text-center mobile-card">
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className={`p-2 sm:p-3 rounded-full ${netResult >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div className={`text-lg sm:text-xl lg:text-2xl font-bold mb-1 ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            RM {Math.abs(netResult).toLocaleString()}
          </div>
          <div className="text-gray-700 text-xs sm:text-sm">{netResult >= 0 ? 'Net Profit' : 'Net Loss'}</div>
        </Card>
      </div>

      {/* Sold Cars List */}
      {soldCars.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {soldCars.map((soldCar, index) => (
              <motion.div
                key={soldCar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden mobile-card">
                  <div className="relative h-32 sm:h-40 lg:h-48 mb-3 sm:mb-4">
                    <img 
                      src={soldCar.car?.image_url || 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                      alt={`${soldCar.car?.brand} ${soldCar.car?.make}`}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                    />
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                      <StatusBadge status="completed" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                        {soldCar.car?.brand} {soldCar.car?.make}
                      </h3>
                      <p className="text-gray-700 text-sm">{soldCar.car?.spec}</p>
                    </div>

                    {/* Sale Information */}
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                        <span className="text-gray-700 text-xs sm:text-sm">Sold to: {soldCar.sold_to}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                        <span className="text-gray-700 text-xs sm:text-sm">Date: {soldCar.sold_date}</span>
                      </div>
                      {soldCar.years_owned && (
                        <div className="text-gray-700 text-xs sm:text-sm">
                          Owned for: {soldCar.years_owned} years
                        </div>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Purchase Price:</span>
                        <span className="text-gray-900">RM {parseFloat(soldCar.car?.purchase_price || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Sale Price:</span>
                        <span className="text-gray-900">RM {parseFloat(soldCar.sale_price || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Rental Revenue:</span>
                        <span className="text-green-600">RM {parseFloat(soldCar.total_rental_revenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 sm:pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Total ROI:</span>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold text-xs sm:text-sm ${(soldCar.roi_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(soldCar.roi_percentage || 0) >= 0 ? '+' : ''}{(soldCar.roi_percentage || 0).toFixed(1)}%
                            </span>
                            <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 ${(soldCar.roi_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    <div className="pt-2 sm:pt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Performance</span>
                        <span>{(soldCar.roi_percentage || 0) >= 0 ? 'Profitable' : 'Loss'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (soldCar.roi_percentage || 0) >= 50 ? 'bg-green-500' :
                            (soldCar.roi_percentage || 0) >= 0 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(Math.max(((soldCar.roi_percentage || 0) + 100) / 2, 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card className="mobile-card">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} sold cars
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="flex items-center space-x-1 min-h-[44px] min-w-[44px]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "primary" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="min-h-[44px] min-w-[44px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="flex items-center space-x-1 min-h-[44px] min-w-[44px]"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="text-center py-8 sm:py-12 mobile-card">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Car className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Sold Cars</h3>
          <p className="text-gray-700 text-sm sm:text-base">No cars have been sold yet.</p>
        </Card>
      )}
    </motion.div>
  );
};

export default AdminSoldCars;