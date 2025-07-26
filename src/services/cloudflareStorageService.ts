import { useState } from 'react';

interface UploadOptions {
  folder?: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  publicUrl: string;
  key: string;
}

class CloudflareStorageService {
  private async uploadFile(
    file: File, 
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Get upload URL from Supabase edge function with correct path
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/generate-upload-url`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          file_name: fileName,
          content_type: file.type,
          folder: options.folder || 'uploads',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to get upload URL: ${response.status} ${response.statusText}`);
      }

      const { uploadUrl, key } = await response.json();

      // Upload file to Cloudflare R2 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      // Generate public URL
      const publicUrl = `https://pub-65084e9706ea4dfba6655c7488dd40ca.r2.dev/${key}`;

      return { publicUrl, key };
    } catch (error) {
      console.error('Cloudflare R2 upload error:', error);
      throw error;
    }
  }

  async uploadPaymentReceipt(file: File, bookingId: string): Promise<string> {
    try {
      // Validate file type for receipts
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!this.validateFileType(file, allowedTypes)) {
        throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF) or PDF file.');
      }

      // Validate file size (max 5MB for receipts)
      if (!this.validateFileSize(file, 5)) {
        throw new Error('File size too large. Maximum size for receipts is 5MB.');
      }

      const result = await this.uploadFile(file, `receipt_${bookingId}`, {
        folder: 'receipts'
      });

      console.log('Payment receipt uploaded successfully:', result);
      return result.publicUrl;
    } catch (error) {
      console.error('Payment receipt upload failed:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to upload payment receipt: ${error.message}`);
      } else {
        throw new Error('Failed to upload payment receipt. Please try again or contact support.');
      }
    }
  }

  async uploadCarImage(file: File, carId: string): Promise<string> {
    try {
      const result = await this.uploadFile(file, `car_${carId}`, {
        folder: 'cars'
      });

      return result.publicUrl;
    } catch (error) {
      console.error('Car image upload failed:', error);
      throw new Error('Failed to upload car image. Please try again or contact support.');
    }
  }

  async uploadUserDocument(file: File, userId: string, documentType: string): Promise<string> {
    try {
      const result = await this.uploadFile(file, `${documentType}_${userId}`, {
        folder: `documents/${documentType}`
      });

      return result.publicUrl;
    } catch (error) {
      console.error('User document upload failed:', error);
      throw new Error('Failed to upload document. Please try again or contact support.');
    }
  }

  async uploadCarDocument(file: File, carId: string, documentType: string): Promise<string> {
    try {
      const result = await this.uploadFile(file, `${documentType}_${carId}`, {
        folder: `car-documents/${documentType}`
      });

      return result.publicUrl;
    } catch (error) {
      console.error('Car document upload failed:', error);
      throw new Error('Failed to upload car document. Please try again or contact support.');
    }
  }

  async uploadMaintenanceReceipt(file: File, carId: string): Promise<string> {
    try {
      const result = await this.uploadFile(file, `maintenance_${carId}`, {
        folder: 'maintenance'
      });

      return result.publicUrl;
    } catch (error) {
      console.error('Maintenance receipt upload failed:', error);
      throw new Error('Failed to upload maintenance receipt. Please try again or contact support.');
    }
  }

  // Helper method to get file size in a readable format
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to validate file type
  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      const normalizedType = type.toLowerCase();
      const fileMimeType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      // Handle wildcard MIME types (e.g., "image/*")
      if (normalizedType.endsWith('/*')) {
        const baseType = normalizedType.slice(0, -2);
        return fileMimeType.startsWith(baseType + '/');
      }
      
      // Handle file extensions (e.g., ".pdf")
      if (normalizedType.startsWith('.')) {
        return fileName.endsWith(normalizedType);
      }
      
      // Handle exact MIME types
      if (normalizedType.includes('/')) {
        return fileMimeType === normalizedType;
      }
      
      // Handle partial matches
      return fileMimeType.includes(normalizedType) || fileName.includes(normalizedType);
    });
  }

  // Helper method to validate file size
  validateFileSize(file: File, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  }
}

export const cloudflareStorageService = new CloudflareStorageService();

// Export helper functions for direct use
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    const normalizedType = type.toLowerCase();
    const fileMimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Handle wildcard MIME types (e.g., "image/*")
    if (normalizedType.endsWith('/*')) {
      const baseType = normalizedType.slice(0, -2);
      return fileMimeType.startsWith(baseType + '/');
    }
    
    // Handle file extensions (e.g., ".pdf")
    if (normalizedType.startsWith('.')) {
      return fileName.endsWith(normalizedType);
    }
    
    // Handle exact MIME types
    if (normalizedType.includes('/')) {
      return fileMimeType === normalizedType;
    }
    
    // Handle partial matches
    return fileMimeType.includes(normalizedType) || fileName.includes(normalizedType);
  });
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};