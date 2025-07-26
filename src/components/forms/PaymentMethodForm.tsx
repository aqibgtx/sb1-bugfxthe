import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Banknote, Upload, AlertCircle, CheckCircle, X } from 'lucide-react';
import Card from '../ui/Card';
import { useCloudflareUpload } from '../../hooks/useCloudflareUpload';
import toast from 'react-hot-toast';

interface PaymentMethodFormProps {
  selectedCar: any;
  selectedCustomer: any;
  bookingDetails: any;
  selectedAddOns: any[];
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  receiptFile: File | null;
  onReceiptFileSelect: (file: File) => void;
  calculateTotal: () => number;
}

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  selectedCar,
  selectedCustomer,
  bookingDetails,
  selectedAddOns,
  paymentMethod,
  onPaymentMethodChange,
  receiptFile,
  onReceiptFileSelect,
  calculateTotal
}) => {
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, validateFile, formatFileSize, uploading } = useCloudflareUpload();

  const paymentMethods = [
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
      description: 'Upload receipt after payment (optional)',
      icon: Banknote,
      color: 'from-orange-500 to-orange-600',
      available: true
    }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Validate file using Cloudflare upload service
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        validateFile(file, { maxSize: 10, allowedTypes });
        setSelectedFile(file);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Invalid file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    try {
      // Generate a unique booking ID for the filename (or use existing booking ID if available)
      const bookingId = selectedCustomer?.id || 'temp_' + Date.now();
      
      // Upload to Cloudflare R2
      const result = await uploadFile(selectedFile, `receipt_${bookingId}`, {
        folder: 'receipts'
      });
      
      setUploadedUrl(result.publicUrl);
      onReceiptFileSelect(selectedFile);
      
      toast.success('Receipt uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(`Failed to upload receipt: ${errorMessage}`);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedUrl('');
    // Reset the file input
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSkipUpload = () => {
    // Allow staff to skip upload and proceed without receipt
    setSelectedFile(null);
    setUploadedUrl('');
    toast.info('Receipt upload skipped. You can upload it later if needed.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Payment Method</h2>
        <p className="text-gray-600">Select how you'd like to pay for your booking</p>
      </div>

      {/* Total Amount Display */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-gray-900">
            RM {calculateTotal().toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </Card>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = paymentMethod === method.id;
          
          return (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative cursor-pointer rounded-xl border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => method.available && onPaymentMethodChange(method.id)}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`
                    w-12 h-12 rounded-lg bg-gradient-to-r ${method.color} 
                    flex items-center justify-center flex-shrink-0
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {method.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {method.description}
                    </p>
                  </div>
                  
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                    >
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Cash Payment Upload Section */}
      {paymentMethod === 'cash' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <Card className="border-orange-200 bg-orange-50">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-orange-900 mb-1">
                    Cash Payment Instructions
                  </h4>
                  <div className="text-xs text-orange-800 space-y-1">
                    <p>1. Make payment to our authorized staff member</p>
                    <p>2. Obtain a receipt for your payment</p>
                    <p>3. Upload a clear photo of the receipt below (optional)</p>
                    <p>4. Your booking will be processed after verification</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-orange-900">
                    Upload Payment Receipt <span className="text-gray-500">(Optional)</span>
                  </label>
                  {!uploadedUrl && !selectedFile && (
                    <button
                      type="button"
                      onClick={handleSkipUpload}
                      className="text-xs text-orange-700 hover:text-orange-900 underline"
                    >
                      Skip Upload
                    </button>
                  )}
                </div>
                
                {!uploadedUrl && !selectedFile && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="receipt-upload"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="block border-2 border-dashed border-orange-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-orange-900 mb-1">
                        Click to upload receipt
                      </p>
                      <p className="text-xs text-orange-700">
                        JPG, PNG, PDF up to 10MB
                      </p>
                    </label>
                  </div>
                )}

                {selectedFile && !uploadedUrl && (
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Upload className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Uploading to R2...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Upload Receipt</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSkipUpload}
                        className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-50"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}

                {uploadedUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Receipt uploaded successfully!</p>
                        <p className="text-xs text-green-700">Your receipt has been saved and will be reviewed.</p>
                        <p className="text-xs text-gray-500 mt-1">Stored on Cloudflare R2</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Online Payment Info */}
      {paymentMethod && paymentMethod !== 'cash' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <CreditCard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Secure Online Payment
              </h4>
              <p className="text-xs text-blue-800">
                You'll be redirected to a secure payment page to complete your transaction. 
                Your booking will be confirmed automatically after successful payment.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PaymentMethodForm;