import { supabase } from '../lib/supabase';

interface UploadOptions {
  folder?: string;
  upsert?: boolean;
}

interface UploadResult {
  url: string;
  path: string;
  fullPath: string;
}

class SupabaseStorageService {
  private bucketName = 'budget-plus-files';

  async uploadFile(
    file: File, 
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Validate file first
      if (!file || file.size === 0) {
        throw new Error('Invalid file: File is empty or not provided');
      }

      // Check if file size is reasonable (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }

      // Create a unique filename to avoid conflicts
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'bin';
      const uniqueFileName = `${fileName}_${timestamp}_${randomString}.${fileExtension}`;
      
      // Construct the full path
      const folder = options.folder || 'uploads';
      const fullPath = `${folder}/${uniqueFileName}`;

      console.log('Uploading file:', {
        fileName: file.name,
        size: file.size,
        type: file.type,
        fullPath
      });

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: options.upsert || false
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        
        // Provide more specific error messages
        if (error.message.includes('not found')) {
          throw new Error(`Storage bucket '${this.bucketName}' not found. Please check your Supabase configuration.`);
        } else if (error.message.includes('unauthorized') || error.message.includes('permission')) {
          throw new Error('Unauthorized upload. Please check your storage policies and permissions.');
        } else if (error.message.includes('too large')) {
          throw new Error('File size too large. Please choose a smaller file.');
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      if (!data) {
        throw new Error('No data returned from upload');
      }

      console.log('Upload successful:', data);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fullPath);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return {
        url: urlData.publicUrl,
        path: data.path,
        fullPath: fullPath
      };
    } catch (error) {
      console.error('File upload error:', error);
      
      if (error instanceof Error) {
        throw error; // Re-throw the specific error
      } else {
        throw new Error('Failed to upload file. Please try again or contact support.');
      }
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
      return result.url;
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

      return result.url;
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

      return result.url;
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

      return result.url;
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

      return result.url;
    } catch (error) {
      console.error('Maintenance receipt upload failed:', error);
      throw new Error('Failed to upload maintenance receipt. Please try again or contact support.');
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Method to test the storage configuration
  async testConfiguration(): Promise<boolean> {
    try {
      // Create a small test file
      const testContent = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      
      const result = await this.uploadFile(testFile, 'config_test', { folder: 'test' });
      
      // Clean up test file
      await this.deleteFile(result.path);
      
      return true;
    } catch (error) {
      console.error('Storage configuration test failed:', error);
      return false;
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
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
  }

  // Helper method to validate file size
  validateFileSize(file: File, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  }
}

export const supabaseStorageService = new SupabaseStorageService();