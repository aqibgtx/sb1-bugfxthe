import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';

interface DepositDisclaimerProps {
  requiresDeposit?: boolean;
}

const DepositDisclaimer: React.FC<DepositDisclaimerProps> = ({ 
  requiresDeposit = false 
}) => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {requiresDeposit ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          ) : (
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-amber-800 font-medium mb-1">Security Deposit</h4>
          <p className="text-amber-700 text-sm">
            {requiresDeposit 
              ? "A security deposit is required for this booking. Please confirm the amount with your agent."
              : "Security deposit may apply. Please confirm with agent."
            }
          </p>
          <p className="text-amber-600 text-xs mt-1">
            Deposit amount varies based on vehicle type and rental duration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DepositDisclaimer;