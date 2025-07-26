import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Eye, 
  CheckCircle, 
  XCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';

interface EnhancedUserApprovalCardProps {
  user: any;
  index: number;
  onApprove: (userId: string) => void;
  onReject: (user: any) => void;
  onViewDetails: (user: any) => void;
}

const EnhancedUserApprovalCard: React.FC<EnhancedUserApprovalCardProps> = ({
  user,
  index,
  onApprove,
  onReject,
  onViewDetails
}) => {
  const daysSinceRegistration = Math.floor(
    (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const getUrgencyLevel = () => {
    if (daysSinceRegistration >= 7) return 'high';
    if (daysSinceRegistration >= 3) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();

  const urgencyColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-blue-500 bg-blue-50'
  };

  const urgencyIcons = {
    high: AlertTriangle,
    medium: AlertTriangle,
    low: User
  };

  const UrgencyIcon = urgencyIcons[urgencyLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className={`border-l-4 ${urgencyColors[urgencyLevel]} hover:shadow-lg transition-all duration-200 bg-white border border-gray-200 rounded-lg`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${
                urgencyLevel === 'high' ? 'bg-red-100' :
                urgencyLevel === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                <UrgencyIcon className={`w-6 h-6 ${
                  urgencyLevel === 'high' ? 'text-red-600' :
                  urgencyLevel === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <StatusBadge status={user.registration_status} type="user" />
                  {user.referred_by && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      Referred
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Urgency Indicator */}
            <div className="text-right">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-blue-100 text-blue-800'
              }`}>
                {daysSinceRegistration === 0 ? 'Today' : 
                 daysSinceRegistration === 1 ? '1 day ago' : 
                 `${daysSinceRegistration} days ago`}
              </div>
              {urgencyLevel === 'high' && (
                <p className="text-xs text-red-600 mt-1 font-medium">Urgent Review</p>
              )}
            </div>
          </div>

          {/* User Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="text-sm text-gray-900 font-medium">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">Phone</p>
                  <p className="text-sm text-gray-900">{user.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">Registration Date</p>
                  <p className="text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {(user.address_city || user.address_state) && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-600">Location</p>
                    <p className="text-sm text-gray-900">
                      {[user.address_city, user.address_state].filter(Boolean).join(', ') || 'Not provided'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">IC Number</p>
                <p className="text-gray-900 font-mono">{user.ic_number || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-gray-600">Date of Birth</p>
                <p className="text-gray-900">
                  {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Gender</p>
                <p className="text-gray-900 capitalize">{user.gender || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Documents Status */}
          <div className="flex items-center justify-between mb-6 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                Documents uploaded - Click "View Details" to review
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => onViewDetails(user)}
              className="flex items-center justify-center space-x-2 flex-1 border border-blue-200 hover:bg-blue-50 min-h-[44px]"
            >
              <Eye className="w-4 h-4" />
              <span>View Full Details</span>
            </Button>
            
            <div className="flex gap-2 sm:flex-shrink-0">
              <Button
                variant="danger"
                size="sm"
                onClick={() => onReject(user)}
                className="flex items-center space-x-1 px-4 min-h-[44px]"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => onApprove(user.id)}
                className="flex items-center space-x-1 px-4 min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default EnhancedUserApprovalCard;