import React from 'react';
import { User } from 'lucide-react';
import Card from '../ui/Card';

interface StaffReferralBadgeProps {
  staffInfo: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  variant?: 'info' | 'success';
}

const StaffReferralBadge: React.FC<StaffReferralBadgeProps> = ({ 
  staffInfo, 
  variant = 'info' 
}) => {
  const bgColor = variant === 'success' ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500';
  const textColor = variant === 'success' ? 'text-green-900' : 'text-blue-900';
  const iconColor = variant === 'success' ? 'from-green-500 to-blue-600' : 'from-blue-500 to-purple-600';

  return (
    <Card glass className={`border-l-4 ${bgColor}`}>
      <div className="flex items-center space-x-4 p-4">
        <div className={`w-10 h-10 bg-gradient-to-r ${iconColor} rounded-full flex items-center justify-center`}>
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className={`${textColor} font-semibold`}>
            {variant === 'success' ? `Referred by: ${staffInfo.name}` : 'Referred by our staff member'}
          </h3>
          <p className={`${textColor.replace('900', '800')} text-sm`}>
            {variant === 'success' 
              ? 'Your registration will be linked to this staff member'
              : staffInfo.name
            }
          </p>
          {variant === 'info' && (
            <p className={`${textColor.replace('900', '700')} text-sm`}>{staffInfo.email}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StaffReferralBadge;