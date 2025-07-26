import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CreditCard, 
  Wrench, 
  FileText, 
  Calendar, 
  Ban,
  Clock,
  X,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SystemAlert {
  id: string;
  type: 'payment_pending' | 'service_due' | 'document_expiry' | 'booking_overdue' | 'cancellation_request' | 'overdue_returns';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  count?: number;
  data?: any;
  created_at: string;
}

interface SystemAlertsPanelProps {
  alerts: SystemAlert[];
  onNavigate?: (path: string) => void;
}

const SystemAlertsPanel: React.FC<SystemAlertsPanelProps> = ({ alerts, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 10;

  // Pagination
  const totalPages = Math.ceil(alerts.length / alertsPerPage);
  const startIndex = (currentPage - 1) * alertsPerPage;
  const paginatedAlerts = alerts.slice(startIndex, startIndex + alertsPerPage);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'payment_pending':
        return CreditCard;
      case 'service_due':
        return Wrench;
      case 'document_expiry':
        return FileText;
      case 'booking_overdue':
        return Calendar;
      case 'cancellation_request':
        return Ban;
      case 'overdue_returns':
        return RotateCcw;
      default:
        return AlertTriangle;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'info':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getTextColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getNavigationPath = (type: string) => {
    switch (type) {
      case 'payment_pending':
        return '/admin/payments';
      case 'service_due':
        return '/admin/cars';
      case 'document_expiry':
        return '/admin/cars';
      case 'booking_overdue':
        return '/admin/approvals';
      case 'cancellation_request':
        return '/admin/approvals';
      case 'overdue_returns':
        return '/staff/return-car';
      default:
        return '/admin/dashboard';
    }
  };

  const handleAlertClick = (alert: any) => {
    const path = getNavigationPath(alert.type);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleForceMarkReturned = async (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to force mark this booking as returned? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('bookings')
        .update({
          return_marked: true,
          actual_return_time: new Date().toISOString(),
          notes: 'Force marked as returned by admin due to overdue status'
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking marked as returned successfully');
      // Refresh would be handled by parent component
    } catch (error) {
      console.error('Error marking booking as returned:', error);
      toast.error('Failed to mark booking as returned');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-l-4 border-green-500 bg-green-50">
        <div className="flex items-center space-x-3 p-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-green-800 font-semibold">All Systems Normal</h3>
            <p className="text-green-700 text-sm">No alerts or issues requiring attention</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span>System Alerts</span>
          <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
            {alerts.length}
          </span>
        </h3>
      </div>

      <AnimatePresence>
        {paginatedAlerts.map((alert, index) => {
          const IconComponent = getAlertIcon(alert.type);
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`border-l-4 ${getAlertColor(alert.severity)} cursor-pointer hover:shadow-md transition-all duration-200`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.severity === 'error' ? 'bg-red-100' :
                      alert.severity === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        alert.severity === 'error' ? 'text-red-600' :
                        alert.severity === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`font-semibold ${getTextColor(alert.severity)} truncate`}>
                          {alert.title}
                        </h4>
                        {alert.count && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            alert.severity === 'error' ? 'bg-red-500 text-white' :
                            alert.severity === 'warning' ? 'bg-yellow-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            {alert.count}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${getTextColor(alert.severity)} opacity-90`}>
                        {alert.message}
                      </p>
                      
                      {/* Show specific details for payment alerts */}
                      {alert.type === 'payment_pending' && alert.data && (
                        <div className="mt-2 space-y-1">
                          {alert.data.slice(0, 3).map((payment: any) => (
                            <div key={payment.id} className="flex items-center justify-between text-xs">
                              <span className={`${getTextColor(alert.severity)} truncate`}>
                                #{payment.booking_number} - {payment.customer_name}
                              </span>
                              <div className="flex items-center space-x-2 ml-2">
                                <span className="font-medium">RM {payment.amount}</span>
                                {payment.days_pending >= 3 && (
                                  <span className="flex items-center space-x-1 text-red-600">
                                    <Clock className="w-3 h-3" />
                                    <span>{payment.days_pending}d</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {alert.data.length > 3 && (
                            <p className={`text-xs ${getTextColor(alert.severity)} opacity-75`}>
                              +{alert.data.length - 3} more...
                            </p>
                          )}
                        </div>
                      )}

                      {/* Show specific details for overdue returns */}
                      {alert.type === 'overdue_returns' && alert.data && (
                        <div className="mt-2 space-y-2">
                          {alert.data.slice(0, 3).map((overdueReturn: any) => (
                            <div key={overdueReturn.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs bg-red-100 p-2 rounded gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0" />
                                <span className="text-red-800 font-medium truncate">
                                  #{overdueReturn.booking_number} - {overdueReturn.customer_name}
                                </span>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end space-x-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs">
                                  <span className="text-red-700">
                                    Due: {new Date(overdueReturn.end_date).toLocaleDateString()}
                                  </span>
                                  <span className="text-red-600 font-bold">
                                    {overdueReturn.days_overdue}d overdue
                                  </span>
                                </div>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="px-2 py-1 text-xs min-h-[32px]"
                                  onClick={(e) => handleForceMarkReturned(overdueReturn.id, e)}
                                  disabled={loading}
                                >
                                  {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Force Return'}
                                </Button>
                              </div>
                            </div>
                          ))}
                          {alert.data.length > 3 && (
                            <p className={`text-xs ${getTextColor(alert.severity)} opacity-75`}>
                              +{alert.data.length - 3} more...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1 text-xs min-h-[36px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAlertClick(alert);
                      }}
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + alertsPerPage, alerts.length)} of {alerts.length} alerts
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="min-h-[36px]"
            >
              Previous
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-h-[36px] min-w-[36px]"
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="min-h-[36px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAlertsPanel;