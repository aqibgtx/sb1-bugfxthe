import React from 'react';
import { getMalaysiaDateString, getMalaysiaDateTimeString } from '../../lib/timezone';

interface MalaysiaDateInputProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'date' | 'datetime-local';
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

/**
 * Date input component that handles Malaysia timezone automatically
 */
const MalaysiaDateInput: React.FC<MalaysiaDateInputProps> = ({
  value,
  onChange,
  type = 'date',
  min,
  max,
  className = '',
  disabled = false,
  required = false,
  placeholder
}) => {
  // Convert value to appropriate format for input
  const getInputValue = () => {
    if (!value) return '';
    
    if (type === 'datetime-local') {
      return getMalaysiaDateTimeString(value);
    } else {
      return getMalaysiaDateString(value);
    }
  };

  // Handle input change and convert back to standard format
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      onChange('');
      return;
    }

    // For date inputs, the value is already in YYYY-MM-DD format
    // For datetime-local inputs, the value is in YYYY-MM-DDTHH:mm format
    onChange(inputValue);
  };

  // Set default min to today in Malaysia timezone if not provided
  const getMinValue = () => {
    if (min) return min;
    if (type === 'datetime-local') {
      return getMalaysiaDateTimeString();
    } else {
      return getMalaysiaDateString();
    }
  };

  return (
    <input
      type={type}
      value={getInputValue()}
      onChange={handleChange}
      min={getMinValue()}
      max={max}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
    />
  );
};

export default MalaysiaDateInput;