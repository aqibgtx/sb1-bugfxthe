import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PersonalInformationForm from '../../components/forms/PersonalInformationForm';
import ContactInformationForm from '../../components/forms/ContactInformationForm';
import AddressInformationForm from '../../components/forms/AddressInformationForm';
import DocumentUploadForm from '../../components/forms/DocumentUploadForm';
import RegistrationCompleteSummary from '../../components/summaries/RegistrationCompleteSummary';
import ReferralLinkModal from '../../components/modals/ReferralLinkModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import toast from 'react-hot-toast';

const StaffRegisterCustomer: React.FC = () => {
  const { user } = useAuth();
  const { fetchData } = useSupabaseData();
  const [activeTab, setActiveTab] = useState<'direct' | 'link'>('direct');
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    tempKey: string;
  } | null>(null);
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

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const result = await fetchData('users', '*', { role: 'customer' });
      return result.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to fetch user data');
      return [];
    } finally {
      setLoading(false);
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

  const handleDirectRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('Staff user not found');
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.email || !formData.ic_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate documents
    if (!documents.driving_license || !documents.ic_passport) {
      toast.error('Please upload both driving license and IC/Passport documents');
      return;
    }

    try {
      setLoading(true);

      // Generate temporary key
      const tempKey = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create user record with staff referral
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          ...formData,
          temp_key: tempKey,
          role: 'customer',
          approved: false, // Requires admin approval
          active: false,   // Requires admin activation
          registration_status: 'pending',
          referred_by: user.id // Use staff UUID for referral tracking
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

      if (!newUser) {
        throw new Error('Failed to create user account');
      }

      // Upload documents
      const documentPromises = [
        supabase.from('documents').insert({
          user_id: newUser.id,
          document_type: 'driving_license',
          file_name: 'Driving License',
          file_url: documents.driving_license,
          file_size: 0,
          mime_type: 'image/jpeg'
        }),
        supabase.from('documents').insert({
          user_id: newUser.id,
          document_type: 'ic_passport',
          file_name: 'IC/Passport',
          file_url: documents.ic_passport,
          file_size: 0,
          mime_type: 'image/jpeg'
        })
      ];

      const documentResults = await Promise.allSettled(documentPromises);
      
      // Check if any document uploads failed
      const failedUploads = documentResults.filter(result => result.status === 'rejected');
      if (failedUploads.length > 0) {
        console.error('Document upload errors:', failedUploads);
        toast.error('Some documents failed to save, but registration was created. Please contact support.');
      }

      setGeneratedCredentials({
        email: formData.email,
        tempKey: tempKey
      });
      setRegistrationComplete(true);
      toast.success('Customer registration submitted successfully! Pending admin approval.');
    } catch (error) {
      console.error('Error registering customer:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('email already exists')) {
          toast.error('An account with this email already exists. Please use a different email.');
        } else if (error.message.includes('required fields')) {
          toast.error('Please fill in all required fields before submitting.');
        } else {
          toast.error(`Registration failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to submit registration. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
    setDocuments({
      driving_license: '',
      ic_passport: ''
    });
    setRegistrationComplete(false);
    setGeneratedCredentials(null);
  };

  const handleRefresh = async () => {
    resetForm();
    await fetchUserData();
    toast.success('Form refreshed successfully');
  };

  if (registrationComplete && generatedCredentials) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen space-y-8 p-4 md:p-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Registration Submitted</h1>
            <p className="text-gray-700">Customer registration submitted and pending admin approval</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="secondary"
            className="flex items-center space-x-2 min-h-[44px] w-full md:w-auto"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>New Registration</span>
          </Button>
        </div>

        <RegistrationCompleteSummary
          credentials={generatedCredentials}
          onRegisterAnother={resetForm}
          onBackToDashboard={() => window.location.href = '/staff/dashboard'}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen space-y-8 p-4 md:p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Register Customer</h1>
          <p className="text-gray-700">Register new customers directly or generate referral links</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="secondary"
          className="flex items-center space-x-2 min-h-[44px] w-full md:w-auto"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Reset Form</span>
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('direct')}
          className={`
            flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]
            ${activeTab === 'direct' 
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-medium">Direct Registration</span>
        </button>
        <button
          onClick={() => setActiveTab('link')}
          className={`
            flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]
            ${activeTab === 'link' 
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Mail className="w-5 h-5" />
          <span className="font-medium">Referral Link</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'direct' ? (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Direct Customer Registration</h3>
            <p className="text-gray-700">Register customers with document upload (requires admin approval for activation)</p>
          </div>

          <form onSubmit={handleDirectRegistration} className="space-y-8">
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
              loading={loading}
            />

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="px-8 min-h-[44px] w-full md:w-auto"
                disabled={loading || !formData.name || !formData.email || !formData.ic_number || !documents.driving_license || !documents.ic_passport}
              >
                {loading ? 'Submitting...' : 'Submit Registration for Approval'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <ReferralLinkModal userId={user?.id || ''} />
      )}
    </motion.div>
  );
};

export default StaffRegisterCustomer;