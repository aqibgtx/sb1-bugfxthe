import React from 'react';
import { User, Users } from 'lucide-react';

interface BookingForSelectionProps {
  bookingFor: string;
  onBookingForChange: (value: string) => void;
}

const BookingForSelection: React.FC<BookingForSelectionProps> = ({
  bookingFor,
  onBookingForChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Who is this booking for?</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="relative cursor-pointer">
          <input
            type="radio"
            name="bookingFor"
            value="myself"
            checked={bookingFor === 'myself'}
            onChange={(e) => onBookingForChange(e.target.value)}
            className="sr-only"
          />
          <div className={`
            p-4 rounded-lg border-2 transition-all duration-200
            ${bookingFor === 'myself' 
              ? 'border-blue-500 bg-blue-50 shadow-md' 
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }
          `}>
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-full
                ${bookingFor === 'myself' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`font-medium ${bookingFor === 'myself' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Book for Myself
                </h4>
                <p className={`text-sm ${bookingFor === 'myself' ? 'text-blue-700' : 'text-gray-600'}`}>
                  I will be the driver
                </p>
              </div>
            </div>
          </div>
        </label>

        <label className="relative cursor-pointer">
          <input
            type="radio"
            name="bookingFor"
            value="someone_else"
            checked={bookingFor === 'someone_else'}
            onChange={(e) => onBookingForChange(e.target.value)}
            className="sr-only"
          />
          <div className={`
            p-4 rounded-lg border-2 transition-all duration-200
            ${bookingFor === 'someone_else' 
              ? 'border-blue-500 bg-blue-50 shadow-md' 
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }
          `}>
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-full
                ${bookingFor === 'someone_else' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`font-medium ${bookingFor === 'someone_else' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Book for Someone Else
                </h4>
                <p className={`text-sm ${bookingFor === 'someone_else' ? 'text-blue-700' : 'text-gray-600'}`}>
                  Another person will drive
                </p>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};

export default BookingForSelection;