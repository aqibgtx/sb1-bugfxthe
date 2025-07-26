import React from 'react';
import { Phone } from 'lucide-react';

interface ContactInformationFormProps {
  formData: {
    phone: string;
    email: string;
  };
  onFormDataChange: (data: any) => void;
}

const ContactInformationForm: React.FC<ContactInformationFormProps> = ({
  formData,
  onFormDataChange
}) => {
  const handleChange = (field: string, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div>
      <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
        <Phone className="w-5 h-5" />
        <span>Contact Information</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            placeholder="+60123456789"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Email Address *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            placeholder="john@example.com"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInformationForm;