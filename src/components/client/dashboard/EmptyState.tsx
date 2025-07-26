import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import Card from '../../ui/Card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message }) => {
  return (
    <Card glass className="text-center py-12">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700">{message}</p>
    </Card>
  );
};

export default EmptyState;