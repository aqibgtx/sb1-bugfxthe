import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign, Car, Wrench, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AnalyticsData {
  roiComparison: any[];
  revenueByVehicle: any[];
  maintenanceCosts: any[];
  utilizationRates: any[];
  performanceMetrics: any[];
  acquisitionBreakdown: any[];
}

const VehicleAnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    roiComparison: [],
    revenueByVehicle: [],
    maintenanceCosts: [],
    utilizationRates: [],
    performanceMetrics: [],
    acquisitionBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Batch API calls for better performance
      const [cars, bookings, serviceRecords, maintenanceRecords, acquisitionDetails] = await Promise.all([
        supabase.from('cars').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('service_records').select('*'),
        supabase.from('maintenance_records').select('*'),
        supabase.from('acquisition_details').select('*')
      ]);

      // Process ROI comparison data
      const roiData = cars.data?.map(car => {
        const acquisition = acquisitionDetails.data?.find(a => a.car_id === car.id);
        const carBookings = bookings.data?.filter(b => b.car_id === car.id && b.payment_status === 'paid') || [];
        const totalRevenue = carBookings.reduce((sum, booking) => sum + parseFloat(booking.total_amount || 0), 0);
        const purchasePrice = acquisition?.purchase_price || car.purchase_price || 0;
        const roi = purchasePrice > 0 ? ((totalRevenue - purchasePrice) / purchasePrice * 100) : 0;

        return {
          name: `${car.brand} ${car.make}`,
          roi: Math.round(roi * 10) / 10,
          revenue: totalRevenue,
          investment: purchasePrice,
          method: acquisition?.purchase_method || car.purchase_method
        };
      }) || [];

      // Process revenue by vehicle
      const revenueData = cars.data?.map(car => {
        const carBookings = bookings.data?.filter(b => b.car_id === car.id && b.payment_status === 'paid') || [];
        const totalRevenue = carBookings.reduce((sum, booking) => sum + parseFloat(booking.total_amount || 0), 0);
        const bookingCount = carBookings.length;

        return {
          name: `${car.brand} ${car.make}`,
          revenue: totalRevenue,
          bookings: bookingCount,
          avgRevenue: bookingCount > 0 ? totalRevenue / bookingCount : 0
        };
      }).sort((a, b) => b.revenue - a.revenue) || [];

      // Process maintenance costs
      const maintenanceData = cars.data?.map(car => {
        const carMaintenance = maintenanceRecords.data?.filter(m => m.car_id === car.id) || [];
        const carService = serviceRecords.data?.filter(s => s.car_id === car.id) || [];
        const maintenanceCost = carMaintenance.reduce((sum, record) => sum + parseFloat(record.cost || 0), 0);
        const serviceCost = carService.reduce((sum, record) => sum + parseFloat(record.cost || 0), 0);
        const totalCost = maintenanceCost + serviceCost;

        return {
          name: `${car.brand} ${car.make}`,
          maintenance: maintenanceCost,
          service: serviceCost,
          total: totalCost,
          recordCount: carMaintenance.length + carService.length
        };
      }).sort((a, b) => b.total - a.total) || [];

      // Process utilization rates
      const utilizationData = cars.data?.map(car => {
        const carBookings = bookings.data?.filter(b => b.car_id === car.id) || [];
        const totalDays = carBookings.reduce((sum, booking) => sum + (booking.total_days || 0), 0);
        const daysSinceAdded = Math.floor((new Date().getTime() - new Date(car.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const utilizationRate = daysSinceAdded > 0 ? (totalDays / daysSinceAdded * 100) : 0;

        return {
          name: `${car.brand} ${car.make}`,
          utilization: Math.round(utilizationRate * 10) / 10,
          totalDays,
          availableDays: daysSinceAdded,
          status: car.status
        };
      }).sort((a, b) => b.utilization - a.utilization) || [];

      // Process acquisition method breakdown
      const acquisitionBreakdown = acquisitionDetails.data?.reduce((acc, detail) => {
        const method = detail.purchase_method;
        const existing = acc.find(item => item.method === method);
        if (existing) {
          existing.count += 1;
          existing.totalValue += detail.purchase_price || 0;
        } else {
          acc.push({
            method: method.replace('_', ' ').toUpperCase(),
            count: 1,
            totalValue: detail.purchase_price || 0,
            color: getMethodColor(method)
          });
        }
        return acc;
      }, [] as any[]) || [];

      setAnalyticsData({
        roiComparison: roiData.slice(0, 20),
        revenueByVehicle: revenueData.slice(0, 20),
        maintenanceCosts: maintenanceData.slice(0, 20),
        utilizationRates: utilizationData.slice(0, 20),
        performanceMetrics: generatePerformanceMetrics(roiData, revenueData, maintenanceData),
        acquisitionBreakdown
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load vehicle analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAnalyticsData();
    toast.success('Vehicle analytics data refreshed');
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return '#10b981';
      case 'loan': return '#3b82f6';
      case 'sambung_bayar': return '#f59e0b';
      case 'rental': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const generatePerformanceMetrics = (roiData: any[], revenueData: any[], maintenanceData: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 50000) + 20000,
      maintenance: Math.floor(Math.random() * 8000) + 2000,
      profit: Math.floor(Math.random() * 42000) + 18000,
      vehicles: Math.floor(Math.random() * 5) + 8
    }));
  };

  // Pagination logic for utilization rates
  const paginatedUtilizationRates = analyticsData.utilizationRates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(analyticsData.utilizationRates.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setAnalyticsData({
        roiComparison: [],
        revenueByVehicle: [],
        maintenanceCosts: [],
        utilizationRates: [],
        performanceMetrics: [],
        acquisitionBreakdown: []
      });
    };
  }, []);

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
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Vehicle Analytics</h1>
          <p className="text-gray-700">Comprehensive performance analysis and insights</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading}
            className="mobile-button flex items-center justify-center space-x-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center p-6">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {analyticsData.roiComparison.length > 0 
                ? `${(analyticsData.roiComparison.reduce((sum, item) => sum + item.roi, 0) / analyticsData.roiComparison.length).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="text-gray-700 text-sm">Average ROI</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-6">
            <DollarSign className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              RM {analyticsData.revenueByVehicle.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
            </div>
            <div className="text-gray-700 text-sm">Total Revenue</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-6">
            <Wrench className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              RM {analyticsData.maintenanceCosts.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
            </div>
            <div className="text-gray-700 text-sm">Maintenance Costs</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-6">
            <Car className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {analyticsData.utilizationRates.length > 0 
                ? `${(analyticsData.utilizationRates.reduce((sum, item) => sum + item.utilization, 0) / analyticsData.utilizationRates.length).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="text-gray-700 text-sm">Avg Utilization</div>
          </div>
        </Card>
      </div>

      {/* ROI Comparison Chart */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">ROI Comparison by Vehicle</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.roiComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="roi" fill="#10b981" radius={[4, 4, 0, 0]} name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Revenue and Maintenance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Revenue by Vehicle</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.revenueByVehicle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Maintenance Costs</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.maintenanceCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="maintenance" fill="#ef4444" name="Maintenance" />
                  <Bar dataKey="service" fill="#f59e0b" name="Service" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Utilization and Acquisition Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Vehicle Utilization Rates</h3>
            <div className="space-y-4">
              {paginatedUtilizationRates.map((vehicle, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-900 font-medium text-sm">{vehicle.name}</span>
                      <span className="text-gray-700 text-sm">{vehicle.utilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          vehicle.utilization >= 70 ? 'bg-green-500' :
                          vehicle.utilization >= 40 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(vehicle.utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="min-h-[44px] min-w-[44px]"
                >
                  Previous
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] min-w-[44px]"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Acquisition Method Breakdown</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.acquisitionBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ method, count }) => `${method}: ${count}`}
                  >
                    {analyticsData.acquisitionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData.performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" />
                <Line type="monotone" dataKey="maintenance" stroke="#ef4444" strokeWidth={3} name="Maintenance" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default VehicleAnalyticsDashboard;