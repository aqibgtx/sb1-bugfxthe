import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Car, User, Calendar, CreditCard, RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import StatusBadge from '../../ui/StatusBadge';
import Button from '../../ui/Button';

interface HistoryItem {
  type: string;
  id: string;
  title: string;
  customer?: string;
  staff?: string;
  amount: string;
  date: string;
  status: string;
  action?: string;
  // Additional details for enhanced view
  booking_number?: string;
  car_brand?: string;
  car_make?: string;
  car_plate?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  payment_method?: string;
  customer_email?: string;
  customer_phone?: string;
  staff_email?: string;
  delivery_type?: string;
  notes?: string;
}

interface ApprovalHistoryTableProps {
  history: HistoryItem[];
  loading?: boolean;
  pagination?: React.ReactNode;
  onRefund?: (item: HistoryItem) => void;
}

interface DetailModalProps {
  item: HistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ item, isOpen, onClose }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {item.type === 'booking' ? 'Booking Details' : 'Payment Details'}
            </h2>
            <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ×
            </Button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {item.type === 'booking' ? 'Booking Number' : 'Payment ID'}
                </label>
                <p className="text-gray-900">{item.booking_number || item.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex items-center">
                  {item.status === 'cancelled' || item.action === 'cancelled' ? (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                      Cancelled
                    </span>
                  ) : item.status === 'rejected' || item.action === 'rejected' ? (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                      Rejected
                    </span>
                  ) : (
                    <StatusBadge status="approved" />
                  )}
                </div>
              </div>
            </div>

            {/* Car Information */}
            {(item.car_brand || item.car_make || item.car_plate) && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Car Model</label>
                    <p className="text-gray-900">{item.car_brand} {item.car_make}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                    <p className="text-gray-900">{item.car_plate || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                    <p className="text-gray-900 capitalize">{item.delivery_type?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <p className="text-gray-900">{item.customer || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{item.customer_email || 'N/A'}</p>
                </div>
                {item.customer_phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{item.customer_phone}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handled by Staff</label>
                  <p className="text-gray-900">{item.staff || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Booking Dates */}
            {(item.start_date || item.end_date) && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Rental Period
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <p className="text-gray-900">{item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <p className="text-gray-900">{item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Days</label>
                    <p className="text-gray-900">{item.total_days || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Information */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Financial Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className="text-gray-900 font-semibold text-lg">RM {item.amount}</p>
                </div>
                {item.payment_method && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <p className="text-gray-900">{item.payment_method}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {item.status === 'cancelled' ? 'Cancelled Date' : 'Approved Date'}
                  </label>
                  <p className="text-gray-900">{new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{item.notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ApprovalHistoryTable: React.FC<ApprovalHistoryTableProps> = ({ history, loading, pagination, onRefund }) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewDetails = (item: HistoryItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 rounded-lg">
        <div className="mobile-card">
          <div className="h-6 bg-gray-200 rounded mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200 rounded-lg">
        {/* Mobile Layout */}
        <div className="md:hidden mobile-card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Approval History</h3>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item, index) => (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.type === 'booking' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type === 'booking' ? 'Booking' : 'Payment'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {item.status === 'cancelled' || item.action === 'cancelled' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          Cancelled
                        </span>
                      ) : item.status === 'rejected' || item.action === 'rejected' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          Rejected
                        </span>
                      ) : item.status === 'rejected' || item.action === 'rejected' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          Rejected
                        </span>
                      ) : (
                        <StatusBadge status="approved" />
                      )}
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{item.title}</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Customer: {item.customer || 'Unknown'}</p>
                    {item.car_brand && item.car_make && (
                      <p>Car: {item.car_brand} {item.car_make} ({item.car_plate})</p>
                    )}
                    <p>Amount: RM {item.amount}</p>
                    <p>Date: {new Date(item.date).toLocaleDateString()}</p>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(item)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    {onRefund && item.type === 'payment' && item.status === 'approved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRefund({ 
                          id: item.id, 
                          amount: item.amount,
                          booking: { 
                            id: item.id,
                            booking_number: item.booking_number,
                            customer: { name: item.customer }
                          },
                          admin_approval_status: 'approved'
                        })}
                        className="text-orange-600 hover:text-orange-800 text-xs ml-2"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refund
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">No approval history available</p>
            </div>
          )}
          {pagination}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Type</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Booking/Payment</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Vehicle</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Customer</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Staff</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Amount</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Date</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Status</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => (
                <motion.tr
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.type === 'booking' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.type === 'booking' ? 'Booking' : 'Payment'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <span className="text-gray-900 font-medium">{item.booking_number || item.title}</span>
                      {item.start_date && item.end_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                          {item.total_days && ` (${item.total_days} days)`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      {item.car_brand && item.car_make ? (
                        <>
                          <span className="text-gray-900">{item.car_brand} {item.car_make}</span>
                          {item.car_plate && (
                            <div className="text-xs text-gray-500 mt-1">{item.car_plate}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <span className="text-gray-900">{item.customer || 'Unknown'}</span>
                      {item.customer_email && (
                        <div className="text-xs text-gray-500 mt-1">{item.customer_email}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-900">{item.staff || 'Unknown'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-900 font-medium">RM {item.amount}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-700 text-sm">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {item.status === 'cancelled' || item.action === 'cancelled' ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        Cancelled
                      </span>
                    ) : item.status === 'rejected' || item.action === 'rejected' ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        Rejected
                      </span>
                    ) : item.status === 'rejected' || item.action === 'rejected' ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        Rejected
                      </span>
                    ) : (
                      <StatusBadge status="approved" />
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {onRefund && item.type === 'payment' && item.status === 'approved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRefund({ 
                          id: item.id, 
                          amount: item.amount,
                          booking: { 
                            id: item.id,
                            booking_number: item.booking_number,
                            customer: { name: item.customer }
                          },
                          admin_approval_status: 'approved'
                        })}
                        className="text-orange-600 hover:text-orange-800 ml-2"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refund
                      </Button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No approval history available</p>
            </div>
          )}
          {pagination}
        </div>
      </Card>

      {/* Detail Modal */}
      <DetailModal
        item={selectedItem}
        isOpen={showDetailModal}
        onClose={closeDetailModal}
      />
    </>
  );
};

export default ApprovalHistoryTable;