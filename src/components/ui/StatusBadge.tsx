import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'booking' | 'payment' | 'user' | 'completion' | 'approval';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'booking' }) => {
  const getStatusConfig = () => {
    if (type === 'completion') {
      switch (status) {
        case 'completed':
          return { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Completed' };
        case 'failed':
          return { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Failed' };
        case 'cancelled':
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: '⊘ Cancelled' };
        case 'expired':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏰ Expired' };
        default:
          return { bg: 'bg-blue-100', text: 'text-blue-800', label: '⏳ Pending' };
      }
    }

    if (type === 'approval') {
      switch (status) {
        case 'approved':
          return { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Approved' };
        case 'rejected':
          return { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Rejected' };
        default:
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ Pending' };
      }
    }

    if (type === 'payment') {
      switch (status) {
        case 'pending':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' };
        case 'payment_completed':
          return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Payment Completed' };
        case 'payment_received':
          return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Payment Received' };
        case 'approved':
        case 'paid':
          return { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' };
        case 'completed':
          return { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' };
        case 'cancelled':
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' };
        case 'refunded':
          return { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Refunded' };
        case 'rejected':
          return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
      }
    }

    if (type === 'booking') {
      switch (status) {
        case 'pending_approval':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Approval' };
        case 'approved':
          return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' };
        case 'ongoing':
          return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Ongoing' };
        case 'completed':
          return { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' };
        case 'cancel_pending':
          return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Cancel Pending' };
        case 'cancelled':
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
      }
    }

    if (type === 'user') {
      switch (status) {
        case 'pending':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' };
        case 'extended':
          return { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Extended' };
        case 'approved':
          return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' };
        case 'rejected':
          return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
      }
    }

    // Default fallback
    return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  const { bg, text, label } = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

export default StatusBadge;