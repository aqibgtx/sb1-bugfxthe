import React from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle,
  RotateCcw,
  DollarSign,
  Shield
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import { formatDuration } from '../../utils/calculateLateFee';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { getMalaysiaTime, toMalaysiaTime } from '../../lib/timezone';

interface ReturnBookingCardProps {
  booking: any;
  index: number;
  onReturn: (booking: any) => void;
  isClientView?: boolean; // New prop to determine terminology
}

const ReturnBookingCard: React.FC<ReturnBookingCardProps> = ({ 
  booking, 
  index, 
  onReturn,
  isClientView = false 
}) => {
  const [pendingDeductionRequests, setPendingDeductionRequests] = useState<any[]>([]);
  const [loadingDeductionRequests, setLoadingDeductionRequests] = useState(false);

  // Load pending deduction requests for this booking
  useEffect(() => {
    const loadPendingDeductionRequests = async () => {
      try {
        setLoadingDeductionRequests(true);
        const { data, error } = await supabase
          .from('deposit_deduction_requests')
          .select('id, status')
          .eq('booking_id', booking.id)
          .eq('status', 'pending');

        if (error) throw error;
        setPendingDeductionRequests(data || []);
      } catch (error) {
        console.error('Error loading deduction requests:', error);
        setPendingDeductionRequests([]);
      } finally {
        setLoadingDeductionRequests(false);
      }
    };

    loadPendingDeductionRequests();
  }, [booking.id]);

  // Calculate overdue based on handover_time + total_days
  // Updated to use the current end_date which accounts for extensions
  const calculateOverdueFromHandover = () => {
    if (!booking.handover_time || !booking.end_date) return { isOverdue: false, hoursOverdue: 0, severity: 'on_time' };
    
    const now = getMalaysiaTime();
    
    // Use the current end_date from booking (which includes any extensions)
    const endDate = new Date(booking.end_date + 'T23:59:59.999Z'); // End of day
    const expectedReturn = toMalaysiaTime(endDate);
    
    // Calculate hours difference
    const diffMs = now.getTime() - expectedReturn.getTime();
    const hoursOverdue = Math.max(0, diffMs / (1000 * 60 * 60));
    const isOverdue = hoursOverdue >= 1; // Mark as overdue if 1 hour or more
    
    let severity = 'on_time';
    if (isOverdue) {
      severity = hoursOverdue >= 48 ? 'critical' : 'warning';
    }
    
    return { 
      isOverdue, 
      hoursOverdue, 
      severity,
      expectedReturn 
    };
  };

  const overdueInfo = calculateOverdueFromHandover();
  const dailyRate = booking.rental_amount / booking.total_days;
  const lateFee = overdueInfo.isOverdue ? overdueInfo.hoursOverdue * dailyRate * 0.1 : 0;

  // Get appropriate terminology based on view type (staff vs client)
  const getTerminology = () => {
    if (isClientView) {
      return {
        handoverLabel: 'Picked up',
        expectedLabel: 'Expected drop-off',
        buttonText: 'Mark as Dropped Off',
        statusLabel: 'PICKED UP'
      };
    } else {
      return {
        handoverLabel: 'Handed over',
        expectedLabel: 'Expected return',
        buttonText: 'Mark as Returned',
        statusLabel: 'HANDED OVER'
      };
    }
  };

  const terminology = getTerminology();

  // Calculate deposit information
  const depositAmount = booking.deposit_amount || 0;
  const depositDeducted = booking.deposit_deducted || 0;
  const remainingDeposit = depositAmount - depositDeducted;
  
  // Check if return should be blocked due to pending deduction requests
  // Admin is never blocked by pending deduction requests
  const isReturnBlocked = pendingDeductionRequests.length > 0 && !isClientView;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`border-l-4 border border-gray-200 ${
        overdueInfo.isOverdue
          ? overdueInfo.severity === 'critical' 
            ? 'border-red-500 bg-red-50' 
            : 'border-yellow-500 bg-yellow-50'
          : 'border-green-500 bg-green-50'
      }`}>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <div className={`p-2 rounded-lg ${
                    overdueInfo.isOverdue
                      ? overdueInfo.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}>
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {booking.car?.brand} {booking.car?.make}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Plate: {booking.car?.plate_number}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {overdueInfo.isOverdue ? (
                    <>
                      <StatusBadge 
                        status={overdueInfo.severity} 
                        type={overdueInfo.severity === 'critical' ? 'error' : 'warning'} 
                      />
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        {formatDuration(overdueInfo.hoursOverdue)} OVERDUE
                      </span>
                    </>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      ON TIME
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {terminology.statusLabel}
                  </span>
                  {depositAmount > 0 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>DEPOSIT: RM{remainingDeposit}</span>
                    </span>
                  )}
                  {isReturnBlocked && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      RETURN BLOCKED
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{isClientView ? 'Your Name' : 'Customer'}:</span>
                  <span className="font-medium">{booking.customer?.name}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{terminology.handoverLabel}:</span>
                  <span className="font-medium">{toMalaysiaTime(booking.handover_time).toLocaleDateString('en-MY')}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{terminology.expectedLabel}:</span>
                  <span className={`font-medium ${overdueInfo.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                    {overdueInfo.expectedReturn?.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">RM {booking.total_amount}</span>
                </div>
                
                {depositAmount > 0 && (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-600">Deposit:</span>
                    <span className="font-medium text-purple-600">
                      RM {remainingDeposit} / {depositAmount}
                    </span>
                  </div>
                )}
              </div>

              {/* Pending Deduction Requests Warning */}
              {isReturnBlocked && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="font-semibold text-red-800">Return Blocked</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    This vehicle cannot be returned because there {pendingDeductionRequests.length === 1 ? 'is' : 'are'} {pendingDeductionRequests.length} pending deposit deduction request{pendingDeductionRequests.length > 1 ? 's' : ''} awaiting admin approval. 
                    Contact an admin to review and approve/reject the request{pendingDeductionRequests.length > 1 ? 's' : ''} before proceeding.
                  </p>
                </div>
              )}
              
              {/* Deposit Information */}
              {depositAmount > 0 && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-purple-800">Security Deposit</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-purple-600">Collected:</span>
                      <p className="font-medium text-purple-800">RM {depositAmount}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Deducted:</span>
                      <p className="font-medium text-red-600">RM {depositDeducted}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Remaining:</span>
                      <p className="font-medium text-green-600">RM {remainingDeposit}</p>
                    </div>
                  </div>
                  {booking.deposit_deduction_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <span className="text-red-600 font-medium">Deduction Reason:</span>
                      <p className="text-red-700">{booking.deposit_deduction_reason}</p>
                    </div>
                  )}
                </div>
              )}
              {overdueInfo.isOverdue && (
                <div className={`mt-4 p-3 rounded-lg border ${
                  overdueInfo.severity === 'critical' 
                    ? 'bg-red-100 border-red-200' 
                    : 'bg-yellow-100 border-yellow-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className={`w-5 h-5 ${
                      overdueInfo.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <span className={`font-semibold ${
                      overdueInfo.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {overdueInfo.severity === 'critical' ? 'CRITICAL OVERDUE' : 'OVERDUE WARNING'}
                    </span>
                  </div>
                  <div className={`text-sm ${
                    overdueInfo.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    <p>
                      Vehicle {terminology.handoverLabel.toLowerCase()} on {toMalaysiaTime(booking.handover_time).toLocaleDateString('en-MY')} and was due back on {overdueInfo.expectedReturn?.toLocaleDateString('en-MY')}. 
                      Now {formatDuration(overdueInfo.hoursOverdue)} overdue with potential late fee of RM{lateFee.toFixed(2)} 
                      (10% of RM{dailyRate.toFixed(2)} daily rate per hour).
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:ml-6">
              {isReturnBlocked ? (
                <div className="w-full lg:w-auto">
                  <Button
                    disabled
                    className="w-full lg:w-auto flex items-center space-x-2 bg-gray-400 cursor-not-allowed min-h-[44px]"
                    title="Return blocked due to pending deposit deduction requests"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Return Blocked</span>
                  </Button>
                  <p className="text-xs text-red-600 mt-1 text-center lg:text-left">
                    {loadingDeductionRequests ? 'Checking...' : 'Admin approval required'}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => onReturn(booking)}
                  className="w-full lg:w-auto flex items-center space-x-2 bg-green-600 hover:bg-green-700 min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{terminology.buttonText}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ReturnBookingCard;