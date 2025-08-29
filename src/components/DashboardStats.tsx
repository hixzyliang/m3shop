import React from 'react';

interface StatCard {
  icon: any;
  value: string | number;
  label: string;
  badge?: {
    value: string;
    color: 'success' | 'danger' | 'warning' | 'primary';
  };
}

interface DashboardStatsProps {
  stats: StatCard[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'danger': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'primary': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={`${stat.label}-${index}`} className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            {stat.badge && (
              <span className={`px-3 py-1 text-xs font-medium rounded-md ${getBadgeColor(stat.badge.color)} whitespace-nowrap`}>
                {stat.badge.value}
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;