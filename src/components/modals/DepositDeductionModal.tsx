import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Shield,
  AlertTriangle,
  Upload,
  DollarSign,
  FileText,
  Camera,
  Trash2
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useCloudflareUpload } from '../../hooks/useCloudflareUpload';
import toast from 'react-hot-toast';

interface DepositDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSubmit: (deductionData: {
    requestedAmount: number;
    reason: string;
    damageDescription?: string;
    evidencePhotos: string[];
  }) => void;
  submitting: boolean;
}

const DepositDeductionModal: React.FC<DepositDeductionModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSubmit,
  submitting
}) => {
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [damageDescription, setDamageDescription] = useState<string>('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean>(false);
  
  const { uploadFile, validateFile } = useCloudflareUpload();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        validateFile(file, { maxSize: 5, allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'] });
        const result = await uploadFile(file, `deposit_evidence_${booking.id}_${Date.now()}`, {
          folder: 'deposit-evidence'
        });
        return result.publicUrl;
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      
      setEvidencePhotos(prev => [...prev, ...validUrls]);
      toast.success(`${validUrls.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setEvidencePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!requestedAmount || requestedAmount <= 0) {
      toast.error('Please enter a valid deduction amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the deduction');
      return;
    }

    if (requestedAmount > (booking.deposit_amount || 0)) {
      toast.error('Deduction amount cannot exceed the collected deposit');
      return;
    }

    onSubmit({
      requestedAmount,
      reason: reason.trim(),
      damageDescription: damageDescription.trim() || undefined,
      evidencePhotos
    });
  };

  const resetForm = () => {
    setRequestedAmount(0);
    setReason('');
    setDamageDescription('');
    setEvidencePhotos([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const availableDeposit = booking.deposit_amount || 0;
  const alreadyDeducted = booking.deposit_deducted || 0;
  const remainingDeposit = availableDeposit - alreadyDeducted;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Shield className="w-6 h-6 text-orange-500" />
              <span>Request Deposit Deduction</span>
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
            {/* Booking Info */}
            <Card className="bg-gray-50 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Booking:</span>
                  <p className="font-medium">#{booking.booking_number}</p>
                </div>
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <p className="font-medium">{booking.customer?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium">{booking.car?.brand} {booking.car?.make}</p>
                </div>
                <div>
                  <span className="text-gray-600">Plate Number:</span>
                  <p className="font-medium">{booking.car?.plate_number}</p>
                </div>
              </div>
            </Card>

            {/* Deposit Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <h4 className="text-blue-900 font-semibold mb-3 flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Deposit Summary</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Total Collected:</span>
                  <p className="font-bold text-blue-900">RM {availableDeposit.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-blue-600">Already Deducted:</span>
                  <p className="font-bold text-red-600">RM {alreadyDeducted.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-blue-600">Available for Deduction:</span>
                  <p className="font-bold text-green-600">RM {remainingDeposit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {remainingDeposit <= 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-red-800 font-semibold">No Deposit Available</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  There is no remaining deposit available for deduction.
                </p>
              </div>
            )}

            {/* Deduction Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deduction Amount (RM) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  min="0"
                  max={remainingDeposit}
                  step="0.01"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  placeholder="0.00"
                  disabled={remainingDeposit <= 0}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum deductible: RM {remainingDeposit.toLocaleString()}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            {remainingDeposit > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Amounts
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[50, 100, 200, remainingDeposit].filter(amount => amount <= remainingDeposit).map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={requestedAmount === amount ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setRequestedAmount(amount)}
                      className="min-h-[36px] text-xs"
                    >
                      RM{amount === remainingDeposit ? 'All' : amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Deduction <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this deduction is necessary (e.g., vehicle damage, cleaning fees, etc.)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={3}
                required
              />
            </div>

            {/* Damage Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Damage Description (Optional)
              </label>
              <textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="Provide detailed description of any damage or issues found..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={3}
              />
            </div>

            {/* Evidence Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence Photos (Optional)
              </label>
              
              <div className="space-y-4">
                {/* Upload Button */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="evidence-upload"
                    disabled={uploadingPhotos}
                  />
                  <label
                    htmlFor="evidence-upload"
                    className={`w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors ${
                      uploadingPhotos ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      {uploadingPhotos ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                      <p className="text-gray-600">
                        {uploadingPhotos ? 'Uploading photos...' : 'Click to upload evidence photos'}
                      </p>
                      <p className="text-gray-500 text-sm">JPG, PNG up to 5MB each</p>
                    </div>
                  </label>
                </div>

                {/* Uploaded Photos */}
                {evidencePhotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {evidencePhotos.map((photoUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photoUrl}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity min-h-[24px] min-w-[24px] flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-yellow-800">Important Notice</span>
              </div>
              <div className="text-yellow-700 text-sm space-y-1">
                <p>• This request will be sent to admin for approval</p>
                <p>• Provide clear evidence and detailed reasoning</p>
                <p>• Deductions are permanent once approved</p>
                <p>• Customer will be notified of any approved deductions</p>
              </div>
            </div>

            </div>
          </div>
          
          <div className="modal-footer">
            {/* Action Buttons */}
            <div className="modal-button-group">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={submitting}
                className="modal-action-button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!requestedAmount || !reason.trim() || submitting || remainingDeposit <= 0}
                className="modal-action-button"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Submit Request</span>
                  </>
                )}
              </Button>
            </div>
          </div>
      </motion.div>
    </div>
  );
};

export default DepositDeductionModal;