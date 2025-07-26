import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UploadOptions {
  folder?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  publicUrl: string;
  key: string;
}

export const useCloudflareUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File, options: UploadOptions = {}) => {
    const { maxSize = 5, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'] } = options;
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      throw new Error(`File size must be less than ${maxSize}MB`);
    }
    
    // Check file type with support for wildcards and extensions
    const isValidType = allowedTypes.some(allowedType => {
      const trimmedType = allowedType.trim();
      
      // Handle wildcard MIME types (e.g., 'image/*')
      if (trimmedType.includes('*')) {
        const baseType = trimmedType.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      
      // Handle file extensions (e.g., '.pdf', '.doc')
      if (trimmedType.startsWith('.')) {
        const extension = trimmedType.toLowerCase();
        const fileName = file.name.toLowerCase();
        return fileName.endsWith(extension);
      }
      
      // Handle exact MIME type matches
      return file.type === trimmedType;
    });
    
    if (!isValidType) {
      throw new Error(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const uploadFile = async (
    file: File, 
    fileName: string, 
    options: UploadOptions = {}
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      validateFile(file, options);
      
      // Simulate progress for getting upload URL
      setProgress(10);
      if (options.onProgress) options.onProgress(10);
      
      // Get upload URL from Supabase edge function
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'generate-upload-url',
        {
          body: {
            file_name: fileName,
            content_type: file.type,
            folder: options.folder || 'uploads'
          }
        }
      );

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to get upload URL');
      }

      if (!uploadData?.uploadUrl || !uploadData?.key) {
        throw new Error('Invalid upload URL response');
      }

      setProgress(30);
      if (options.onProgress) options.onProgress(30);

      // Upload file to Cloudflare R2
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      setProgress(100);
      if (options.onProgress) options.onProgress(100);

      // Construct public URL
      const publicUrl = `https://pub-65084e9706ea4dfba6655c7488dd40ca.r2.dev/${uploadData.key}`;

      return {
        publicUrl,
        key: uploadData.key
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadFile,
    validateFile,
    formatFileSize,
    uploading,
    error,
    progress
  };
};