import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Car, CreditCard, Clock } from 'lucide-react';
import Card from '../../ui/Card';
import StatusBadge from '../../ui/StatusBadge';
import { formatRelativeTime } from '../../../lib/utils';

interface Activity {
  id: string;
  type: 'booking' | 'payment' | 'document' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon?: React.ComponentType<any>;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading = false }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return Calendar;
      case 'payment':
        return CreditCard;
      case 'document':
        return Car;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'booking':
        return 'text-blue-600 bg-blue-100';
      case 'payment':
        return 'text-green-600 bg-green-100';
      case 'document':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm mobile-card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-lg shadow-sm mobile-card">
      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h4>
          <p className="text-gray-600 text-sm">Your activity will appear here once you start using the platform.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const ActivityIcon = activity.icon || getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className={`p-2 rounded-full ${colorClasses}`}>
                  <ActivityIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-gray-900 font-medium text-sm md:text-base truncate">
                      {activity.title}
                    </h4>
                    {activity.status && (
                      <StatusBadge status={activity.status as any} />
                    )}
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm mt-1">{activity.description}</p>
                  <p className="text-gray-500 text-xs mt-2">{formatRelativeTime(activity.timestamp)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ActivityFeed;