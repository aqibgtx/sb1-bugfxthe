import React from 'react';
import { CheckCircle } from 'lucide-react';
import Card from '../../ui/Card';

interface EmptyApprovalStateProps {
  title: string;
  message: string;
}

const EmptyApprovalState: React.FC<EmptyApprovalStateProps> = ({ title, message }) => {
  return (
    <Card className="text-center py-12 bg-white border border-gray-200 rounded-lg">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700">{message}</p>
    </Card>
  );
};

export default EmptyApprovalState;