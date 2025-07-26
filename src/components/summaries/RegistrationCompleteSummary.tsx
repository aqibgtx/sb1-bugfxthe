import React from 'react';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface RegistrationCompleteSummaryProps {
  credentials: {
    email: string;
    tempKey: string;
  };
  staffInfo?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  onRegisterAnother: () => void;
  onBackToDashboard: () => void;
}

const RegistrationCompleteSummary: React.FC<RegistrationCompleteSummaryProps> = ({
  credentials,
  staffInfo,
  onRegisterAnother,
  onBackToDashboard
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`);
    }).catch(() => {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    });
  };

  return (
    <Card className="text-center p-6 md:p-8">
      <div className="w-16 md:w-20 h-16 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 md:w-10 h-8 md:h-10 text-green-600" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Customer Registered Successfully!</h2>
      <p className="text-gray-700 mb-6">
        The customer account has been created with documents and is immediately active for use.
      </p>

      {/* Login Credentials */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 mb-6">
        <h3 className="text-blue-900 font-semibold mb-4">Login Credentials</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div className="text-left flex-1 min-w-0">
              <p className="text-gray-600 text-sm">Email</p>
              <p className="text-gray-900 font-medium truncate">{credentials.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(credentials.email, 'Email')}
              className="flex items-center space-x-1 ml-2 min-h-[44px] min-w-[44px]"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div className="text-left flex-1 min-w-0">
              <p className="text-gray-600 text-sm">Temporary Key</p>
              <p className="text-gray-900 font-medium font-mono">{credentials.tempKey}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(credentials.tempKey, 'Temporary key')}
              className="flex items-center space-x-1 ml-2 min-h-[44px] min-w-[44px]"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <h3 className="text-yellow-800 font-semibold">Important Notes</h3>
        </div>
        <div className="text-yellow-700 text-sm space-y-2 text-left">
          <p>• Customer account is <strong>immediately active</strong> and ready for use</p>
          <p>• Customer can login using the email and temporary key provided</p>
          <p>• <strong>Documents uploaded:</strong> Driving License and IC/Passport</p>
          <p>• Please share these credentials securely with the customer</p>
          <p>• Customer can start booking vehicles right away</p>
          <p>• This registration is linked to your staff account</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <Button onClick={onRegisterAnother} className="flex-1 min-h-[44px]">
          Register Another Customer
        </Button>
        <Button variant="ghost" onClick={onBackToDashboard} className="flex-1 min-h-[44px]">
          Back to Dashboard
        </Button>
      </div>
    </Card>
  );
};

export default RegistrationCompleteSummary;