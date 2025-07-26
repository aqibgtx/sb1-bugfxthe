import React from 'react';
import { Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  Car, 
  Calendar, 
  History,
  Crown,
  HandHeart,
  AlertTriangle
} from 'lucide-react';
import Sidebar from '../components/ui/Sidebar';

const StaffLayout: React.FC = () => {
  const sidebarItems = [
    { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/staff/register-customer', icon: UserPlus, label: 'Register Customer' },
    { to: '/staff/book-car', icon: Car, label: 'Book Car' },
    { to: '/staff/agent', icon: Crown, label: 'Agent Book Car' },
    { to: '/staff/handover-return', icon: HandHeart, label: 'Handover & Return' },
    { to: '/staff/bookings', icon: Calendar, label: 'My Bookings' },
    { to: '/staff/overdue-tracking', icon: AlertTriangle, label: 'Overdue Tracking' },
    { to: '/staff/customer-history', icon: History, label: 'Customer History' },
  ];

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        <Sidebar items={sidebarItems} title="Staff Portal" />
        
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

export default StaffLayout;