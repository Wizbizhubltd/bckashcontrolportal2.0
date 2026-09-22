import type { LucideIcon } from 'lucide-react';
import { ArrowUpRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
};

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  tone?: Tone;
  to?: string;
  loading?: boolean;
}

/** Dashboard tile primitive — BCKashWebClient had no equivalent, so this is built for the control portal specifically. */
export function StatCard({ label, value, sublabel, icon: Icon, tone = 'primary', to, loading }: StatCardProps) {
  const content = (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-elevated transition-shadow p-5 h-full flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneClasses[tone]}`}>
          <Icon size={20} />
        </div>
        {to && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 group-hover:text-primary">
            <ArrowUpRightIcon size={16} />
          </span>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-heading font-bold text-gray-900 tabular-nums">{value}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
