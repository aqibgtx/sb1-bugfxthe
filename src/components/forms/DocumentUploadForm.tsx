import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle } from 'lucide-react';
import FileUpload from '../ui/FileUpload';

interface DocumentUploadFormProps {
  documents: {
    driving_license: string;
    ic_passport: string;
  };
  onDocumentUpload: (documentType: 'driving_license' | 'ic_passport', url: string, fileInfo: any) => void;
  onDocumentUploadError: (error: string) => void;
  loading?: boolean;
}

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({
  documents,
  onDocumentUpload,
  onDocumentUploadError,
  loading = false
}) => {
  const handleUpload = async (documentType: 'driving_license' | 'ic_passport', url: string, fileInfo: any) => {
    // The FileUpload component handles the upload to Cloudflare R2
    // We just need to pass the permanent URL to the parent
    onDocumentUpload(documentType, url, fileInfo);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>Document Upload</span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Please upload clear photos or scans of your documents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Driving License Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Driving License <span className="text-red-500">*</span>
          </label>
          
          {documents.driving_license ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-green-200 bg-green-50 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900">
                    Driving License Uploaded
                  </p>
                  <p className="text-xs text-green-700">
                    Document ready for review
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <FileUpload
              onUpload={(url, fileInfo) => handleUpload('driving_license', url, fileInfo)}
              onError={onDocumentUploadError}
              accept="image/*,.pdf"
              maxSize={10}
              folder="documents/driving_license"
              fileName="driving_license"
              disabled={loading}
            />
          )}
        </div>

        {/* IC/Passport Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            IC/Passport <span className="text-red-500">*</span>
          </label>
          
          {documents.ic_passport ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-green-200 bg-green-50 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900">
                    IC/Passport Uploaded
                  </p>
                  <p className="text-xs text-green-700">
                    Document ready for review
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <FileUpload
              onUpload={(url, fileInfo) => handleUpload('ic_passport', url, fileInfo)}
              onError={onDocumentUploadError}
              accept="image/*,.pdf"
              maxSize={10}
              folder="documents/ic_passport"
              fileName="ic_passport"
              disabled={loading}
            />
          )}
        </div>
      </div>

      {/* Upload Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Ensure documents are clear and readable</li>
          <li>• All text and details must be visible</li>
          <li>• Accepted formats: JPG, PNG, PDF</li>
          <li>• Maximum file size: 10MB per document</li>
          <li>• Documents must be valid and not expired</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default DocumentUploadForm;