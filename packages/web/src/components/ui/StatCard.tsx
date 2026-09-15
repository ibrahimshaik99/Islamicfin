import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  color?: string;
}

export function StatCard({ label, value, icon, trend, className = '', color = 'primary' }: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: 'from-primary-50 to-transparent text-primary-600',
    blue: 'from-blue-50 to-transparent text-blue-600',
    green: 'from-green-50 to-transparent text-green-600',
    amber: 'from-amber-50 to-transparent text-amber-600',
    purple: 'from-purple-50 to-transparent text-purple-600',
    red: 'from-red-50 to-transparent text-red-600',
  };

  const iconColorMap: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all duration-300 ${className}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorMap[color]} rounded-bl-[4rem] -mr-6 -mt-6 opacity-60`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColorMap[color]}`}>
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {trend && (
          <p className={`mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
