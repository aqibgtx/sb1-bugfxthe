import React from 'react';
import { Calendar } from 'lucide-react';

interface PersonalInformationFormProps {
  formData: {
    name: string;
    ic_number: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    email: string;
    address_street: string;
    address_city: string;
    address_state: string;
    address_postal_code: string;
  };
  onFormDataChange: (data: any) => void;
}

const PersonalInformationForm: React.FC<PersonalInformationFormProps> = ({
  formData,
  onFormDataChange
}) => {
  const handleInputChange = (field: string, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
          <span>Personal Information</span>
        </h3>
        <p className="text-gray-700 text-sm mb-6">Please provide your personal details. Fields marked with * are required.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[44px]"
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            IC Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.ic_number}
            onChange={(e) => handleInputChange('ic_number', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[44px]"
            placeholder="Enter your IC number"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[44px]"
            required
            max={new Date().toISOString().split('T')[0]} // Prevent future dates
          />
          <p className="text-gray-500 text-xs mt-1">You must be at least 21 years old to register</p>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[44px]"
          >
            <option value="">Select gender (optional)</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Required Fields Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-blue-800 font-semibold text-sm">Important Information</h4>
            <ul className="text-blue-700 text-sm mt-1 space-y-1">
              <li>• All fields marked with <span className="text-red-500 font-semibold">*</span> are required</li>
              <li>• You must be at least 21 years old to register</li>
              <li>• Please ensure your IC number matches your identification document</li>
              <li>• Your date of birth will be used for age verification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformationForm;