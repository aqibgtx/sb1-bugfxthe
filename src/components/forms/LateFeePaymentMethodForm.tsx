import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Banknote, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  available: boolean;
}

interface LateFeePaymentMethodFormProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  lateFeeAmount: number;
  className?: string;
}

const LateFeePaymentMethodForm: React.FC<LateFeePaymentMethodFormProps> = ({
  selectedMethod,
  onMethodChange,
  lateFeeAmount,
  className = ''
}) => {
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'online_banking',
      name: 'Online Banking (FPX)',
      description: 'Pay securely through your bank',
      icon: CreditCard,
      color: 'from-blue-500 to-blue-600',
      available: true
    },
    {
      id: 'credit_debit_card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard accepted',
      icon: CreditCard,
      color: 'from-purple-500 to-purple-600',
      available: true
    },
    {
      id: 'qr_code',
      name: 'QR Code Payment',
      description: 'GrabPay, Touch \'n Go eWallet',
      icon: Smartphone,
      color: 'from-green-500 to-green-600',
      available: true
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      description: 'Pay with cash and upload receipt',
      icon: Banknote,
      color: 'from-orange-500 to-orange-600',
      available: true
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Payment Method for Late Fee</h3>
        <p className="text-gray-600">Choose how you'd like to pay the late fee</p>
      </div>

      {/* Late Fee Amount Display */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Late Fee Amount</p>
          <p className="text-2xl font-bold text-red-600">
            RM {lateFeeAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </Card>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative cursor-pointer rounded-xl border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => method.available && onMethodChange(method.id)}
            >
              <div className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`
                    w-12 h-12 rounded-lg bg-gradient-to-r ${method.color} 
                    flex items-center justify-center flex-shrink-0
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      {method.name}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {method.description}
                    </p>
                  </div>
                  
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Method Info */}
      {selectedMethod && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            {selectedMethod === 'cash' ? (
              <Banknote className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            ) : (
              <CreditCard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                {selectedMethod === 'cash' ? 'Cash Payment with Receipt Upload' : 'Secure Online Payment'}
              </h4>
              <p className="text-xs text-blue-800">
                {selectedMethod === 'cash' 
                  ? 'Customer will pay in cash and you can upload the payment receipt immediately for verification.'
                  : 'You\'ll be redirected to a secure payment page to complete your late fee payment. The payment will be processed immediately after successful transaction.'
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LateFeePaymentMethodForm;