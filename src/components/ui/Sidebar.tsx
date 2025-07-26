import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Car, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';

interface SidebarItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type?: 'item' | 'section';
  key?: string;
  expanded?: boolean;
  onToggle?: () => void;
  items?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
}

const Sidebar: React.FC<SidebarProps> = ({ items, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Memoize the mobile check to prevent unnecessary re-renders
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth < 1024;
    setIsMobile(mobile);
    if (!mobile) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    checkMobile();
    
    // Use passive listener for better performance
    const handleResize = () => {
      // Use requestAnimationFrame to debounce resize events
      requestAnimationFrame(checkMobile);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [checkMobile]);

  // Memoize logout handler to prevent re-creation on every render
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

  // Memoize sidebar close handler
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  // Memoize toggle sidebar handler
  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Memoize navigation items to prevent re-rendering
  const navigationItems = useMemo(() => {
    return items.map((item) => {
      if (item.type === 'section') {
        const sectionItems = item.items?.map((subItem) => ({
          ...subItem,
          isActive: location.pathname === subItem.to
        })) || [];
        return { ...item, items: sectionItems };
      } else {
        const isActive = location.pathname === item.to;
        return { ...item, isActive };
      }
    });
  }, [items, location.pathname]);

  // Optimized animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const sidebarVariants = {
    hidden: { x: '-100%' },
    visible: { x: 0 },
    exit: { x: '-100%' }
  };

  const transition = {
    type: 'spring',
    damping: 30,
    stiffness: 300,
    mass: 0.8
  };

  return (
    <>
      {/* Mobile Menu Button - Optimized with will-change */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50 lg:hidden" style={{ willChange: 'transform' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:bg-white transition-all duration-150"
            style={{ willChange: 'transform, background-color' }}
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </Button>
        </div>
      )}

      {/* Desktop Sidebar - Optimized with transform3d for hardware acceleration */}
      {!isMobile && (
        <div 
          className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40"
          style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
        >
          <div className="flex flex-col flex-1 min-h-0 sidebar-glass">
            {/* Header */}
            <div className="flex items-center justify-center h-16 px-4 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-lg">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">{title}</h1>
              </div>
            </div>

            {/* Navigation - Optimized rendering */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => (
                <div key={item.key || item.to}>
                  {item.type === 'section' ? (
                    <div>
                      <button
                        onClick={item.onToggle}
                        className="sidebar-item group relative transition-all duration-150 w-full"
                        style={{ willChange: 'transform, background-color' }}
                      >
                        <item.icon className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors duration-150" />
                        <span className="sidebar-text flex-1 text-left">{item.label}</span>
                        {item.expanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-700 transition-transform duration-150" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-700 transition-transform duration-150" />
                        )}
                      </button>
                      {item.expanded && item.items && (
                        <div className="ml-6 mt-2 space-y-1">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.to}
                              to={subItem.to}
                              className={`
                                sidebar-item group relative transition-all duration-150
                                ${subItem.isActive ? 'active' : ''}
                              `}
                              style={{ willChange: 'transform, background-color' }}
                            >
                              <subItem.icon className="w-4 h-4 text-gray-700 group-hover:text-gray-900 transition-colors duration-150" />
                              <span className="sidebar-text text-sm">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.to}
                      className={`
                        sidebar-item group relative transition-all duration-150
                        ${item.isActive ? 'active' : ''}
                      `}
                      style={{ willChange: 'transform, background-color' }}
                    >
                      <item.icon className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors duration-150" />
                      <span className="sidebar-text">{item.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/20">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 text-gray-700 hover:text-gray-900 transition-colors duration-150"
                style={{ willChange: 'background-color, color' }}
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay - Optimized animations */}
      <AnimatePresence mode="wait">
        {isMobile && isOpen && (
          <>
            {/* Backdrop - Hardware accelerated */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="fixed inset-0 w-full h-full min-h-screen min-h-[100dvh] bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={closeSidebar}
              style={{ willChange: 'opacity' }}
            />

            {/* Mobile Sidebar - Hardware accelerated */}
            <motion.div
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-xl z-50 lg:hidden"
              style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
            >
              <div className="flex flex-col h-full">
                {/* Header with Close Button */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-lg">
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeSidebar}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                    style={{ willChange: 'background-color' }}
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </Button>
                </div>

                {/* Navigation - Optimized for mobile */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                  {navigationItems.map((item) => (
                    <div key={item.key || item.to}>
                      {item.type === 'section' ? (
                        <div>
                          <button
                            onClick={item.onToggle}
                            className="flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-150 touch-target text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            style={{ willChange: 'transform, background-color' }}
                          >
                            <div className="flex items-center space-x-3">
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">{item.label}</span>
                            </div>
                            {item.expanded ? (
                              <ChevronDown className="w-4 h-4 transition-transform duration-150" />
                            ) : (
                              <ChevronRight className="w-4 h-4 transition-transform duration-150" />
                            )}
                          </button>
                          {item.expanded && item.items && (
                            <div className="ml-8 mt-2 space-y-1">
                              {item.items.map((subItem) => (
                                <Link
                                  key={subItem.to}
                                  to={subItem.to}
                                  onClick={closeSidebar}
                                  className={`
                                    flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-150 touch-target
                                    ${subItem.isActive 
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                  style={{ willChange: 'transform, background-color' }}
                                >
                                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="font-medium text-sm">{subItem.label}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={item.to}
                          onClick={closeSidebar}
                          className={`
                            flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-150 touch-target
                            ${item.isActive 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                          style={{ willChange: 'transform, background-color' }}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )}
                    </div>
                  ))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-3 text-gray-700 hover:text-gray-900 py-3 touch-target transition-colors duration-150"
                    style={{ willChange: 'background-color, color' }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;