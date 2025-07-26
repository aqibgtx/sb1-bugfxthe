import React from 'react';
import { motion } from 'framer-motion';
import { Car, Calendar, FileText, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';

interface ActionButton {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
  primary?: boolean;
}

const ActionButtons: React.FC = () => {
  const navigate = useNavigate();

  const actions: ActionButton[] = [
    {
      title: 'Book a Car',
      description: 'Find and book your perfect rental',
      icon: Car,
      path: '/client/book-car',
      color: 'from-blue-500 to-blue-600',
      primary: true
    },
    {
      title: 'My Bookings',
      description: 'View your rental history',
      icon: Calendar,
      path: '/client/bookings',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Documents',
      description: 'Manage your documents',
      icon: FileText,
      path: '/client/documents',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Support',
      description: 'Get help and support',
      icon: Phone,
      path: '/client/support',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {actions.map((action, index) => (
        <motion.div
          key={action.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={action.primary ? 'sm:col-span-2' : ''}
        >
          <Button
            onClick={() => navigate(action.path)}
            className={`w-full p-4 md:p-6 bg-gradient-to-r ${action.color} hover:scale-105 transition-transform duration-200 ${
              action.primary ? 'text-base md:text-lg' : 'text-sm md:text-base'
            }`}
          >
            <div className="flex items-center space-x-3">
              <action.icon className={`text-white ${action.primary ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5 md:w-6 md:h-6'}`} />
              <div className="text-left">
                <h3 className={`text-white font-semibold ${action.primary ? 'text-lg md:text-xl' : 'text-sm md:text-base'}`}>
                  {action.title}
                </h3>
                <p className={`text-white/80 ${action.primary ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}>
                  {action.description}
                </p>
              </div>
            </div>
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

export default ActionButtons;