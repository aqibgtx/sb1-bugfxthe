import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Upload, Download, Eye, Plus, Wrench, Car, Calendar, AlertTriangle, Trash2, Paperclip, Edit, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DocumentsModalProps {
  car: any;
  isOpen: boolean;
  onClose: () => void;
}

interface CarDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  expiry_date?: string;
  notes?: string;
  uploaded_at: string;
}

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  date: string;
  cost: number;
  description: string;
  service_provider: string;
  parts_replaced?: string;
  labor_hours?: number;
  warranty_period?: number;
  receipt_photos?: string[];
  condition_before: string;
  condition_after: string;
  created_at: string;
}

interface ServiceRecord {
  id: string;
  service_type: string;
  service_date: string;
  mileage: number;
  cost: number;
  description: string;
  service_provider: string;
  receipt_url?: string;
  next_service_due?: number;
  created_at: string;
}

const DocumentsModal: React.FC<DocumentsModalProps> = ({ car, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'repairs' | 'service'>('documents');
  const [documents, setDocuments] = useState<CarDocument[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('other');
  const [documentNotes, setDocumentNotes] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // New state for repair document uploads
  const [showRepairUploadForm, setShowRepairUploadForm] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [repairDocumentNotes, setRepairDocumentNotes] = useState('');

  // New state for editing
  const [editingRepair, setEditingRepair] = useState<MaintenanceRecord | null>(null);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  // Notify layout about modal state
  useEffect(() => {
    if (isOpen) {
      document.dispatchEvent(new CustomEvent('modal-open'));
      document.body.style.overflow = 'hidden';
    } else {
      document.dispatchEvent(new CustomEvent('modal-close'));
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const fetchAllData = async () => {
    if (!car?.id) return;

    setLoading(true);
    try {
      // Batch API calls for better performance
      const [documentsResponse, maintenanceResponse, serviceResponse] = await Promise.all([
        supabase
          .from('car_documents')
          .select('*')
          .eq('car_id', car.id)
          .order('uploaded_at', { ascending: false }),
        supabase
          .from('maintenance_records')
          .select('*')
          .eq('car_id', car.id)
          .order('date', { ascending: false }),
        supabase
          .from('service_records')
          .select('*')
          .eq('car_id', car.id)
          .order('service_date', { ascending: false })
      ]);

      if (documentsResponse.error) throw documentsResponse.error;
      if (maintenanceResponse.error) throw maintenanceResponse.error;
      if (serviceResponse.error) throw serviceResponse.error;

      setDocuments(documentsResponse.data || []);
      setMaintenanceRecords(maintenanceResponse.data || []);
      setServiceRecords(serviceResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAllData();
    toast.success('Data refreshed');
  };

  useEffect(() => {
    if (isOpen && car) {
      fetchAllData();
    }
  }, [isOpen, car]);

  const handleDocumentUpload = async (url: string, fileInfo: { name: string; size: number; type: string }) => {
    try {
      setUploading(true);

      const { error } = await supabase
        .from('car_documents')
        .insert({
          car_id: car.id,
          document_type: selectedDocumentType,
          document_name: fileInfo.name,
          file_url: url,
          file_size: fileInfo.size,
          mime_type: fileInfo.type,
          expiry_date: expiryDate || null,
          notes: documentNotes || null
        });

      if (error) throw error;

      toast.success('Document uploaded successfully');
      setShowUploadForm(false);
      setSelectedDocumentType('other');
      setDocumentNotes('');
      setExpiryDate('');
      await fetchAllData();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    } finally {
      setUploading(false);
    }
  };

  const handleRepairDocumentUpload = async (url: string, fileInfo: { name: string; size: number; type: string }) => {
    try {
      setUploading(true);

      const maintenanceRecord = maintenanceRecords.find(r => r.id === selectedRepairId);
      if (!maintenanceRecord) {
        throw new Error('Maintenance record not found');
      }

      const currentPhotos = maintenanceRecord.receipt_photos || [];
      const updatedPhotos = [...currentPhotos, url];

      // Batch operations
      const [updateMaintenance, insertDocument] = await Promise.all([
        supabase
          .from('maintenance_records')
          .update({ receipt_photos: updatedPhotos })
          .eq('id', selectedRepairId),
        supabase
          .from('car_documents')
          .insert({
            car_id: car.id,
            document_type: 'repair_invoice',
            document_name: fileInfo.name,
            file_url: url,
            file_size: fileInfo.size,
            mime_type: fileInfo.type,
            notes: `Repair receipt for ${maintenanceRecord.maintenance_type} on ${maintenanceRecord.date}. ${repairDocumentNotes || ''}`
          })
      ]);

      if (updateMaintenance.error) throw updateMaintenance.error;
      if (insertDocument.error) throw insertDocument.error;

      toast.success('Repair document uploaded successfully');
      setShowRepairUploadForm(false);
      setSelectedRepairId(null);
      setRepairDocumentNotes('');
      await fetchAllData();
    } catch (error) {
      console.error('Error saving repair document:', error);
      toast.error('Failed to save repair document');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
    setUploading(false);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('car_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document deleted successfully');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const maintenanceData = {
      car_id: car.id,
      maintenance_type: formData.get('maintenance_type') as string,
      date: formData.get('date') as string || new Date().toISOString().split('T')[0],
      cost: parseFloat(formData.get('cost') as string),
      description: formData.get('description') as string || 'No description provided',
      service_provider: formData.get('service_provider') as string || 'Not specified',
      parts_replaced: formData.get('parts_replaced') as string || null,
      labor_hours: formData.get('labor_hours') ? parseFloat(formData.get('labor_hours') as string) : null,
      warranty_period: formData.get('warranty_period') ? parseInt(formData.get('warranty_period') as string) : null,
      condition_before: formData.get('condition_before') as string || 'Not specified',
      condition_after: formData.get('condition_after') as string || 'Not specified'
    };

    try {
      setLoading(true);
      if (editingRepair) {
        const { error } = await supabase
          .from('maintenance_records')
          .update(maintenanceData)
          .eq('id', editingRepair.id);

        if (error) throw error;
        toast.success('Maintenance record updated successfully');
      } else {
        const { error } = await supabase
          .from('maintenance_records')
          .insert(maintenanceData);

        if (error) throw error;
        toast.success('Maintenance record added successfully');
      }

      setShowAddRepair(false);
      setEditingRepair(null);
      await fetchAllData();
    } catch (error) {
      console.error('Error saving maintenance record:', error);
      toast.error('Failed to save maintenance record');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRepair = (repair: MaintenanceRecord) => {
    setEditingRepair(repair);
    setShowAddRepair(true);
  };

  const handleDeleteRepair = async (repairId: string) => {
    if (!confirm('Are you sure you want to delete this repair record?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', repairId);

      if (error) throw error;

      toast.success('Repair record deleted successfully');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting repair record:', error);
      toast.error('Failed to delete repair record');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const serviceData = {
      car_id: car.id,
      service_type: formData.get('service_type') as string,
      service_date: formData.get('service_date') as string,
      mileage: parseInt(formData.get('mileage') as string) || 0,
      cost: parseFloat(formData.get('cost') as string),
      description: formData.get('description') as string || '',
      service_provider: formData.get('service_provider') as string || ''
    };

    try {
      setLoading(true);
      if (editingService) {
        const { error } = await supabase
          .from('service_records')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service record updated successfully');
      } else {
        const { error } = await supabase
          .from('service_records')
          .insert(serviceData);

        if (error) throw error;
        toast.success('Service record added successfully');

        if (serviceData.mileage > 0) {
          await supabase
            .from('cars')
            .update({ last_service_mileage: serviceData.mileage })
            .eq('id', car.id);
        }
      }

      setShowAddService(false);
      setEditingService(null);
      await fetchAllData();
    } catch (error) {
      console.error('Error saving service record:', error);
      toast.error('Failed to save service record');
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (service: ServiceRecord) => {
    setEditingService(service);
    setShowAddService(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service record?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('service_records')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast.success('Service record deleted successfully');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting service record:', error);
      toast.error('Failed to delete service record');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'road_tax':
        return <Car className="w-4 h-4 text-blue-500" />;
      case 'insurance':
        return <AlertTriangle className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'road_tax':
        return 'Road Tax';
      case 'insurance':
        return 'Insurance';
      case 'service_receipt':
        return 'Service Receipt';
      case 'repair_invoice':
        return 'Repair Invoice';
      case 'inspection_report':
        return 'Inspection Report';
      default:
        return 'Other Document';
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'repair':
        return <Wrench className="w-4 h-4 text-red-500" />;
      case 'replacement':
        return <Car className="w-4 h-4 text-orange-500" />;
      case 'inspection':
        return <Eye className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'engine_oil':
        return <Car className="w-4 h-4 text-green-500" />;
      case 'gearbox_oil':
        return <Car className="w-4 h-4 text-blue-500" />;
      case 'general_service':
        return <Wrench className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container" data-modal="true">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="modal-content modal-xl"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Car Documents & Records</h2>
            <p className="modal-text">{car.brand} {car.make} - {car.plate_number}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <button
              onClick={onClose}
              className="modal-close-button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="modal-text">Documents</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'repairs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="modal-text">Repairs</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'service'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Car className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="modal-text">Service</span>
            </div>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 modal-text">Loading...</span>
            </div>
          ) : (
            <>
              {/* Car Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                    <h3 className="modal-subtitle">Official Car Documents</h3>
                    <Button
                      onClick={() => setShowUploadForm(true)}
                      className="flex items-center space-x-2 mobile-button"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Document</span>
                    </Button>
                  </div>

                  {showUploadForm && (
                    <div className="modal-card border-2 border-dashed border-blue-300 bg-blue-50">
                      <h4 className="modal-subtitle mb-3">Upload New Document</h4>
                      
                      <div className="space-y-3 mb-3">
                        <div className="modal-grid">
                          <div>
                            <label className="modal-form-label">Document Type</label>
                            <select
                              value={selectedDocumentType}
                              onChange={(e) => setSelectedDocumentType(e.target.value)}
                              className="modal-form-input"
                            >
                              <option value="road_tax">Road Tax</option>
                              <option value="insurance">Insurance</option>
                              <option value="service_receipt">Service Receipt</option>
                              <option value="repair_invoice">Repair Invoice</option>
                              <option value="inspection_report">Inspection Report</option>
                              <option value="other">Other Document</option>
                            </select>
                          </div>
                          <div>
                            <label className="modal-form-label">Expiry Date (Optional)</label>
                            <input
                              type="date"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(e.target.value)}
                              className="modal-form-input"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="modal-form-label">Notes (Optional)</label>
                          <textarea
                            value={documentNotes}
                            onChange={(e) => setDocumentNotes(e.target.value)}
                            rows={2}
                            placeholder="Additional notes about this document..."
                            className="modal-form-input"
                          />
                        </div>
                      </div>

                      <FileUpload
                        onUpload={handleDocumentUpload}
                        onError={handleDocumentUploadError}
                        accept="image/*,application/pdf"
                        maxSize={10}
                        folder="car-documents"
                        fileName={`${car.plate_number}-${selectedDocumentType}-${Date.now()}`}
                        loading={uploading}
                      />
                      
                      <div className="modal-button-group mt-3">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowUploadForm(false);
                            setSelectedDocumentType('other');
                            setDocumentNotes('');
                            setExpiryDate('');
                          }}
                          className="modal-action-button"
                          disabled={uploading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="modal-grid">
                    {documents.map((document) => (
                      <div key={document.id} className="modal-card hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getDocumentTypeIcon(document.document_type)}
                            <h4 className="modal-text font-semibold text-gray-900">
                              {getDocumentTypeName(document.document_type)}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="modal-text text-gray-500">
                              {formatDate(document.uploaded_at)}
                            </span>
                            <button
                              onClick={() => handleDeleteDocument(document.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Delete document"
                              disabled={loading}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="modal-text text-gray-700 mb-2 truncate" title={document.document_name}>
                          {document.document_name}
                        </p>

                        {document.expiry_date && (
                          <div className="mb-2">
                            <span className="modal-text text-gray-600">Expires: </span>
                            <span className={`modal-text font-medium ${
                              new Date(document.expiry_date) < new Date() 
                                ? 'text-red-600' 
                                : new Date(document.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {formatDate(document.expiry_date)}
                            </span>
                          </div>
                        )}

                        {document.notes && (
                          <p className="modal-text text-gray-600 mb-2 line-clamp-2">{document.notes}</p>
                        )}

                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(document.file_url, '_blank')}
                            className="flex-1 flex items-center justify-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = document.file_url;
                              link.download = document.document_name;
                              link.click();
                            }}
                            className="flex-1 flex items-center justify-center space-x-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {documents.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="modal-text text-gray-600">No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Repair Records Tab */}
              {activeTab === 'repairs' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                    <h3 className="modal-subtitle">Repair & Maintenance Records</h3>
                    <Button
                      onClick={() => {
                        setEditingRepair(null);
                        setShowAddRepair(true);
                      }}
                      className="flex items-center space-x-2 mobile-button"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Repair Record</span>
                    </Button>
                  </div>

                  {showAddRepair && (
                    <div className="modal-card border-2 border-dashed border-green-300 bg-green-50">
                      <form onSubmit={handleAddMaintenance} className="space-y-3">
                        <h4 className="modal-subtitle">
                          {editingRepair ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
                        </h4>
                        
                        <div className="modal-grid">
                          <div>
                            <label className="modal-form-label">
                              Maintenance Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="maintenance_type"
                              defaultValue={editingRepair?.maintenance_type || 'repair'}
                              required
                              className="modal-form-input"
                            >
                              <option value="repair">Repair</option>
                              <option value="replacement">Parts Replacement</option>
                              <option value="inspection">Inspection</option>
                              <option value="cleaning">Cleaning/Detailing</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="modal-form-label">Cost (RM) <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              step="0.01"
                              name="cost"
                              defaultValue={editingRepair?.cost || ''}
                              required
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Date</label>
                            <input
                              type="date"
                              name="date"
                              defaultValue={editingRepair?.date || new Date().toISOString().split('T')[0]}
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Service Provider</label>
                            <input
                              type="text"
                              name="service_provider"
                              defaultValue={editingRepair?.service_provider || ''}
                              placeholder="Workshop/Company name"
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Parts Replaced</label>
                            <input
                              type="text"
                              name="parts_replaced"
                              defaultValue={editingRepair?.parts_replaced || ''}
                              placeholder="List of parts replaced"
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Labor Hours</label>
                            <input
                              type="number"
                              step="0.5"
                              name="labor_hours"
                              defaultValue={editingRepair?.labor_hours || ''}
                              placeholder="Hours worked"
                              className="modal-form-input"
                            />
                          </div>
                        </div>
                        
                        <div className="modal-grid">
                          <div>
                            <label className="modal-form-label">Condition Before</label>
                            <textarea
                              name="condition_before"
                              rows={2}
                              defaultValue={editingRepair?.condition_before || ''}
                              placeholder="Describe the condition before maintenance..."
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Condition After</label>
                            <textarea
                              name="condition_after"
                              rows={2}
                              defaultValue={editingRepair?.condition_after || ''}
                              placeholder="Describe the condition after maintenance..."
                              className="modal-form-input"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="modal-form-label">Description</label>
                          <textarea
                            name="description"
                            rows={2}
                            defaultValue={editingRepair?.description || ''}
                            placeholder="Detailed description of work performed..."
                            className="modal-form-input"
                          />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="modal-text text-blue-800">
                            <span className="font-medium">Note:</span> Only maintenance type and cost are required. 
                            All other fields are optional and can be filled in later if needed.
                          </p>
                        </div>

                        <div className="modal-button-group">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowAddRepair(false);
                              setEditingRepair(null);
                            }}
                            className="modal-action-button"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="modal-action-button" disabled={loading}>
                            {loading ? 'Saving...' : (editingRepair ? 'Update Record' : 'Add Record')}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Repair Document Upload Form */}
                  {showRepairUploadForm && selectedRepairId && (
                    <div className="modal-card border-2 border-dashed border-orange-300 bg-orange-50">
                      <h4 className="modal-subtitle mb-3">Upload Repair Document</h4>
                      
                      <div className="space-y-3 mb-3">
                        <div>
                          <label className="modal-form-label">Notes (Optional)</label>
                          <textarea
                            value={repairDocumentNotes}
                            onChange={(e) => setRepairDocumentNotes(e.target.value)}
                            rows={2}
                            placeholder="Additional notes about this repair document..."
                            className="modal-form-input"
                          />
                        </div>
                      </div>

                      <FileUpload
                        onUpload={handleRepairDocumentUpload}
                        onError={handleDocumentUploadError}
                        accept="image/*,application/pdf"
                        maxSize={10}
                        folder="repair-documents"
                        fileName={`${car.plate_number}-repair-${selectedRepairId}-${Date.now()}`}
                        loading={uploading}
                      />
                      
                      <div className="modal-button-group mt-3">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowRepairUploadForm(false);
                            setSelectedRepairId(null);
                            setRepairDocumentNotes('');
                          }}
                          className="modal-action-button"
                          disabled={uploading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {maintenanceRecords.map((record) => (
                      <div key={record.id} className="modal-card hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            {getMaintenanceTypeIcon(record.maintenance_type)}
                            <div>
                              <h4 className="modal-text font-semibold text-gray-900 capitalize">
                                {record.maintenance_type}
                              </h4>
                              <p className="modal-text text-gray-600">{record.service_provider || 'Service provider not specified'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                            <div className="text-left sm:text-right">
                              <p className="modal-text font-semibold text-gray-900">{formatCurrency(record.cost)}</p>
                              <p className="modal-text text-gray-600">{formatDate(record.date)}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRepair(record)}
                                className="flex items-center space-x-1"
                                disabled={loading}
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRepairId(record.id);
                                  setShowRepairUploadForm(true);
                                }}
                                className="flex items-center space-x-1"
                                disabled={uploading}
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>Upload</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRepair(record.id)}
                                className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                                disabled={loading}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {record.description && record.description !== 'No description provided' && (
                            <div>
                              <h5 className="modal-text font-medium text-gray-900 mb-1">Description</h5>
                              <p className="modal-text text-gray-700">{record.description}</p>
                            </div>
                          )}
                          
                          {record.parts_replaced && (
                            <div>
                              <h5 className="modal-text font-medium text-gray-900 mb-1">Parts Replaced</h5>
                              <p className="modal-text text-gray-700">{record.parts_replaced}</p>
                            </div>
                          )}

                          {(record.condition_before !== 'Not specified' || record.condition_after !== 'Not specified') && (
                            <div className="modal-grid">
                              {record.condition_before !== 'Not specified' && (
                                <div>
                                  <h5 className="modal-text font-medium text-gray-900 mb-1">Condition Before</h5>
                                  <p className="modal-text text-gray-700">{record.condition_before}</p>
                                </div>
                              )}
                              {record.condition_after !== 'Not specified' && (
                                <div>
                                  <h5 className="modal-text font-medium text-gray-900 mb-1">Condition After</h5>
                                  <p className="modal-text text-gray-700">{record.condition_after}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {(record.labor_hours || record.warranty_period) && (
                            <div className="flex flex-wrap items-center gap-4 modal-text text-gray-600">
                              {record.labor_hours && <span>Labor Hours: {record.labor_hours}</span>}
                              {record.warranty_period && <span>Warranty: {record.warranty_period} days</span>}
                            </div>
                          )}

                          {record.receipt_photos && record.receipt_photos.length > 0 && (
                            <div>
                              <h5 className="modal-text font-medium text-gray-900 mb-2">Attached Documents</h5>
                              <div className="flex flex-wrap gap-2">
                                {record.receipt_photos.map((photoUrl, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={photoUrl}
                                      alt={`Receipt ${index + 1}`}
                                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(photoUrl, '_blank')}
                                      loading="lazy"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {maintenanceRecords.length === 0 && (
                    <div className="text-center py-8">
                      <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="modal-text text-gray-600">No repair records found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Service & Maintenance Tab */}
              {activeTab === 'service' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                    <h3 className="modal-subtitle">Service & Oil Change Records</h3>
                    <Button
                      onClick={() => {
                        setEditingService(null);
                        setShowAddService(true);
                      }}
                      className="flex items-center space-x-2 mobile-button"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Service Record</span>
                    </Button>
                  </div>

                  {showAddService && (
                    <div className="modal-card border-2 border-dashed border-purple-300 bg-purple-50">
                      <form onSubmit={handleAddService} className="space-y-3">
                        <h4 className="modal-subtitle">
                          {editingService ? 'Edit Service Record' : 'Add Service Record'}
                        </h4>
                        
                        <div className="modal-grid">
                          <div>
                            <label className="modal-form-label">Service Type <span className="text-red-500">*</span></label>
                            <select
                              name="service_type"
                              defaultValue={editingService?.service_type || 'engine_oil'}
                              required
                              className="modal-form-input"
                            >
                              <option value="engine_oil">Engine Oil Change</option>
                              <option value="gearbox_oil">Gearbox Oil Service</option>
                              <option value="general_service">General Service</option>
                              <option value="repair">Repair</option>
                            </select>
                          </div>
                          <div>
                            <label className="modal-form-label">Cost (RM) <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              step="0.01"
                              name="cost"
                              defaultValue={editingService?.cost || ''}
                              required
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Service Date</label>
                            <input
                              type="date"
                              name="service_date"
                              defaultValue={editingService?.service_date || new Date().toISOString().split('T')[0]}
                              className="modal-form-input"
                            />
                          </div>
                          <div>
                            <label className="modal-form-label">Mileage (km)</label>
                            <input
                              type="number"
                              name="mileage"
                              defaultValue={editingService?.mileage || ''}
                              className="modal-form-input"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="modal-form-label">Service Provider</label>
                            <input
                              type="text"
                              name="service_provider"
                              defaultValue={editingService?.service_provider || ''}
                              placeholder="Workshop name"
                              className="modal-form-input"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="modal-form-label">Description</label>
                          <textarea
                            name="description"
                            rows={2}
                            defaultValue={editingService?.description || ''}
                            placeholder="Service details..."
                            className="modal-form-input"
                          />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="modal-text text-blue-800">
                            <span className="font-medium">Note:</span> Only service type and cost are required. 
                            All other fields are optional.
                          </p>
                        </div>

                        <div className="modal-button-group">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowAddService(false);
                              setEditingService(null);
                            }}
                            className="modal-action-button"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="modal-action-button" disabled={loading}>
                            {loading ? 'Saving...' : (editingService ? 'Update Service Record' : 'Add Service Record')}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-4">
                    {serviceRecords.map((record) => (
                      <div key={record.id} className="modal-card hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            {getServiceTypeIcon(record.service_type)}
                            <div>
                              <h4 className="modal-text font-semibold text-gray-900 capitalize">
                                {record.service_type.replace('_', ' ')}
                              </h4>
                              <p className="modal-text text-gray-600">{record.service_provider || 'Service provider not specified'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                            <div className="text-left sm:text-right">
                              <p className="modal-text font-semibold text-gray-900">{formatCurrency(record.cost)}</p>
                              <p className="modal-text text-gray-600">{formatDate(record.service_date)}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditService(record)}
                                className="flex items-center space-x-1"
                                disabled={loading}
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteService(record.id)}
                                className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                                disabled={loading}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 modal-grid modal-text text-gray-700">
                          {record.mileage > 0 && (
                            <div>
                              <span className="text-gray-600">Mileage:</span>
                              <span className="ml-1 font-medium">{record.mileage.toLocaleString()} km</span>
                            </div>
                          )}
                          {record.next_service_due && (
                            <div>
                              <span className="text-gray-600">Next Due:</span>
                              <span className="ml-1 font-medium">{record.next_service_due.toLocaleString()} km</span>
                            </div>
                          )}
                        </div>

                        {record.description && (
                          <div className="mt-2">
                            <h5 className="modal-text font-medium text-gray-900 mb-1">Service Details</h5>
                            <p className="modal-text text-gray-700">{record.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {serviceRecords.length === 0 && (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="modal-text text-gray-600">No service records found</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentsModal;