import React from 'react';
import { motion } from 'framer-motion';
import StatsCard from './StatsCard';

interface DashboardStatsProps {
  stats: Array<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
    change?: string;
  }>;
  loading?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-20 md:h-24"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <StatsCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          index={index}
        />
      ))}
    </div>
  );
};

export default DashboardStats;