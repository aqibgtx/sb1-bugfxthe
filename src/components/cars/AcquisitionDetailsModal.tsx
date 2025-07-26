import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, Calendar, CreditCard, FileText, Building, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AcquisitionDetails {
  id: string;
  car_id: string;
  purchase_method: 'cash' | 'loan' | 'sambung_bayar' | 'rental';
  purchase_price: number;
  initial_payment?: number;
  monthly_installment?: number;
  monthly_due_day?: number;
  monthly_due_month?: number;
  payment_schedule?: any;
  bank_name?: string;
  bank_account?: string;
  loan_start_date?: string;
  loan_duration_months?: number;
  company_info?: any;
  rental_rate_daily?: number;
  rental_rate_monthly?: number;
  rental_duration?: number;
  selling_price?: number;
  roi_percentage?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentReminder {
  id: string;
  car_id: string;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  reminder_sent: boolean;
}

interface AcquisitionDetailsModalProps {
  car: any;
  isOpen: boolean;
  onClose: () => void;
}

const AcquisitionDetailsModal: React.FC<AcquisitionDetailsModalProps> = ({ car, isOpen, onClose }) => {
  const [acquisitionDetails, setAcquisitionDetails] = useState<AcquisitionDetails | null>(null);
  const [paymentReminders, setPaymentReminders] = useState<PaymentReminder[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPurchaseMethod, setSelectedPurchaseMethod] = useState<string>('cash');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const fetchData = async () => {
    if (!car?.id) return;

    try {
      setLoading(true);
      
      // Batch API calls for better performance
      const [acquisitionResponse, remindersResponse] = await Promise.all([
        supabase
          .from('acquisition_details')
          .select('*')
          .eq('car_id', car.id)
          .maybeSingle(),
        supabase
          .from('payment_reminders')
          .select('*')
          .eq('car_id', car.id)
          .order('due_date', { ascending: true })
      ]);

      if (acquisitionResponse.error) throw acquisitionResponse.error;
      if (remindersResponse.error) throw remindersResponse.error;

      setAcquisitionDetails(acquisitionResponse.data);
      setPaymentReminders(remindersResponse.data || []);
    } catch (error) {
      console.error('Error loading acquisition details:', error);
      toast.error('Failed to load acquisition details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData();
    toast.success('Data refreshed');
  };

  useEffect(() => {
    if (isOpen && car?.id) {
      fetchData();
    }
  }, [isOpen, car?.id]);

  useEffect(() => {
    if (acquisitionDetails) {
      setSelectedPurchaseMethod(acquisitionDetails.purchase_method);
    }
  }, [acquisitionDetails]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const method = formData.get('purchase_method') as string;

    const detailsData = {
      car_id: car.id,
      purchase_method: method,
      notes: formData.get('notes') as string || null
    };

    // Only include purchase_price for cash purchases
    if (method === 'cash') {
      Object.assign(detailsData, {
        purchase_price: parseFloat(formData.get('purchase_price') as string)
      });
    }

    // Add method-specific fields based on purchase method
    if (method === 'loan' || method === 'sambung_bayar') {
      Object.assign(detailsData, {
        monthly_installment: formData.get('monthly_installment') ? parseFloat(formData.get('monthly_installment') as string) : null,
        monthly_due_day: formData.get('monthly_due_day') ? parseInt(formData.get('monthly_due_day') as string) : null,
        bank_name: formData.get('bank_name') as string || null,
        bank_account: formData.get('bank_account') as string || null,
        // Optional fields
        initial_payment: formData.get('initial_payment') ? parseFloat(formData.get('initial_payment') as string) : null,
        loan_start_date: formData.get('loan_start_date') as string || null,
        loan_duration_months: formData.get('loan_duration_months') ? parseInt(formData.get('loan_duration_months') as string) : null,
      });
    } else if (method === 'rental') {
      const companyName = formData.get('company_name') as string;
      const companyContact = formData.get('company_contact') as string;
      const companyAddress = formData.get('company_address') as string;
      
      Object.assign(detailsData, {
        rental_rate_daily: formData.get('rental_rate_daily') ? parseFloat(formData.get('rental_rate_daily') as string) : null,
        rental_rate_monthly: formData.get('rental_rate_monthly') ? parseFloat(formData.get('rental_rate_monthly') as string) : null,
        rental_duration: formData.get('rental_duration') ? parseInt(formData.get('rental_duration') as string) : null,
        loan_start_date: formData.get('rental_start_date') as string || null,
        company_info: companyName || companyContact || companyAddress ? {
          name: companyName || null,
          contact: companyContact || null,
          address: companyAddress || null
        } : null
      });
    }

    try {
      setLoading(true);
      if (acquisitionDetails) {
        const { error } = await supabase
          .from('acquisition_details')
          .update(detailsData)
          .eq('id', acquisitionDetails.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('acquisition_details')
          .insert(detailsData);
        if (error) throw error;
      }

      toast.success('Acquisition details saved successfully');
      setShowEditForm(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving acquisition details:', error);
      toast.error('Failed to save acquisition details');
    } finally {
      setLoading(false);
    }
  };

  const calculateROI = () => {
    if (!acquisitionDetails) return 0;

    const totalInvestment = acquisitionDetails.purchase_price + (acquisitionDetails.initial_payment || 0);
    const totalRevenue = (acquisitionDetails.selling_price || 0);

    if (totalInvestment === 0) return 0;
    return ((totalRevenue - totalInvestment) / totalInvestment) * 100;
  };

  const getUpcomingPayments = () => {
    const today = new Date();
    const fourteenDaysFromNow = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));

    return paymentReminders.filter(reminder => {
      const dueDate = new Date(reminder.due_date);
      return dueDate <= fourteenDaysFromNow && reminder.status === 'pending';
    });
  };

  const renderMethodSpecificFields = () => {
    switch (selectedPurchaseMethod) {
      case 'cash':
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Purchase Price (RM) *</label>
              <input
                type="number"
                step="0.01"
                name="purchase_price"
                defaultValue={acquisitionDetails?.purchase_price || ''}
                required
                placeholder="Total purchase amount"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </motion.div>
        );

      case 'loan':
      case 'sambung_bayar':
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Required Fields */}
            <div className="space-y-4">
              <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Required Information
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Monthly Payment Amount (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="monthly_installment"
                    defaultValue={acquisitionDetails?.monthly_installment || ''}
                    placeholder="Monthly payment amount"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Monthly Due Date *</label>
                  <select
                    name="monthly_due_day"
                    defaultValue={acquisitionDetails?.monthly_due_day || ''}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select day of month</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Day of the month when payment is due</p>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Bank Name *</label>
                  <input
                    type="text"
                    name="bank_name"
                    defaultValue={acquisitionDetails?.bank_name || ''}
                    placeholder="e.g., Maybank, CIMB, Public Bank"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Account Number *</label>
                  <input
                    type="text"
                    name="bank_account"
                    defaultValue={acquisitionDetails?.bank_account || ''}
                    placeholder="Bank account number"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <span className="text-lg font-semibold">Optional Information</span>
                {showOptionalFields ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              
              {showOptionalFields && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200"
                >
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Initial Payment (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="initial_payment"
                      defaultValue={acquisitionDetails?.initial_payment || ''}
                      placeholder="Down payment amount"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      {selectedPurchaseMethod === 'loan' ? 'Loan Start Date' : 'Payment Start Date'}
                    </label>
                    <input
                      type="date"
                      name="loan_start_date"
                      defaultValue={acquisitionDetails?.loan_start_date || ''}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      {selectedPurchaseMethod === 'loan' ? 'Loan Duration (Months)' : 'Payment Duration (Months)'}
                    </label>
                    <input
                      type="number"
                      name="loan_duration_months"
                      defaultValue={acquisitionDetails?.loan_duration_months || ''}
                      placeholder={selectedPurchaseMethod === 'loan' ? 'e.g., 60, 84, 108' : 'Number of installments'}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        );

      case 'rental':
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Company Information */}
            <div className="space-y-4">
              <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Company Information
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Company Name *</label>
                  <input
                    type="text"
                    name="company_name"
                    defaultValue={acquisitionDetails?.company_info?.name || ''}
                    placeholder="Rental company name"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Company Contact</label>
                  <input
                    type="text"
                    name="company_contact"
                    defaultValue={acquisitionDetails?.company_info?.contact || ''}
                    placeholder="Phone number or email"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-2">Company Address</label>
                  <textarea
                    name="company_address"
                    rows={2}
                    defaultValue={acquisitionDetails?.company_info?.address || ''}
                    placeholder="Company address"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Rental Terms */}
            <div className="space-y-4">
              <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Rental Terms
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Daily Rental Rate (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="rental_rate_daily"
                    defaultValue={acquisitionDetails?.rental_rate_daily || ''}
                    placeholder="Daily rental cost"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Monthly Rental Rate (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="rental_rate_monthly"
                    defaultValue={acquisitionDetails?.rental_rate_monthly || ''}
                    placeholder="Monthly rental cost"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Rental Start Date</label>
                  <input
                    type="date"
                    name="rental_start_date"
                    defaultValue={acquisitionDetails?.loan_start_date || ''}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Rental Duration (Months)</label>
                  <input
                    type="number"
                    name="rental_duration"
                    defaultValue={acquisitionDetails?.rental_duration || ''}
                    placeholder="Rental period in months"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const getMethodDisplayName = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash Purchase';
      case 'loan': return 'Bank Loan';
      case 'sambung_bayar': return 'Sambung Bayar';
      case 'rental': return 'Rental Agreement';
      default: return method;
    }
  };

  const formatDueDate = (day: number) => {
    if (!day) return 'Not set';

    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th';

    return `${day}${suffix} of each month`;
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
            <h2 className="modal-title">Acquisition Details</h2>
            <p className="modal-text">{car.brand} {car.make} - {car.spec}</p>
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

        <div className="modal-body">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 modal-text">Loading...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Payment Alerts */}
              {getUpcomingPayments().length > 0 && (
                <div className="modal-card border-l-4 border-yellow-500 bg-yellow-50">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                      <h3 className="modal-subtitle text-yellow-800">Upcoming Payments</h3>
                    </div>
                    <div className="space-y-2">
                      {getUpcomingPayments().map(payment => (
                        <div key={payment.id} className="flex justify-between items-center modal-text">
                          <span className="text-yellow-700 modal-text">
                            Due: {new Date(payment.due_date).toLocaleDateString()}
                          </span>
                          <span className="text-yellow-800 font-medium modal-text">RM {payment.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Acquisition Summary */}
              {acquisitionDetails && (
                <div className="modal-grid mb-4">
                  {/* Only show purchase price for cash purchases */}
                  {acquisitionDetails.purchase_method === 'cash' && (
                    <div className="modal-card">
                      <div className="text-center">
                        <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-lg sm:text-xl font-bold text-gray-900">
                          RM {acquisitionDetails.purchase_price?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="modal-text">Purchase Price</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="modal-card">
                    <div className="text-center">
                      <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-lg sm:text-xl font-bold text-gray-900 capitalize">
                        {getMethodDisplayName(acquisitionDetails.purchase_method)}
                      </div>
                      <div className="modal-text">Method</div>
                    </div>
                  </div>
                  
                  <div className="modal-card">
                    <div className="text-center">
                      <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-lg sm:text-xl font-bold text-gray-900">
                        {acquisitionDetails.monthly_installment ? `RM ${acquisitionDetails.monthly_installment}` : 
                         acquisitionDetails.rental_rate_monthly ? `RM ${acquisitionDetails.rental_rate_monthly}` : 'N/A'}
                      </div>
                      <div className="modal-text">
                        {acquisitionDetails.purchase_method === 'rental' ? 'Monthly Rate' : 'Monthly Payment'}
                      </div>
                    </div>
                  </div>
                  
                  {acquisitionDetails.purchase_method === 'cash' && (
                    <div className="modal-card">
                      <div className="text-center">
                        <Building className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <div className="text-lg sm:text-xl font-bold text-gray-900">
                          {calculateROI().toFixed(1)}%
                        </div>
                        <div className="modal-text">ROI</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit/Add Details Button */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="modal-subtitle">Details</h3>
                <Button
                  onClick={() => setShowEditForm(true)}
                  className="flex items-center space-x-2"
                  disabled={loading}
                >
                  <FileText className="w-4 h-4" />
                  <span>{acquisitionDetails ? 'Edit Details' : 'Add Details'}</span>
                </Button>
              </div>

              {/* Edit Form */}
              {showEditForm && (
                <div className="modal-card mb-4">
                  <div>
                    <form onSubmit={handleSaveDetails} className="space-y-4">
                      <h4 className="modal-subtitle">
                        {acquisitionDetails ? 'Edit' : 'Add'} Acquisition Details
                      </h4>
                      
                      <div>
                        <label className="modal-form-label">Purchase Method</label>
                        <select
                          name="purchase_method"
                          value={selectedPurchaseMethod}
                          onChange={(e) => setSelectedPurchaseMethod(e.target.value)}
                          required
                          className="modal-form-input"
                        >
                          <option value="cash">Cash Purchase</option>
                          <option value="loan">Bank Loan</option>
                          <option value="sambung_bayar">Sambung Bayar</option>
                          <option value="rental">Rental Agreement</option>
                        </select>
                      </div>

                      {/* Method-specific fields */}
                      {renderMethodSpecificFields()}
                      
                      <div>
                        <label className="modal-form-label">Notes</label>
                        <textarea
                          name="notes"
                          rows={3}
                          defaultValue={acquisitionDetails?.notes || ''}
                          placeholder="Additional notes about the acquisition..."
                          className="modal-form-input"
                        />
                      </div>

                      <div className="modal-button-group">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowEditForm(false)}
                          disabled={loading}
                          className="modal-action-button"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="modal-action-button">
                          {loading ? 'Saving...' : 'Save Details'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Current Details Display */}
              {acquisitionDetails && !showEditForm && (
                <div className="modal-card">
                  <div className="space-y-3">
                    <div className="modal-grid">
                      <div>
                        <h5 className="modal-text text-gray-600 font-medium">Purchase Method</h5>
                        <p className="modal-text text-gray-900">{getMethodDisplayName(acquisitionDetails.purchase_method)}</p>
                      </div>
                      
                      {/* Only show purchase price for cash purchases */}
                      {acquisitionDetails.purchase_method === 'cash' && acquisitionDetails.purchase_price && (
                        <div>
                          <h5 className="modal-text text-gray-600 font-medium">Purchase Price</h5>
                          <p className="modal-text text-gray-900">RM {acquisitionDetails.purchase_price.toLocaleString()}</p>
                        </div>
                      )}
                      
                      {/* Method-specific display fields */}
                      {(acquisitionDetails.purchase_method === 'loan' || acquisitionDetails.purchase_method === 'sambung_bayar') && (
                        <>
                          {acquisitionDetails.monthly_installment && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Monthly Payment</h5>
                              <p className="modal-text text-gray-900">RM {acquisitionDetails.monthly_installment.toLocaleString()}</p>
                            </div>
                          )}
                          {acquisitionDetails.monthly_due_day && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Payment Due Date</h5>
                              <p className="modal-text text-gray-900">{formatDueDate(acquisitionDetails.monthly_due_day)}</p>
                            </div>
                          )}
                          {acquisitionDetails.bank_name && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Bank</h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.bank_name}</p>
                            </div>
                          )}
                          {acquisitionDetails.bank_account && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Account Number</h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.bank_account}</p>
                            </div>
                          )}
                          
                          {/* Optional fields display */}
                          {acquisitionDetails.initial_payment && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Initial Payment</h5>
                              <p className="modal-text text-gray-900">RM {acquisitionDetails.initial_payment.toLocaleString()}</p>
                            </div>
                          )}
                          {acquisitionDetails.loan_start_date && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">
                                {acquisitionDetails.purchase_method === 'loan' ? 'Loan Start Date' : 'Payment Start Date'}
                              </h5>
                              <p className="modal-text text-gray-900">{new Date(acquisitionDetails.loan_start_date).toLocaleDateString()}</p>
                            </div>
                          )}
                          {acquisitionDetails.loan_duration_months && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">
                                {acquisitionDetails.purchase_method === 'loan' ? 'Loan Duration' : 'Payment Duration'}
                              </h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.loan_duration_months} months</p>
                            </div>
                          )}
                        </>
                      )}

                      {acquisitionDetails.purchase_method === 'rental' && (
                        <>
                          {/* Company Information */}
                          {acquisitionDetails.company_info?.name && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Company Name</h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.company_info.name}</p>
                            </div>
                          )}
                          {acquisitionDetails.company_info?.contact && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Company Contact</h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.company_info.contact}</p>
                            </div>
                          )}
                          {acquisitionDetails.company_info?.address && (
                            <div className="sm:col-span-2">
                              <h5 className="modal-text text-gray-600 font-medium">Company Address</h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.company_info.address}</p>
                            </div>
                          )}
                          
                          {/* Rental Terms */}
                          {acquisitionDetails.rental_rate_daily && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Daily Rental Rate</h5>
                              <p className="modal-text text-gray-900">RM {acquisitionDetails.rental_rate_daily.toLocaleString()}</p>
                            </div>
                          )}
                          {acquisitionDetails.rental_rate_monthly && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Monthly Rental Rate</h5>
                              <p className="modal-text text-gray-900">RM {acquisitionDetails.rental_rate_monthly.toLocaleString()}</p>
                            </div>
                          )}
                          {acquisitionDetails.loan_start_date && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Rental Start Date</h5>
                              <p className="modal-text text-gray-900">{new Date(acquisitionDetails.loan_start_date).toLocaleDateString()}</p>
                            </div>
                          )}
                          {acquisitionDetails.rental_duration && (
                            <div>
                              <h5 className="modal-text text-gray-600 font-medium">Rental Duration</h5>
                              <p className="modal-text text-gray-900">{acquisitionDetails.rental_duration} months</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {acquisitionDetails.notes && (
                      <div>
                        <h5 className="modal-text text-gray-600 font-medium">Notes</h5>
                        <p className="modal-text text-gray-900">{acquisitionDetails.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!acquisitionDetails && !showEditForm && (
                <div className="modal-card text-center py-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="modal-subtitle mb-2">No Acquisition Details</h3>
                  <p className="modal-text">Add acquisition details to track this vehicle's financial information.</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AcquisitionDetailsModal;