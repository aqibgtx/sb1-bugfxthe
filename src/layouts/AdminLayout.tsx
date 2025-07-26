import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  CreditCard,
  DollarSign,
  HandHeart,
  Calendar,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Sidebar from '../components/ui/Sidebar';
import PaymentNotificationBadge from '../components/admin/PaymentNotificationBadge';

const AdminLayout: React.FC = () => {
  const [hasOpenModal, setHasOpenModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    management: false
  });
  const location = useLocation();

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const sidebarItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/approvals', icon: CheckSquare, label: 'Approvals' },
    { to: '/admin/bookings', icon: Calendar, label: 'Bookings' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { to: '/admin/handover-return', icon: HandHeart, label: 'Handover & Return' },
    {
      type: 'section',
      key: 'management',
      label: 'Management',
      icon: TrendingUp,
      expanded: expandedSections.management,
      onToggle: () => toggleSection('management'),
      items: [
        { to: '/admin/staff-payouts', icon: DollarSign, label: 'Staff Payouts' },
        { to: '/admin/analytics', icon: TrendingUp, label: 'Analytics & ROI' },
        { to: '/admin/sold-cars', icon: TrendingUp, label: 'Sold Cars' },
      ]
    },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  // Listen for modal state changes
  useEffect(() => {
    const handleModalOpen = () => setHasOpenModal(true);
    const handleModalClose = () => setHasOpenModal(false);

    // Listen for modal events
    document.addEventListener('modal-open', handleModalOpen);
    document.addEventListener('modal-close', handleModalClose);

    // Also check for modal elements in DOM
    const checkForModals = () => {
      const modals = document.querySelectorAll('[data-modal="true"], .fixed.inset-0');
      setHasOpenModal(modals.length > 0);
    };

    // Check periodically for modals
    const interval = setInterval(checkForModals, 100);

    return () => {
      document.removeEventListener('modal-open', handleModalOpen);
      document.removeEventListener('modal-close', handleModalClose);
      clearInterval(interval);
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    // scroll the inner scroller to top on every route change
    document
      .querySelector('.overflow-y-auto')
      ?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <Sidebar items={sidebarItems} title="Admin Portal" />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col lg:ml-64 h-full ${hasOpenModal ? '' : 'overflow-hidden'}`}>
        {/* Content Area - Mobile optimized spacing */}
        <div className={`flex-1 h-full ${hasOpenModal ? 'overflow-visible' : 'overflow-y-auto'}`}>
          <div className="p-3 sm:p-4 lg:p-6 pt-20 sm:pt-20 lg:pt-6 min-h-full">
            {/* Payment notification badge positioned in top right */}
            <div className="fixed top-4 right-4 z-30">
              <PaymentNotificationBadge />
            </div>
            <Outlet />
          </div>
        </div>
      </div>

      {/* Modal Portal Container - Outside of overflow container */}
      <div id="modal-portal" className="relative z-50" />
    </div>
  );
};

export default AdminLayout;