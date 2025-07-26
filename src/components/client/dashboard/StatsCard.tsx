import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';
import Card from '../../ui/Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  index: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card glass hover3d className="text-center">
        <div className="p-4">
          <div className="flex justify-center mb-3">
            <div className={`p-3 bg-gradient-to-r ${color} rounded-full`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
          <div className="text-gray-700 text-sm">{title}</div>
        </div>
      </Card>
    </motion.div>
  );
};

export default StatsCard;