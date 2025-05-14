import React, { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  children, 
  className = "", 
  headerExtra 
}) => {
  return (
    <div className={`bg-black/80 border border-blue-500/30 rounded-lg overflow-hidden ${className}`}>
      <div className="p-3 border-b border-blue-500/30 flex justify-between items-center">
        <h3 className="text-sm font-medium text-blue-100">{title}</h3>
        {headerExtra && (
          <div className="flex items-center">
            {headerExtra}
          </div>
        )}
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;
