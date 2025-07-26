import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CreditCard, Clock, AlertTriangle, X, Eye } from 'lucide-react';
import { usePaymentNotifications } from '../../hooks/usePaymentNotifications';

interface PaymentNotificationBadgeProps {
  className?: string;
}

const PaymentNotificationBadge: React.FC<PaymentNotificationBadgeProps> = ({ 
  className = '' 
}) => {
  const { pendingPayments, loading } = usePaymentNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading || pendingPayments.length === 0) {
    return null;
  }

  const urgentPayments = pendingPayments.filter(p => p.days_pending >= 3);
  const totalPending = pendingPayments.length;

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const handleViewPayments = () => {
    setShowNotifications(false);
    window.location.href = '/admin/payments';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon with Notification Badge */}
      <motion.button
        onClick={handleBellClick}
        className="relative p-3 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`${totalPending} pending payment approvals`}
      >
        <Bell className={`w-6 h-6 ${urgentPayments.length > 0 ? 'text-red-600' : 'text-blue-600'}`} />
        
        {/* Notification Count Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold text-white ${
            urgentPayments.length > 0 ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          {totalPending}
        </motion.div>

        {/* Pulsing animation for urgent payments */}
        {urgentPayments.length > 0 && (
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
        )}
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={handleCloseNotifications}
            />
            
            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-96 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Payment Approvals</h4>
                    <p className="text-sm text-gray-600">{totalPending} pending approval{totalPending !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseNotifications}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Urgent Payments Alert */}
              {urgentPayments.length > 0 && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-800 font-semibold">Urgent Attention Required</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    {urgentPayments.length} payment{urgentPayments.length !== 1 ? 's' : ''} pending for 3+ days
                  </p>
                </div>
              )}
              
              {/* Payment List */}
              <div className="max-h-80 overflow-y-auto">
                {pendingPayments.slice(0, 8).map((payment, index) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      payment.days_pending >= 3 ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm truncate">
                            #{payment.booking_number}
                          </span>
                          {payment.days_pending >= 3 && (
                            <div className="flex items-center space-x-1 text-red-600">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs font-semibold">{payment.days_pending}d</span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-700 text-xs truncate">{payment.customer_name}</p>
                        <p className="text-gray-600 text-xs">
                          Submitted: {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-semibold text-gray-900">RM {payment.amount}</p>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payment.days_pending >= 3 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.days_pending >= 3 ? 'URGENT' : 'PENDING'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {pendingPayments.length > 8 && (
                  <div className="p-3 text-center bg-gray-50">
                    <span className="text-gray-600 text-sm">
                      +{pendingPayments.length - 8} more pending...
                    </span>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleViewPayments}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium"
                >
                  <Eye className="w-4 h-4" />
                  <span>View All Payments</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentNotificationBadge;