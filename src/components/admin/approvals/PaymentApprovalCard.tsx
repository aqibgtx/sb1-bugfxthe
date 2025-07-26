import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, XCircle, User, Car, Calendar, DollarSign, AlertTriangle, Zap, Hash, Crown, Plus, Clock, RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';

interface PaymentApprovalCardProps {
  payment: any;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  showPaymentReceived?: boolean;
  onRefund?: (payment: any) => void;
}

const PaymentApprovalCard: React.FC<PaymentApprovalCardProps> = ({
  payment,
  index,
  onApprove,
  onReject,
  showPaymentReceived = false,
  onRefund
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPaymentCompletionBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">✅ STRIPE PAID</span>
          </div>
        );
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">✗ FAILED</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">⊘ CANCELLED</span>;
      case 'expired':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">⏰ EXPIRED</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">⏳ PENDING</span>;
    }
  };

  const getAdminApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">✓ APPROVED</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">✗ REJECTED</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">⏳ PENDING APPROVAL</span>;
    }
  };

  const CarInfoDisplay = ({ payment }: { payment: any }) => {
    const carName = payment.car_name || (payment.booking?.car ? `${payment.booking.car.brand} ${payment.booking.car.make}` : 'Unknown Vehicle');
    const plateNumber = payment.car_plate_number || payment.booking?.car?.plate_number || 'N/A';
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-blue-900 font-semibold text-sm">Vehicle Information</h4>
            <div className="flex flex-col space-y-1">
              <span className="text-blue-800 font-medium">
                {carName}
              </span>
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700 text-sm font-mono font-bold">
                  {plateNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ExtensionInfoDisplay = ({ extensions }: { extensions: any[] }) => {
    if (!extensions || extensions.length === 0) return null;

    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
        <div className="flex items-center space-x-3 mb-2">
          <Plus className="w-5 h-5 text-purple-600" />
          <h4 className="text-purple-900 font-semibold">
            {payment.payment_type === 'extension_only' ? 'Extension Payment' : `Pending Extensions (${extensions.length})`}
          </h4>
        </div>
        <div className="space-y-2">
          {extensions.map((ext, index) => (
            <div key={ext.id} className="text-purple-800 text-sm bg-purple-100 rounded p-2">
              <p>
                {payment.payment_type === 'extension_only' ? 'Extension Payment:' : `Extension ${index + 1}:`} {ext.extension_days} days - RM {ext.extension_amount}
              </p>
              <p className="text-xs text-purple-600">Due: {new Date(ext.payment_due_date).toLocaleDateString()}</p>
              {payment.payment_type === 'extension_only' && (
                <p className="text-xs text-purple-600">Original End: {new Date(ext.original_end_date).toLocaleDateString()}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Check if payment has been completed via Stripe
  const isPaymentCompleted = payment.payment_completion_status === 'completed';
  const isExtensionPayment = payment.payment_type === 'extension_only';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="mobile-card border-l-4 border-yellow-500 bg-white border border-gray-200 rounded-lg">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>
                    {isExtensionPayment ? 'Extension for ' : ''}Booking #{payment.booking?.booking_number || 'Unknown'}
                  </span>
                  {payment.has_pending_extensions && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold flex items-center space-x-1">
                      <Plus className="w-3 h-3" />
                      <span>{isExtensionPayment ? 'EXT PAYMENT' : `+${payment.extension_count} EXT`}</span>
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {getPaymentCompletionBadge(payment.payment_completion_status)}
                  {getAdminApprovalBadge(payment.admin_approval_status)}
                  {payment.is_agent_booking && (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold">
                      <Crown className="w-3 h-3" />
                      <span>VIP</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg md:text-xl font-bold text-green-600 flex flex-col">
                <span>RM {parseFloat(payment.amount).toFixed(2)}</span>
                {payment.has_pending_extensions && (
                  <div className="text-sm text-purple-600 font-medium">
                    {!isExtensionPayment && <span>+ RM {payment.extension_amount} ext</span>}
                    <div className="text-xs text-gray-500 font-normal">
                      {!isExtensionPayment && `Total: RM ${payment.total_amount_with_extensions.toFixed(2)}`}
                    </div>
                  </div>
                )}
                {payment.is_agent_booking && (
                  <span className="ml-2 px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">VIP</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{payment.payment_method_code}</div>
            </div>
          </div>

          {/* Extension Information */}
          <ExtensionInfoDisplay extensions={payment.extensions || []} />

          {/* VIP Agent Payment Notice */}
          {payment.is_agent_booking && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <h4 className="text-purple-900 font-semibold">VIP Agent Payment</h4>
              </div>
              <div className="text-purple-800 text-sm space-y-1">
                <p>✨ This payment is for a VIP booking created by staff/agent</p>
                {payment.custom_price_requested && (
                  <p>💰 Custom price requested: RM {payment.custom_price_requested}</p>
                )}
                {payment.agent_notes && (
                  <p>📝 Agent notes: {payment.agent_notes}</p>
                )}
                <p className="font-medium">🔥 Priority handling recommended for VIP payments</p>
              </div>
            </div>
          )}

          {/* Booking Cancellation Notice */}
          {payment.booking?.booking_status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h4 className="text-red-900 font-semibold">⚠️ Booking Cancelled</h4>
              </div>
              <div className="text-red-800 text-sm space-y-1">
                <p>🚫 This booking has been cancelled</p>
                <p>💡 Payment approval may not be necessary unless refund is required</p>
                <p className="font-medium">📋 Please verify cancellation status before approving payment</p>
              </div>
            </div>
          )}

          {/* Vehicle Information - Prominent Display */}
          <CarInfoDisplay payment={payment} />

          {/* Stripe Completion Notice - Only show if payment is actually completed */}
          {isPaymentCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="text-green-900 font-semibold">✅ Payment completed by user via Stripe!</h4>
              </div>
              <div className="text-green-800 text-sm space-y-1">
                <p>✅ Payment processed and confirmed by Stripe webhook</p>
                <p>📅 Completed: {formatDate(payment.stripe_webhook_received_at || payment.created_at)}</p>
                {payment.stripe_payment_intent_id && (
                  <p>🔗 Payment Intent: {payment.stripe_payment_intent_id}</p>
                )}
                <p className="font-medium mt-2">💡 Please verify in your bank account and approve manually</p>
                {payment.is_agent_booking && (
                  <p className="font-bold text-purple-700">👑 VIP Payment - Priority Processing Required</p>
                )}
              </div>
            </div>
          )}

          {/* Show notice for non-completed payments */}
          {!isPaymentCompleted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                <h4 className="text-blue-900 font-semibold">Payment Status: {payment.payment_completion_status || 'Pending'}</h4>
              </div>
              <div className="text-blue-800 text-sm">
                <p>This payment has not been completed via Stripe yet. You can still approve it manually if payment was received through other means.</p>
                {payment.is_agent_booking && (
                  <p className="font-bold text-purple-700 mt-1">👑 VIP Payment - Consider expedited processing</p>
                )}
              </div>
            </div>
          )}
          
          {/* Payment Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm md:text-base">
              <div className="space-y-1">
                <p><span className="text-gray-600">Customer:</span> <span className="text-gray-900 font-medium">{payment.booking?.customer?.name || 'Unknown'}</span></p>
                <p><span className="text-gray-600">Staff:</span> <span className="text-gray-900">{payment.booking?.staff?.name || 'Unknown'}</span></p>
                {payment.has_pending_extensions && !isExtensionPayment && (
                  <p><span className="text-gray-600">Extensions:</span> <span className="text-purple-700 font-medium">{payment.extension_count} pending</span></p>
                )}
              </div>
              <div className="space-y-1">
                <p><span className="text-gray-600">{isExtensionPayment ? 'Extension Amount:' : 'Base Amount:'}</span> <span className="text-gray-900 font-bold">RM {parseFloat(payment.amount).toFixed(2)}</span></p>
                {payment.has_pending_extensions && !isExtensionPayment && (
                  <p><span className="text-gray-600">Total with Ext:</span> <span className="text-purple-700 font-bold">RM {payment.total_amount_with_extensions.toFixed(2)}</span></p>
                )}
                <p><span className="text-gray-600">Method:</span> <span className="text-gray-900">{payment.payment_method_code}</span></p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            {payment.stripe_webhook_data && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => console.log('Webhook data:', payment.stripe_webhook_data)}
                className="mobile-button flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>View Webhook Data</span>
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => onApprove(payment.id)}
                className="flex-1 sm:flex-none mobile-button flex items-center justify-center space-x-2 min-h-[44px] relative"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {isExtensionPayment 
                    ? (payment.is_agent_booking ? 'Approve VIP Extension' : 'Approve Extension')
                    : (payment.is_agent_booking ? 'Approve VIP Payment' : 'Approve Payment')
                  }
                  {payment.has_pending_extensions && !isExtensionPayment && ' + Extensions'}
                </span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onReject(payment.id)}
                className="flex-1 sm:flex-none mobile-button flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{isExtensionPayment ? 'Reject Extension' : 'Reject Payment'}</span>
                <span className="sm:hidden">Reject</span>
              </Button>
              {onRefund && payment.admin_approval_status === 'approved' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRefund(payment)}
                  className="flex-1 sm:flex-none mobile-button flex items-center justify-center space-x-2 min-h-[44px] border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refund</span>
                  <span className="sm:hidden">Refund</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PaymentApprovalCard;