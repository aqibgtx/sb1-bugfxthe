import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  CreditCard, 
  Users, 
  Calendar,
  Eye,
  Crown,
  Car,
  Hash,
  Zap
} from 'lucide-react';
import Card from '../../components/ui/Card';
import PaymentRefundModal from '../../components/modals/PaymentRefundModal';
import Button from '../../components/ui/Button';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AdminPayments: React.FC = () => {
  const { user } = useAuth();
  const { fetchPayments } = useSupabaseData();
  
  // State management
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundingPayment, setRefundingPayment] = useState<any>(null);

  // Fetch all payment data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: payments } = await fetchPayments();
      setPaymentsData(payments || []);

    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Failed to load payments');
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPayments]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    toast.success('Payments data refreshed');
  }, [fetchData]);

  // Process and organize payment data for business insights
  const businessInsights = useMemo(() => {
    const payments = paymentsData || [];
    
    // Basic counts and totals
    const totalPayments = payments.length;
    const pendingApproval = payments.filter(p => 
      p.admin_approval_status === 'pending' || 
      p.admin_approval_status === null ||
      (p.payment_completion_status === 'completed' && p.admin_approval_status !== 'approved')
    );
    const approvedPayments = payments.filter(p => p.admin_approval_status === 'approved');
    const rejectedPayments = payments.filter(p => p.admin_approval_status === 'rejected');
    const refundedPayments = payments.filter(p => p.admin_approval_status === 'refunded');
    
    // Financial totals
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pendingAmount = pendingApproval.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const refundedAmount = refundedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // Payment method breakdown
    const paymentMethods = payments.reduce((acc, p) => {
      const method = p.payment_method_code || 'Unknown';
      acc[method] = (acc[method] || 0) + parseFloat(p.amount || 0);
      return acc;
    }, {} as Record<string, number>);
    
    // Stripe vs Manual payments
    const stripePayments = payments.filter(p => p.payment_completion_status === 'completed');
    const manualPayments = payments.filter(p => p.payment_completion_status !== 'completed');
    const stripeRevenue = stripePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const manualRevenue = manualPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // VIP vs Regular bookings
    const vipPayments = payments.filter(p => p.is_agent_booking);
    const regularPayments = payments.filter(p => !p.is_agent_booking);
    const vipRevenue = vipPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const regularRevenue = regularPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPayments = payments.filter(p => new Date(p.created_at) >= sevenDaysAgo);
    const recentRevenue = recentPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    return {
      totalPayments,
      pendingApproval,
      approvedPayments,
      rejectedPayments,
      refundedPayments,
      totalRevenue,
      pendingAmount,
      refundedAmount,
      paymentMethods,
      stripePayments: stripePayments.length,
      manualPayments: manualPayments.length,
      stripeRevenue,
      manualRevenue,
      vipPayments: vipPayments.length,
      regularPayments: regularPayments.length,
      vipRevenue,
      regularRevenue,
      recentPayments: recentPayments.length,
      recentRevenue
    };
  }, [paymentsData]);

  const handleApprove = async (id: string) => {
    try {
      const payment = paymentsData.find(p => p.id === id);
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          admin_approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (paymentError) throw paymentError;

      if (payment.booking_id) {
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ 
            payment_status: 'approved',
            notes: 'Payment approved by admin'
          })
          .eq('id', payment.booking_id);

        if (bookingError) throw bookingError;
      }

      toast.success(payment.is_agent_booking ? 'VIP Payment approved!' : 'Payment approved!');
      await fetchData();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      const payment = paymentsData.find(p => p.id === id);
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      const confirmReject = confirm('Rejecting this payment will require the customer to resubmit. Continue?');
      if (!confirmReject) return;

      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          admin_approval_status: 'rejected',
          notes: reason || 'Rejected by admin'
        })
        .eq('id', id);

      if (paymentError) throw paymentError;

      if (payment.booking_id) {
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ 
            payment_status: 'rejected',
            notes: `Payment rejected by admin. Reason: ${reason || 'Payment rejected by admin'}`
          })
          .eq('id', payment.booking_id);

        if (bookingError) throw bookingError;
      }

      toast.success('Payment rejected');
      await fetchData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const handleRefund = (payment: any) => {
    setRefundingPayment(payment);
    setShowRefundModal(true);
  };

  const handleRefundComplete = async () => {
    setShowRefundModal(false);
    setRefundingPayment(null);
    await fetchData();
  };

  const formatCurrency = (amount: number) => `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const getPaymentStatusBadge = (payment: any) => {
    if (payment.admin_approval_status === 'approved') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">✓ Approved</span>;
    }
    if (payment.admin_approval_status === 'rejected') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">✗ Rejected</span>;
    }
    if (payment.admin_approval_status === 'refunded') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">↩ Refunded</span>;
    }
    if (payment.payment_completion_status === 'completed') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">💳 Stripe Paid</span>;
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">⏳ Pending</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Payments</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Payment Overview</h1>
          <p className="text-gray-700">Complete view of your rental business payments and revenue</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Business Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            {formatCurrency(businessInsights.totalRevenue)}
          </div>
          <div className="text-gray-700 text-sm">Total Revenue</div>
          <div className="text-green-500 text-xs mt-1">{businessInsights.approvedPayments.length} approved payments</div>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-3">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {formatCurrency(businessInsights.pendingAmount)}
          </div>
          <div className="text-gray-700 text-sm">Pending Approval</div>
          <div className="text-yellow-500 text-xs mt-1">{businessInsights.pendingApproval.length} payments waiting</div>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {formatCurrency(businessInsights.recentRevenue)}
          </div>
          <div className="text-gray-700 text-sm">Last 7 Days</div>
          <div className="text-blue-500 text-xs mt-1">{businessInsights.recentPayments} recent payments</div>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
            <Crown className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {formatCurrency(businessInsights.vipRevenue)}
          </div>
          <div className="text-gray-700 text-sm">VIP Revenue</div>
          <div className="text-purple-500 text-xs mt-1">{businessInsights.vipPayments} VIP bookings</div>
        </Card>
      </div>

      {/* Payment Method & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Channels
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Zap className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium">Stripe Payments</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatCurrency(businessInsights.stripeRevenue)}</div>
                <div className="text-xs text-gray-500">{businessInsights.stripePayments} payments</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Users className="w-4 h-4 text-blue-600 mr-2" />
                <span className="font-medium">Manual Payments</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">{formatCurrency(businessInsights.manualRevenue)}</div>
                <div className="text-xs text-gray-500">{businessInsights.manualPayments} payments</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Customer Types
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Crown className="w-4 h-4 text-purple-600 mr-2" />
                <span className="font-medium">VIP Bookings</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-600">{formatCurrency(businessInsights.vipRevenue)}</div>
                <div className="text-xs text-gray-500">{businessInsights.vipPayments} bookings</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Users className="w-4 h-4 text-gray-600 mr-2" />
                <span className="font-medium">Regular Customers</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-600">{formatCurrency(businessInsights.regularRevenue)}</div>
                <div className="text-xs text-gray-500">{businessInsights.regularPayments} bookings</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Payments Requiring Action */}
      {businessInsights.pendingApproval.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            Payments Requiring Your Approval ({businessInsights.pendingApproval.length})
          </h3>
          <div className="space-y-4">
            {businessInsights.pendingApproval.slice(0, 5).map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          Booking #{payment.booking?.booking_number || 'Unknown'}
                        </span>
                        {payment.is_agent_booking && (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-purple-500 text-white rounded-full text-xs font-bold">
                            <Crown className="w-3 h-3" />
                            <span>VIP</span>
                          </div>
                        )}
                      </div>
                      {getPaymentStatusBadge(payment)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>Customer: {payment.booking?.customer?.name || 'Unknown'}</div>
                      <div>Amount: <span className="font-bold text-green-600">RM {payment.amount}</span></div>
                      <div>Method: {payment.payment_method_code}</div>
                    </div>
                    {payment.payment_completion_status === 'completed' && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        ✅ Payment completed via Stripe - Ready for approval
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(payment.id)}
                      className="flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReject(payment.id)}
                      className="flex items-center space-x-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {businessInsights.pendingApproval.length > 5 && (
              <div className="text-center text-gray-500 text-sm">
                ... and {businessInsights.pendingApproval.length - 5} more payments pending approval
              </div>
            )}
          </div>
        </Card>
      )}

      {/* All Payments History */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          All Payments ({businessInsights.totalPayments})
        </h3>
        
        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {paymentsData.map((payment, index) => (
            <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">#{payment.booking?.booking_number || 'Unknown'}</span>
                  {payment.is_agent_booking && (
                    <div className="flex items-center space-x-1 px-1 py-0.5 bg-purple-500 text-white rounded text-xs font-bold">
                      <Crown className="w-2 h-2" />
                      <span>VIP</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">RM {payment.amount}</div>
                  <div className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Customer: {payment.booking?.customer?.name || 'Unknown'}</div>
                <div>Method: {payment.payment_method_code}</div>
                <div className="flex items-center space-x-2">
                  <span>Status:</span>
                  {getPaymentStatusBadge(payment)}
                </div>
              </div>
              {payment.admin_approval_status === 'approved' && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRefund(payment)}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refund
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Booking</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentsData.map((payment, index) => (
                <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">#{payment.booking?.booking_number || 'Unknown'}</span>
                      {payment.is_agent_booking && (
                        <div className="flex items-center space-x-1 px-1 py-0.5 bg-purple-500 text-white rounded text-xs font-bold">
                          <Crown className="w-2 h-2" />
                          <span>VIP</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">{payment.booking?.customer?.name || 'Unknown'}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-green-600">RM {payment.amount}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {payment.payment_method_code}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getPaymentStatusBadge(payment)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {payment.admin_approval_status === 'pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApprove(payment.id)}
                            className="px-2 py-1 text-xs"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(payment.id)}
                            className="px-2 py-1 text-xs"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {payment.admin_approval_status === 'approved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRefund(payment)}
                          className="px-2 py-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paymentsData.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Payments Yet</h3>
            <p className="text-gray-600">Payment submissions will appear here once customers start making payments.</p>
          </div>
        )}
      </Card>
      
      {/* Refund Modal */}
      <PaymentRefundModal
        payment={refundingPayment}
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setRefundingPayment(null);
        }}
        onRefundComplete={handleRefundComplete}
      />
    </motion.div>
  );
};

export default AdminPayments;