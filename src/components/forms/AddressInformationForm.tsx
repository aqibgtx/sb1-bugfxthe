import React from 'react';
import { MapPin } from 'lucide-react';

interface AddressInformationFormProps {
  formData: {
    address_street: string;
    address_city: string;
    address_state: string;
    address_postal_code: string;
  };
  onFormDataChange: (data: any) => void;
}

const AddressInformationForm: React.FC<AddressInformationFormProps> = ({
  formData,
  onFormDataChange
}) => {
  const handleChange = (field: string, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const malaysianStates = [
    { value: 'selangor', label: 'Selangor' },
    { value: 'kl', label: 'Kuala Lumpur' },
    { value: 'johor', label: 'Johor' },
    { value: 'penang', label: 'Penang' },
    { value: 'perak', label: 'Perak' },
    { value: 'negeri_sembilan', label: 'Negeri Sembilan' },
    { value: 'melaka', label: 'Melaka' },
    { value: 'pahang', label: 'Pahang' },
    { value: 'terengganu', label: 'Terengganu' },
    { value: 'kelantan', label: 'Kelantan' },
    { value: 'kedah', label: 'Kedah' },
    { value: 'perlis', label: 'Perlis' },
    { value: 'sabah', label: 'Sabah' },
    { value: 'sarawak', label: 'Sarawak' },
  ];

  return (
    <div>
      <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
        <MapPin className="w-5 h-5" />
        <span>Address Information</span>
      </h4>
      <div className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Street Address</label>
          <input
            type="text"
            value={formData.address_street}
            onChange={(e) => handleChange('address_street', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            placeholder="123 Main Street"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">City</label>
            <input
              type="text"
              value={formData.address_city}
              onChange={(e) => handleChange('address_city', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              placeholder="Kuala Lumpur"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">State</label>
            <select
              value={formData.address_state}
              onChange={(e) => handleChange('address_state', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="">Select State</option>
              {malaysianStates.map(state => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.address_postal_code}
              onChange={(e) => handleChange('address_postal_code', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              placeholder="50000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressInformationForm;