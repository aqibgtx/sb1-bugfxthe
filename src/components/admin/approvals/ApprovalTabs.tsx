import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  count: number;
}

interface ApprovalTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ApprovalTabs: React.FC<ApprovalTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  // Group tabs into primary (high priority) and secondary (lower priority)
  const primaryTabs = tabs.filter(tab => 
    ['users', 'bookings', 'payments'].includes(tab.key)
  );
  
  const secondaryTabs = tabs.filter(tab => 
    ['cancellations', 'extensions', 'deposits', 'history'].includes(tab.key)
  );

  const renderTabButton = (tab: Tab) => (
    <button
      key={tab.key}
      onClick={() => onTabChange(tab.key)}
      className={`
        flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px] flex-1
        ${activeTab === tab.key 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
        }
      `}
    >
      <tab.icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-semibold text-sm sm:text-base">{tab.label}</span>
      {tab.count > 0 && (
        <span className={`
          px-2 py-1 text-xs rounded-full min-w-[20px] text-center font-bold
          ${activeTab === tab.key
            ? 'bg-white text-blue-600' 
            : tab.key === 'history'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-red-100 text-red-700'
          }
        `}>
          {tab.count > 99 ? '99+' : tab.count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Primary Actions - Most Important */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Primary Approvals
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {primaryTabs.map(renderTabButton)}
        </div>
      </div>

      {/* Secondary Actions - Less Frequent */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Additional Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {secondaryTabs.map(renderTabButton)}
        </div>
      </div>
    </div>
  );
};

export default ApprovalTabs;