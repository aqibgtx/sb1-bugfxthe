import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PersonalInformationForm from '../components/forms/PersonalInformationForm';
import ContactInformationForm from '../components/forms/ContactInformationForm';
import AddressInformationForm from '../components/forms/AddressInformationForm';
import DocumentUploadForm from '../components/forms/DocumentUploadForm';
import TermsAndConditionsModal from '../components/modals/TermsAndConditionsModal';
import StaffReferralBadge from '../components/tags/StaffReferralBadge';
import { cloudflareStorageService } from '../services/cloudflareStorageService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const CustomerRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [documents, setDocuments] = useState({
    driving_license: '',
    ic_passport: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    ic_number: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_postal_code: ''
  });

  const staffRef = searchParams.get('ref');

  useEffect(() => {
    if (staffRef) {
      loadStaffInfo();
    }
  }, [staffRef]);

  const loadStaffInfo = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        toast.error('Database connection not available. Please contact support.');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone')
        .eq('id', staffRef)
        .eq('role', 'staff')
        .eq('approved', true)
        .eq('active', true)
        .single();

      if (error) {
        console.error('Invalid referral code:', error);
        toast.error('Invalid referral link. Please contact our staff for assistance.');
        return;
      }

      setStaffInfo(data);
      toast.success(`Welcome! You're being referred by ${data.name}`);
    } catch (error) {
      console.error('Error loading staff info:', error);
      toast.error('Unable to verify referral link. Please contact support.');
    }
  };

  const handleDocumentUpload = async (documentType: 'driving_license' | 'ic_passport', url: string, fileInfo: any) => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: url
    }));
    
    // Show success toast only here, not in the DocumentUploadForm component
    const documentLabel = documentType === 'driving_license' ? 'Driving License' : 'IC/Passport';
    toast.success(`${documentLabel} uploaded successfully`);
  };

  const handleDocumentUploadError = (error: string) => {
    // Show error toast only here, not in the DocumentUploadForm component
    toast.error(`Document upload failed: ${error}`);
  };

  // Enhanced validation function for required fields
  const validateRequiredFields = () => {
    const errors = [];

    // Check required fields
    if (!formData.name.trim()) {
      errors.push('Full name is required');
    }

    if (!formData.email.trim()) {
      errors.push('Email address is required');
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('Please enter a valid email address');
      }
    }

    if (!formData.ic_number.trim()) {
      errors.push('IC number is required');
    }

    // NEW: Validate date of birth is required
    if (!formData.date_of_birth.trim()) {
      errors.push('Date of birth is required');
    } else {
      // Validate age (must be at least 21 years old)
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        errors.push('You must be at least 21 years old to register');
      }
      
      // Validate date is not in the future
      if (birthDate > today) {
        errors.push('Date of birth cannot be in the future');
      }
    }

    // Check document uploads
    if (!documents.driving_license) {
      errors.push('Driving license document is required');
    }

    if (!documents.ic_passport) {
      errors.push('IC/Passport document is required');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const validationErrors = validateRequiredFields();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    if (!staffInfo) {
      toast.error('Invalid referral link. Please contact our staff.');
      return;
    }

    try {
      setUploading(true);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const tempKey = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Prepare form data with proper null handling for date fields
      const sanitizedFormData = {
        ...formData,
        // Date of birth is now required, so we don't convert to null
        date_of_birth: formData.date_of_birth.trim(),
        // Convert empty strings to null for optional fields
        gender: formData.gender.trim() === '' ? null : formData.gender,
        phone: formData.phone.trim() === '' ? null : formData.phone,
        address_street: formData.address_street.trim() === '' ? null : formData.address_street,
        address_city: formData.address_city.trim() === '' ? null : formData.address_city,
        address_state: formData.address_state.trim() === '' ? null : formData.address_state,
        address_postal_code: formData.address_postal_code.trim() === '' ? null : formData.address_postal_code
      };

      // Ensure required fields are not null or empty
      if (!sanitizedFormData.name || !sanitizedFormData.email || !sanitizedFormData.ic_number || !sanitizedFormData.date_of_birth) {
        throw new Error('Name, email, IC number, and date of birth are required fields');
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          ...sanitizedFormData,
          temp_key: tempKey,
          role: 'customer',
          approved: false,
          active: false,
          referred_by: staffInfo.id
        })
        .select()
        .single();

      if (userError) {
        console.error('User creation error:', userError);
        if (userError.code === '23505') {
          throw new Error('An account with this email already exists');
        }
        throw new Error(`Database error: ${userError.message}`);
      }

      if (!user) {
        throw new Error('Failed to create user account');
      }

      const documentPromises = [
        supabase.from('documents').insert({
          user_id: user.id,
          document_type: 'driving_license',
          file_name: 'Driving License',
          file_url: documents.driving_license,
          file_size: 0,
          mime_type: 'image/jpeg'
        }),
        supabase.from('documents').insert({
          user_id: user.id,
          document_type: 'ic_passport',
          file_name: 'IC/Passport',
          file_url: documents.ic_passport,
          file_size: 0,
          mime_type: 'image/jpeg'
        })
      ];

      const documentResults = await Promise.allSettled(documentPromises);
      
      const failedUploads = documentResults.filter(result => result.status === 'rejected');
      if (failedUploads.length > 0) {
        console.error('Document upload errors:', failedUploads);
        toast.error('Some documents failed to upload, but registration was created. Please contact support.');
      }

      setSubmitted(true);
      toast.success('Registration submitted successfully! You will be notified once approved and activated.');
    } catch (error) {
      console.error('Error submitting registration:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Database connection')) {
          toast.error('Database connection error. Please check your internet connection and try again.');
        } else if (error.message.includes('email already exists')) {
          toast.error('An account with this email already exists. Please use a different email or contact support.');
        } else if (error.message.includes('required fields')) {
          toast.error('Please fill in all required fields before submitting.');
        } else {
          toast.error(`Registration failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to submit registration. Please check your connection and try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  if (!staffRef) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Card glass className="max-w-md mx-auto text-center">
          <div className="p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Registration Link</h2>
            <p className="text-gray-700 mb-6">
              This registration link is invalid or has expired. Please contact our staff to get a valid registration link.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 1) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex justify-center mb-6"
            >
              <div className="p-4 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-full shadow-lg">
                <Car className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Budget Plus Rental</h1>
            <p className="text-gray-700">Complete your registration to start renting with us</p>
          </div>

          {/* Staff Referral Info */}
          {staffInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <StaffReferralBadge staffInfo={staffInfo} variant="info" />
            </motion.div>
          )}

          <TermsAndConditionsModal
            agreed={agreed}
            onAgreedChange={setAgreed}
            onContinue={() => setStep(2)}
          />
        </div>
      </motion.div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      >
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Submitted</h1>
            <p className="text-gray-700">Your registration is pending admin approval and activation</p>
          </div>

          <Card glass className="text-center">
            <div className="p-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Successfully Submitted!</h2>
              <p className="text-gray-700 mb-6">
                Thank you for registering with Budget Plus Rental. Your registration has been submitted for admin approval and account activation.
              </p>

              {/* Important Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-yellow-800 font-semibold">Account Activation Required</h3>
                </div>
                <div className="text-yellow-700 text-sm space-y-2">
                  <p>• Your account is currently <strong>inactive</strong> and cannot be used for login</p>
                  <p>• Admin will review your documents and approve your registration</p>
                  <p>• Once approved, your account will be <strong>activated</strong> for use</p>
                  <p>• You will receive notification when your account is ready</p>
                </div>
              </div>

              {staffInfo && (
                <StaffReferralBadge staffInfo={staffInfo} variant="success" />
              )}

              <Button
                onClick={() => navigate('/')}
                className="w-full mt-6"
              >
                Return to Homepage
              </Button>
            </div>
          </Card>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Registration Form</h1>
          <p className="text-gray-700">Fill in your details below to complete registration</p>
          
          {/* Required Fields Notice */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-blue-800 font-semibold">Required Information</h3>
            </div>
            <p className="text-blue-700 text-sm">
              Please ensure you fill in all required fields: <strong>Full Name</strong>, <strong>Email Address</strong>, <strong>IC Number</strong>, <strong>Date of Birth</strong>, and upload both <strong>Driving License</strong> and <strong>IC/Passport</strong> documents.
            </p>
          </div>
        </div>

        {/* Staff Referral Info */}
        {staffInfo && (
          <StaffReferralBadge staffInfo={staffInfo} variant="success" />
        )}

        <Card glass>
          <form onSubmit={handleSubmit} className="space-y-8">
            <PersonalInformationForm
              formData={formData}
              onFormDataChange={setFormData}
            />

            <ContactInformationForm
              formData={formData}
              onFormDataChange={setFormData}
            />

            <AddressInformationForm
              formData={formData}
              onFormDataChange={setFormData}
            />

            <DocumentUploadForm
              documents={documents}
              onDocumentUpload={handleDocumentUpload}
              onDocumentUploadError={handleDocumentUploadError}
              loading={uploading}
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={uploading}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="px-8"
                disabled={uploading}
              >
                {uploading ? 'Submitting...' : 'Submit Registration'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default CustomerRegistration;