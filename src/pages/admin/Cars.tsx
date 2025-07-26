import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, DollarSign, FileText, CreditCard, CheckCircle, AlertTriangle, Hash, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import FileUpload from '../../components/ui/FileUpload';
import AcquisitionDetailsModal from '../../components/cars/AcquisitionDetailsModal';
import DocumentsModal from '../../components/cars/DocumentsModal';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 12;

const AdminCars: React.FC = () => {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<any>(null);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'acquisition' | 'documents' | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCars, setTotalCars] = useState(0);

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Calculate offset for pagination
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      // Batch API calls for better performance
      const [carsResponse, countResponse] = await Promise.all([
        supabase
          .from('cars')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1),
        supabase
          .from('cars')
          .select('*', { count: 'exact', head: true })
      ]);

      if (carsResponse.error) throw carsResponse.error;
      if (countResponse.error) throw countResponse.error;

      setCars(carsResponse.data || []);
      setTotalCars(countResponse.count || 0);
      setTotalPages(Math.ceil((countResponse.count || 0) / ITEMS_PER_PAGE));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading cars:', error);
      toast.error('Failed to load cars');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchData(currentPage);
      toast.success('Cars data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchData(page);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleEdit = (car: any) => {
    setEditingCar(car);
    setNewImageUrl(null);
    setUploadingImage(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this car?')) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('cars')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Car deleted successfully');
        await fetchData(currentPage);
      } catch (error) {
        console.error('Error deleting car:', error);
        toast.error('Failed to delete car');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForceAvailable = async (car: any) => {
    const confirmMessage = car.status === 'rented' 
      ? 'This car is currently rented. Are you sure you want to force it back to available? This may affect active bookings.'
      : 'Are you sure you want to mark this car as available?';
    
    if (confirm(confirmMessage)) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('cars')
          .update({ status: 'available' })
          .eq('id', car.id);

        if (error) throw error;

        toast.success('Car status updated to available');
        await fetchData(currentPage);
      } catch (error) {
        console.error('Error updating car status:', error);
        toast.error('Failed to update car status');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAsSold = async (car: any) => {
    const soldTo = prompt('Sold to (customer name):');
    const salePrice = prompt('Sale price:');
    
    if (soldTo && salePrice) {
      try {
        setLoading(true);
        // Batch operations for better performance
        const [carUpdate, soldCarInsert] = await Promise.all([
          supabase
            .from('cars')
            .update({ status: 'sold' })
            .eq('id', car.id),
          supabase
            .from('sold_cars')
            .insert({
              car_id: car.id,
              sold_to: soldTo,
              sale_price: parseFloat(salePrice),
              sold_date: new Date().toISOString().split('T')[0],
              years_owned: 1,
              total_rental_revenue: 0,
              roi_percentage: 0
            })
        ]);

        if (carUpdate.error) throw carUpdate.error;
        if (soldCarInsert.error) throw soldCarInsert.error;

        toast.success(`Car marked as sold to ${soldTo} for RM ${salePrice}`);
        await fetchData(currentPage);
      } catch (error) {
        console.error('Error marking car as sold:', error);
        toast.error('Failed to mark car as sold');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImageUpload = (url: string, fileInfo: { name: string; size: number; type: string }) => {
    setNewImageUrl(url);
    setUploadingImage(null);
    toast.success('Image uploaded successfully! Click "Add Car" to save changes.');
  };

  const handleImageUploadError = (error: string) => {
    toast.error(`Image upload failed: ${error}`);
    setUploadingImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission started');
    console.log('Event target:', e.target);
    console.log('Is HTMLFormElement:', e.target instanceof HTMLFormElement);
    
    if (!(e.target instanceof HTMLFormElement)) {
      console.error('Event target is not a form element');
      toast.error('Form submission error');
      return;
    }

    const formData = new FormData(e.target);
    
    // Log all form data for debugging
    console.log('Form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Validate required fields
    const brand = formData.get('brand') as string;
    const make = formData.get('make') as string;
    const plateNumber = formData.get('plate_number') as string;
    const rentalPrice = formData.get('rental_price_daily') as string;
    const purchasePrice = formData.get('purchase_price') as string;

    if (!brand || !make || !plateNumber || !rentalPrice || !purchasePrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const carData = {
      brand: brand.trim(),
      make: make.trim(),
      spec: (formData.get('spec') as string)?.trim() || null,
      plate_number: plateNumber.trim().toUpperCase(),
      tyre_size: (formData.get('tyre_size') as string)?.trim() || null,
      current_mileage: parseInt(formData.get('current_mileage') as string) || 0,
      rental_price_daily: parseFloat(rentalPrice),
      purchase_price: parseFloat(purchasePrice),
      imei: (formData.get('imei') as string)?.trim() || null,
      image_url: newImageUrl || editingCar?.image_url || 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400'
    };

    console.log('Car data to be saved:', carData);

    try {
      setLoading(true);
      
      if (editingCar) {
        console.log('Updating existing car:', editingCar.id);
        const { error } = await supabase
          .from('cars')
          .update(carData)
          .eq('id', editingCar.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        toast.success('Car updated successfully');
      } else {
        console.log('Inserting new car');
        const { data, error } = await supabase
          .from('cars')
          .insert(carData)
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        
        console.log('Car inserted successfully:', data);
        toast.success('Car added successfully');
      }

      setShowForm(false);
      setEditingCar(null);
      setNewImageUrl(null);
      setUploadingImage(null);
      await fetchData(currentPage);
    } catch (error: any) {
      console.error('Error saving car:', error);
      
      // More specific error messages
      if (error.code === '23505') {
        toast.error('A car with this plate number already exists');
      } else if (error.message?.includes('plate_number')) {
        toast.error('Invalid plate number format');
      } else {
        toast.error(`Failed to save car: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (car: any, modalType: 'acquisition' | 'documents') => {
    setSelectedCar(car);
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setSelectedCar(null);
    setActiveModal(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCar(null);
    setUploadingImage(null);
    setNewImageUrl(null);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-8 px-4">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCars)} of {totalCars} cars
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          <div className="flex space-x-1">
            {pages.map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={loading}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Cars</h1>
          <p className="text-gray-700">Comprehensive vehicle management with service tracking and analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 mobile-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 mobile-button"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Car</span>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading cars...</span>
        </div>
      )}

      {/* Cars Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car, index) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border border-gray-200 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-48 mb-4">
                  <img 
                    src={car.image_url || 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                    alt={`${car.brand} ${car.make}`}
                    className="w-full h-full object-cover rounded-t-lg"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={car.status as any} />
                  </div>
                  {/* Number Plate Badge */}
                  <div className="absolute bottom-3 left-3">
                    <div className="bg-white/95 px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-1">
                        <Hash className="w-3 h-3 text-gray-600" />
                        <span className="text-xs font-mono font-bold text-gray-900">{car.plate_number}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {car.brand} {car.make}
                    </h3>
                    <p className="text-gray-700">{car.spec}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-mono text-gray-600">{car.plate_number}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Mileage</p>
                      <p className="text-gray-900 font-medium">{car.current_mileage?.toLocaleString() || 0} km</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Daily Rate</p>
                      <p className="text-gray-900 font-medium">RM {car.rental_price_daily}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tyre Size</p>
                      <p className="text-gray-900 font-medium">{car.tyre_size || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">IMEI</p>
                      <p className="text-gray-900 font-medium">{car.imei || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Service Alert */}
                  {car.current_mileage && car.last_service_mileage && 
                   car.current_mileage - car.last_service_mileage >= (car.service_interval || 5000) && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm font-medium">⚠️ Service Due</p>
                      <p className="text-yellow-700 text-xs">
                        Last service: {car.last_service_mileage?.toLocaleString() || 0} km
                      </p>
                    </div>
                  )}

                  {/* Management Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(car, 'documents')}
                      className="flex items-center justify-center space-x-1"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Documents & Records</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(car, 'acquisition')}
                      className="flex items-center justify-center space-x-1"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Finance</span>
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-3 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(car)}
                      className="flex-1 flex items-center justify-center space-x-1"
                      disabled={loading}
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                    
                    {/* Force Available Button - Only show for non-available cars */}
                    {car.status !== 'available' && car.status !== 'sold' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleForceAvailable(car)}
                        className="flex-1 flex items-center justify-center space-x-1"
                        title={car.status === 'rented' ? 'Force car back to available (may affect active bookings)' : 'Mark as available'}
                        disabled={loading}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Available</span>
                      </Button>
                    )}
                    
                    {car.status !== 'sold' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleMarkAsSold(car)}
                        className="flex-1 flex items-center justify-center space-x-1"
                        disabled={loading}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Sell</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(car.id)}
                      className="flex items-center justify-center"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && cars.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No cars found</h3>
          <p className="text-gray-600">Get started by adding your first car to the system.</p>
        </div>
      )}

      {/* Pagination */}
      {renderPagination()}

      {/* Add/Edit Car Form Modal - FIXED FOR MOBILE */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCar ? 'Edit Car' : 'Add New Car'}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-h-[60vh] sm:max-h-[65vh]">
                <div className="space-y-4">
                {/* Car Image Upload */}
                  <div>
                  <label className="block font-medium text-gray-900 mb-2">Car Image</label>
                  
                  {/* Show current or new image */}
                  {(editingCar || newImageUrl) && (
                    <div className="mb-3">
                      <img 
                        src={newImageUrl || editingCar?.image_url || 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                        alt="Car preview"
                        className="w-full h-32 sm:h-40 object-cover rounded-lg"
                      />
                      {newImageUrl && (
                        <p className="text-green-600 text-sm mt-2">✓ New image uploaded. Click "Add Car" to save.</p>
                      )}
                    </div>
                  )}
                  
                  {/* Upload component */}
                  <FileUpload
                    onUpload={handleImageUpload}
                    onError={handleImageUploadError}
                    accept="image/*"
                    maxSize={5}
                    folder="cars"
                    fileName={`car-${Date.now()}`}
                  />
                </div>
                
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="brand"
                      defaultValue={editingCar?.brand || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Toyota"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Make <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="make"
                      defaultValue={editingCar?.make || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Camry"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="plate_number"
                      defaultValue={editingCar?.plate_number || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="WA1234A"
                      style={{ textTransform: 'uppercase' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">Specification</label>
                    <input
                      type="text"
                      name="spec"
                      defaultValue={editingCar?.spec || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2.5L Hybrid"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">Tyre Size</label>
                    <input
                      type="text"
                      name="tyre_size"
                      defaultValue={editingCar?.tyre_size || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="215/60R16"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">Current Mileage</label>
                    <input
                      type="number"
                      name="current_mileage"
                      defaultValue={editingCar?.current_mileage || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="45000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Rental Price (Daily) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="rental_price_daily"
                      defaultValue={editingCar?.rental_price_daily || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="120"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Purchase Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="purchase_price"
                      defaultValue={editingCar?.purchase_price || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="80000"
                      min="0"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-gray-900 mb-2">IMEI</label>
                    <input
                      type="text"
                      name="imei"
                      defaultValue={editingCar?.imei || ''}
                      className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="IME123456789"
                    />
                  </div>
                </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelForm}
                    disabled={loading}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="min-h-[44px]"
                  >
                    {loading ? 'Saving...' : (editingCar ? 'Update Car' : 'Add Car')}
                  </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modals */}
      {selectedCar && (
        <AcquisitionDetailsModal
          car={selectedCar}
          isOpen={activeModal === 'acquisition'}
          onClose={closeModal}
        />
      )}
      
      {selectedCar && (
        <DocumentsModal
          car={selectedCar}
          isOpen={activeModal === 'documents'}
          onClose={closeModal}
        />
      )}
    </motion.div>
  );
};

export default AdminCars;