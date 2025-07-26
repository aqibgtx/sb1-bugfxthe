import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, Car, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage staff and customer accounts, roles, and permissions',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      path: '/admin/settings/users'
    },
    {
      id: 'cars',
      title: 'Vehicle Management',
      description: 'Add, edit, and manage your fleet of rental vehicles',
      icon: Car,
      color: 'from-green-500 to-green-600',
      path: '/admin/settings/cars'
    }
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-700">Manage system configuration and administrative settings</p>
          </div>
        </div>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category, index) => {
          const Icon = category.icon;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                <div 
                  onClick={() => handleNavigate(category.path)}
                  className="p-6"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${category.color} opacity-5 group-hover:opacity-10 transition-opacity duration-200`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${category.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-200">
                      {category.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={() => navigate('/admin/settings/users')}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Users className="w-4 h-4" />
              <span>Manage Users</span>
            </Button>
            
            <Button
              onClick={() => navigate('/admin/settings/cars')}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Car className="w-4 h-4" />
              <span>Manage Cars</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card className="bg-white border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">System Version:</span>
              <p className="font-medium text-gray-900">v1.0.0</p>
            </div>
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <p className="font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Environment:</span>
              <p className="font-medium text-gray-900">Production</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AdminSettings;