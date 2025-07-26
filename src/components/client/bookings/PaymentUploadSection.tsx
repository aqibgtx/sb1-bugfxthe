import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import FileUpload from '../../ui/FileUpload';

interface PaymentUploadSectionProps {
  bookingId: string;
  bookingNumber: string;
  totalAmount: number;
  onUploadComplete: (url: string, fileInfo: any) => void;
  onUploadError: (error: string) => void;
  onCancel: () => void;
}

const PaymentUploadSection: React.FC<PaymentUploadSectionProps> = ({
  bookingId,
  bookingNumber,
  totalAmount,
  onUploadComplete,
  onUploadError,
  onCancel
}) => {
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    size: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (url: string, fileInfo: { name: string; size: number; type: string }) => {
    setUploadedFile({
      url,
      name: fileInfo.name,
      size: fileInfo.size
    });
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      onUploadError('Please upload a payment receipt first');
      return;
    }

    setSubmitting(true);
    try {
      await onUploadComplete(uploadedFile.url, uploadedFile);
    } catch (error) {
      onUploadError('Failed to submit payment receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-gray-200 rounded-xl w-full max-w-sm sm:max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Payment Receipt
              </h3>
              <p className="text-sm text-gray-600">
                Booking #{bookingNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Amount Display */}
            <div className="modal-section">
              <div className="modal-card text-center">
                <p className="modal-text text-gray-600 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  RM {totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="modal-section">
              {!uploadedFile ? (
                <FileUpload
                  onUpload={handleFileUpload}
                  onError={onUploadError}
                  accept="image/*,.pdf"
                  maxSize={10}
                  folder="receipts"
                  fileName={`receipt_${bookingId}`}
                  className="w-full"
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="modal-card border-green-200 bg-green-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="modal-text font-medium text-green-900">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-green-700">
                          {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="modal-close-button text-green-600 hover:text-green-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Upload Instructions */}
            <div className="modal-section">
              <div className="modal-card bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="modal-text font-medium text-blue-800 mb-2">Upload Requirements:</p>
                    <ul className="space-y-1">
                      <li className="modal-text text-blue-700">• Clear photo or scan of payment receipt</li>
                      <li className="modal-text text-blue-700">• File size must be under 10MB</li>
                      <li className="modal-text text-blue-700">• Accepted formats: JPG, PNG, PDF</li>
                      <li className="modal-text text-blue-700">• Receipt must show transaction details</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="modal-action-button"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="modal-action-button"
            disabled={!uploadedFile || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Receipt'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentUploadSection;