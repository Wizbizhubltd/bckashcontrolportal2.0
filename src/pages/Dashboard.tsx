import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Building2Icon,
  UsersIcon,
  ContactIcon,
  LandmarkIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  HandCoinsIcon,
  ClipboardListIcon,
  UserCheckIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, type DashboardSummary } from '../api/dashboardApi';
import { StatCard } from '../components/StatCard';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await dashboardApi.getSummary();
        if (!cancelled) setSummary(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load dashboard summary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.fullName?.split(' ')[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-gray-900">Welcome back{firstName ? `, ${firstName}` : ''}</h2>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening across the network right now.</p>
      </div>

      <section>
        <h3 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest mb-3">Network</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Offices" value={summary?.officesCount ?? 0} sublabel={summary ? `${summary.activeOfficesCount} active` : undefined} icon={Building2Icon} tone="primary" to="/offices" loading={loading} />
          <StatCard label="Staff" value={summary?.staffCount ?? 0} icon={UsersIcon} tone="info" to="/staff" loading={loading} />
          <StatCard label="Clients" value={summary?.clientsCount ?? 0} sublabel={summary ? `${summary.activeClientsCount} active` : undefined} icon={ContactIcon} tone="accent" to="/clients" loading={loading} />
          <StatCard label="Pending Staff Onboarding" value={summary?.pendingStaffOnboardingCount ?? 0} icon={UserCheckIcon} tone="warning" to="/staff?onboardingStatus=Pending" loading={loading} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest mb-3">Loan Portfolio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Outstanding Loans" value={summary?.outstandingLoansCount ?? 0} icon={LandmarkIcon} tone="primary" to="/loans?status=Disbursed" loading={loading} />
          <StatCard label="Late Loans" value={summary?.lateLoansCount ?? 0} sublabel="Past due, unpaid installments" icon={AlertTriangleIcon} tone="danger" to="/loans/late" loading={loading} />
          <StatCard
            label="Disbursements (this month)"
            value={summary?.disbursementsThisMonthCount ?? 0}
            sublabel={summary ? formatCurrency(summary.disbursementsThisMonthAmount) : undefined}
            icon={BanknoteIcon}
            tone="success"
            to="/loan-transactions?type=Disbursement"
            loading={loading}
          />
          <StatCard
            label="Repayments (this month)"
            value={summary?.repaymentsThisMonthCount ?? 0}
            sublabel={summary ? formatCurrency(summary.repaymentsThisMonthAmount) : undefined}
            icon={HandCoinsIcon}
            tone="success"
            to="/loan-transactions?type=Repayment"
            loading={loading}
          />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest mb-3">Pending Activities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Pending Loan Applications" value={summary?.pendingLoanApplicationsCount ?? 0} icon={ClipboardListIcon} tone="warning" to="/loan-applications?status=Pending" loading={loading} />
          <StatCard label="Pending Staff Onboarding" value={summary?.pendingStaffOnboardingCount ?? 0} icon={UserCheckIcon} tone="warning" to="/staff?onboardingStatus=Pending" loading={loading} />
        </div>
      </section>
    </div>
  );
}
