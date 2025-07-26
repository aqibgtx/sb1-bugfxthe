import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCloudflareUpload } from '../../hooks/useCloudflareUpload';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onUpload?: (url: string, fileInfo: { name: string; size: number; type: string }) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string;
  fileName?: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  children?: React.ReactNode;
  loading?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUpload = () => {},
  onError = () => {},
  accept = 'image/*,.pdf,.doc,.docx',
  maxSize = 10,
  folder = 'uploads',
  fileName,
  className = '',
  disabled = false,
  multiple = false,
  children,
  loading = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, validateFile, formatFileSize, uploading, progress } = useCloudflareUpload();

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    const file = files[0];
    
    try {
      const allowedTypes = accept.split(',').map(type => type.trim());
      validateFile(file, { maxSize, allowedTypes });
      
      setUploadSuccess(false);
      const result = await uploadFile(file, fileName, { 
        folder,
        onProgress: (prog) => {
          // Progress is handled internally by the hook
        }
      });
      
      setUploadSuccess(true);
      onUpload(result.publicUrl, { name: file.name, size: file.size, type: file.type });
      toast.success('File uploaded successfully!');
      
      // Reset success state after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading || loading) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled || uploading || loading) return;
    const files = e.target.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const openFileDialog = () => {
    if (!disabled && !uploading && !loading) fileInputRef.current?.click();
  };

  const getFileIcon = (accept: string) => accept.includes('image') ? Image : FileText;
  const FileIcon = getFileIcon(accept);

  const isLoading = uploading || loading;

  if (children) {
    return (
      <div className={className}>
        <div onClick={openFileDialog} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          {children}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          multiple={multiple}
          className="hidden"
          disabled={disabled || isLoading}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        `}
        onClick={openFileDialog}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          multiple={multiple}
          className="hidden"
          disabled={disabled || isLoading}
        />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="uploading" 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.8 }} 
              className="space-y-4"
            >
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Uploading to Cloudflare R2...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div 
                    className="bg-blue-600 h-2 rounded-full" 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progress}%` }} 
                    transition={{ duration: 0.3 }} 
                  />
                </div>
                <p className="text-xs text-gray-500">{progress}%</p>
              </div>
            </motion.div>
          ) : uploadSuccess ? (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.8 }} 
              className="space-y-2"
            >
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-900">Upload Complete!</p>
              <p className="text-xs text-green-700">File uploaded to Cloudflare R2</p>
            </motion.div>
          ) : (
            <motion.div 
              key="default" 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.8 }} 
              className="space-y-4"
            >
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <FileIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Drop files here or click to browse</p>
                <p className="text-xs text-gray-500">Max size: {maxSize}MB • Accepted: {accept.replace(/\*/g, 'all')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {dragActive && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center"
        >
          <div className="text-center">
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900">Drop to upload</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FileUpload;