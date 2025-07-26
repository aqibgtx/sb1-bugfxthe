import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Car, CheckCircle, FileText } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ViewTermsModal from './ViewTermsModal';

interface TermsAndConditionsModalProps {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  onContinue: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  agreed,
  onAgreedChange,
  onContinue
}) => {
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleViewTerms = () => {
    setShowTermsModal(true);
  };

  const handleAcceptTerms = () => {
    onAgreedChange(true);
    setShowTermsModal(false);
  };

  return (
    <>
      <Card glass>
        <div className="text-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Car className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 mb-4"
          >
            Welcome to Budget Plus Rental
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-700 mb-8"
          >
            Before we begin your registration, please review and accept our terms and conditions.
          </motion.p>

          {/* Terms Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Terms & Conditions Summary</span>
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Must be at least 21 years old with valid driving license</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Vehicle must be returned in same condition as pickup</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Late return fees apply (10% of daily rate per hour)</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Full payment required before vehicle collection</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Renter liable for damages and traffic violations</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={handleViewTerms}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                View Full Terms & Conditions
              </Button>
            </div>
          </motion.div>

          {/* Agreement Checkbox */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center space-x-3 mb-8"
          >
            <input
              type="checkbox"
              id="terms-agreement"
              checked={agreed}
              onChange={(e) => onAgreedChange(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="terms-agreement" className="text-gray-700 cursor-pointer">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={handleViewTerms}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Terms & Conditions
              </button>
            </label>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={onContinue}
              disabled={!agreed}
              className="w-full px-8 py-3 text-lg"
            >
              Continue to Registration
            </Button>
          </motion.div>

          {!agreed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-gray-500 text-sm mt-4"
            >
              Please accept the terms and conditions to continue
            </motion.p>
          )}
        </div>
      </Card>

      {/* Terms Modal */}
      <ViewTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        showAcceptButton={!agreed}
      />
    </>
  );
};

export default TermsAndConditionsModal;