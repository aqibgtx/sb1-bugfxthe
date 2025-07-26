import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  User,
  Car,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  FileText,
  Hash
} from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';

interface DepositDeductionApprovalCardProps {
  request: any;
  index: number;
  onApprove: (requestId: string, adminNotes?: string) => void;
  onReject: (requestId: string, adminNotes: string) => void;
  onViewEvidence: (photos: string[]) => void;
}

const DepositDeductionApprovalCard: React.FC<DepositDeductionApprovalCardProps> = ({
  request,
  index,
  onApprove,
  onReject,
  onViewEvidence
}) => {
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const handleApprove = () => {
    onApprove(request.id, adminNotes.trim() || undefined);
    setShowApprovalForm(false);
    setAdminNotes('');
  };

  const handleReject = () => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(request.id, adminNotes.trim());
    setShowRejectionForm(false);
    setAdminNotes('');
  };

  const CarInfoDisplay = ({ car, booking }: { car: any; booking: any }) => {
    if (!car) return <span className="text-gray-500">No car info</span>;

    return (
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {car.brand} {car.make}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Hash className="w-3 h-3" />
              <span className="font-mono">{car.plate_number}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Booking #{booking.booking_number}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showApprovalForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="border-l-4 border-green-500 border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Approve Deposit Deduction</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-2">
                  <strong>Amount to Deduct:</strong> RM {request.requested_amount}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Reason:</strong> {request.reason}
                </p>
                {request.damage_description && (
                  <p className="text-gray-700">
                    <strong>Damage Description:</strong> {request.damage_description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any additional notes about this approval..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px]"
                >
                  Confirm Approval
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowApprovalForm(false);
                    setAdminNotes('');
                  }}
                  className="flex-1 min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (showRejectionForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="border-l-4 border-red-500 border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reject Deposit Deduction</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-2">
                  <strong>Requested Amount:</strong> RM {request.requested_amount}
                </p>
                <p className="text-gray-700">
                  <strong>Staff Reason:</strong> {request.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this deduction request is being rejected..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={3}
                  required
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleReject}
                  disabled={!adminNotes.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 min-h-[44px]"
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRejectionForm(false);
                    setAdminNotes('');
                  }}
                  className="flex-1 min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-l-4 border-orange-500 border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4">
                <CarInfoDisplay car={request.booking?.car} booking={request.booking} />
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <StatusBadge status="pending" type="warning" />
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                    DEPOSIT DEDUCTION REQUEST
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Requested by:</span>
                  <span className="font-medium">{request.requested_by_user?.name}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-red-600">RM {request.requested_amount}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Requested:</span>
                  <span className="font-medium">{new Date(request.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Current Deposit:</span>
                  <span className="font-medium">RM {request.booking?.deposit_amount || 0}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <span className="font-semibold text-orange-800">Deduction Request Details</span>
                  </div>
                  <div className="text-orange-700 text-sm space-y-1">
                    <p><strong>Reason:</strong> {request.reason}</p>
                    {request.damage_description && (
                      <p><strong>Damage Description:</strong> {request.damage_description}</p>
                    )}
                  </div>
                </div>

                {request.evidence_photos && request.evidence_photos.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold text-blue-800">Evidence Photos</span>
                        <span className="text-blue-600 text-sm">({request.evidence_photos.length} photos)</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewEvidence(request.evidence_photos)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Evidence</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:ml-6 flex flex-col space-y-3">
              <Button
                onClick={() => setShowApprovalForm(true)}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve Deduction</span>
              </Button>
              
              <Button
                onClick={() => setShowRejectionForm(true)}
                variant="danger"
                className="flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <X className="w-4 h-4" />
                <span>Reject Request</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default DepositDeductionApprovalCard;