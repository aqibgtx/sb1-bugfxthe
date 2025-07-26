import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, ArrowRight, CheckCircle } from 'lucide-react';
import Button from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface StaffForwardingModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onForward: (staffId: string, staffName: string) => void;
  loading?: boolean;
}

const StaffForwardingModal: React.FC<StaffForwardingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onForward,
  loading = false
}) => {
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableStaff();
    }
  }, [isOpen]);

  const loadAvailableStaff = async () => {
    try {
      setLoadingStaff(true);
      
      // Fetch all active staff members
      const { data: staff, error } = await supabase
        .from('users')
        .select('id, name, email, staff_type')
        .eq('role', 'staff')
        .eq('approved', true)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      setAvailableStaff(staff || []);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load available staff');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleForward = () => {
    if (!selectedStaffId) {
      toast.error('Please select a staff member');
      return;
    }

    const selectedStaff = availableStaff.find(staff => staff.id === selectedStaffId);
    if (!selectedStaff) {
      toast.error('Selected staff not found');
      return;
    }

    onForward(selectedStaffId, selectedStaff.name);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-content modal-md"
      >
        <div className="modal-header">
          <div className="flex items-center justify-between">
            <h2 className="modal-title flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Forward Customer Booking</span>
            </h2>
            <button 
              onClick={onClose} 
              className="modal-close-button text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Booking Info */}
          <div className="modal-section">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="modal-subtitle text-blue-900 mb-3">Customer Booking Details</h3>
              <div className="space-y-2">
                <p className="modal-text text-blue-800"><span className="font-medium">Booking:</span> #{booking.booking_number}</p>
                <p className="modal-text text-blue-800"><span className="font-medium">Customer:</span> {booking.customer?.name}</p>
                <p className="modal-text text-blue-800"><span className="font-medium">Vehicle:</span> {booking.car?.brand} {booking.car?.make}</p>
                <p className="modal-text text-blue-800"><span className="font-medium">Amount:</span> RM {booking.total_amount}</p>
              </div>
            </div>
          </div>

          {/* Notice */}
          <div className="modal-section">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="modal-subtitle text-yellow-800 mb-2">Customer Self-Booking Detected</h4>
                <p className="modal-text text-yellow-700">
                  This booking was created by the customer directly. Please select a staff member to handle the handover and return process.
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Staff Selection */}
          <div className="modal-section">
            <label className="block modal-text font-medium text-gray-700 mb-3">
              Select Staff Member to Handle This Booking
            </label>
            
            {loadingStaff ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableStaff.map((staff) => (
                  <label
                    key={staff.id}
                    className={`
                      flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedStaffId === staff.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="staff"
                      value={staff.id}
                      checked={selectedStaffId === staff.id}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="modal-text font-medium text-gray-900">{staff.name}</p>
                          <p className="text-sm text-gray-600">{staff.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {staff.staff_type?.replace('_', ' ') || 'Staff'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {selectedStaffId === staff.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600 ml-3" />
                    )}
                  </label>
                ))}
              </div>
            )}

            {!loadingStaff && availableStaff.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="modal-text text-gray-600">No active staff members available</p>
              </div>
            )}
          </div>
        </div>

          {/* Action Buttons */}
        <div className="modal-footer">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="modal-action-button flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={!selectedStaffId || loading || loadingStaff}
              className="modal-action-button flex-1 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Forward Booking</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffForwardingModal;