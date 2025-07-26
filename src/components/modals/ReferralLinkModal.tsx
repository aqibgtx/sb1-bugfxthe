import React from 'react';
import { Mail, Copy } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ReferralLinkModalProps {
  userId: string;
}

const ReferralLinkModal: React.FC<ReferralLinkModalProps> = ({ userId }) => {
  const generateReferralLink = () => {
    if (!userId) {
      toast.error('Unable to generate referral link');
      return;
    }
    
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/register?ref=${userId}`;
    
    navigator.clipboard.writeText(referralLink).then(() => {
      toast.success('Referral link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  return (
    <Card className="text-center py-8 md:py-12 px-6">
      <div className="w-12 md:w-16 h-12 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="w-6 md:w-8 h-6 md:h-8 text-blue-600" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Generate Referral Link</h3>
      <p className="text-gray-700 mb-6 md:mb-8">
        Create a personalized registration link for customers to complete their own registration
      </p>
      
      <div className="bg-gray-50 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <h4 className="text-gray-900 font-semibold mb-3">How it works:</h4>
        <div className="text-left space-y-2 text-gray-700 text-sm">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Generate a unique referral link tied to your staff account</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Share the link with customers via WhatsApp, email, or SMS</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Customers complete registration and upload documents</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Admin approves and activates the account</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Registration is automatically linked to your account</span>
          </div>
        </div>
      </div>

      <Button 
        onClick={generateReferralLink} 
        className="px-6 md:px-8 py-3 flex items-center space-x-2 min-h-[44px] w-full md:w-auto mx-auto"
      >
        <Copy className="w-4 h-4" />
        <span>Generate & Copy Referral Link</span>
      </Button>
    </Card>
  );
};

export default ReferralLinkModal;