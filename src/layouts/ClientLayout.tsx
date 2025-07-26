import React from 'react';
import { Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar,
  Car,
  Package,
  PackageCheck
} from 'lucide-react';
import Sidebar from '../components/ui/Sidebar';

const ClientLayout: React.FC = () => {
  const sidebarItems = [
    { to: '/client/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/client/book-car', icon: Car, label: 'Book a Car' },
    { to: '/client/bookings', icon: Calendar, label: 'My Bookings' },
  ];

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        <Sidebar items={sidebarItems} title="Client Portal" />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-64 h-full">
          {/* Content Area - Mobile optimized spacing */}
          <div className="flex-1 overflow-y-auto h-full">
            <div className="p-3 sm:p-4 lg:p-6 pt-20 sm:pt-20 lg:pt-6 min-h-full">
              <Outlet />
            </div>
          </div>
        </div>
    </div>
  );
};

export default ClientLayout;