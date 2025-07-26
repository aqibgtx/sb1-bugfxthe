import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

interface UserRejectionModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}

const UserRejectionModal: React.FC<UserRejectionModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  loading
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 lg:p-6 overflow-y-auto -webkit-overflow-scrolling-touch overscroll-behavior-contain">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white border border-gray-200 rounded-lg sm:rounded-xl w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          maxHeight: 'calc(100vh - 1.5rem)',
          maxHeight: 'calc(100dvh - 1.5rem)',
          minHeight: '20rem',
          height: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-5 lg:p-6 border-b border-gray-200 bg-red-50">
              <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-red-900 leading-tight">Reject User Registration</h3>
              <p className="text-sm sm:text-base text-red-700 mt-1">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 ml-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
              >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* User Info */}
            <div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-5">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">User Details</h4>
                <div className="space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <span className="text-xs sm:text-sm text-gray-600 block mb-1">Name:</span>
                      <span className="text-sm sm:text-base text-gray-900 font-medium break-words">{user.name}</span>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm text-gray-600 block mb-1">Email:</span>
                      <span className="text-sm sm:text-base text-gray-900 font-medium break-all">{user.email}</span>
                    </div>
                  </div>
                  {user.phone && (
                    <div>
                      <span className="text-xs sm:text-sm text-gray-600 block mb-1">Phone:</span>
                      <span className="text-sm sm:text-base text-gray-900 font-medium">{user.phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs sm:text-sm text-gray-600 block mb-1">Registration Date:</span>
                    <span className="text-sm sm:text-base text-gray-900 font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
                </div>

            {/* Rejection Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="reason" className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter the reason for rejecting this user registration..."
                  className="w-full px-3 py-3 sm:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm sm:text-base"
                  style={{ minHeight: '100px' }}
                  rows={4}
                  disabled={loading}
                />
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 lg:p-5">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800 min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium mb-2 sm:mb-3">Warning: This action will:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                      <li>Set the user's registration status to "rejected"</li>
                      <li>Deactivate the user account</li>
                      <li>Prevent the user from accessing the system</li>
                      <li>This action cannot be easily undone</li>
                    </ul>
                  </div>
                </div>
                  </div>
            </form>
              </div>
            </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-5 lg:p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={loading}
              className="w-full sm:flex-1 min-h-[44px] text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant="danger"
                  disabled={loading}
              className="w-full sm:flex-1 min-h-[44px] text-sm sm:text-base"
                >
                  {loading ? 'Rejecting...' : 'Reject User'}
                </Button>
            </div>
      </motion.div>
    </div>
  );
};

export default UserRejectionModal;