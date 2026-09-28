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
  UserCheckIcon,
  FileTextIcon,
  BadgeCheckIcon,
  XCircleIcon,
  HourglassIcon,
  ClockAlertIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, type DashboardSummary } from '../api/dashboardApi';
import { StatCard } from '../components/StatCard';
import { formatMoney } from '../utils/money';


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
  const portfolio = summary?.loanPortfolio;
  const loansLabel = (count: number | undefined, noun = 'loan') => (count === undefined ? undefined : `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-gray-900">Welcome back{firstName ? `, ${firstName}` : ''}</h2>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening across the network right now.</p>
      </div>

      <section>
        <h3 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest mb-3">Loan Portfolio</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
          <StatCard label="Outstanding Loans" value={summary?.outstandingLoansCount ?? 0} icon={LandmarkIcon} tone="primary" to="/loans?status=Disbursed" loading={loading} />
          <StatCard
            label="Disbursements (this month)"
            value={summary?.disbursementsThisMonthCount ?? 0}
            sublabel={summary ? formatMoney(summary.disbursementsThisMonthAmount, 0) : undefined}
            icon={BanknoteIcon}
            tone="success"
            to="/loan-transactions?type=Disbursement"
            loading={loading}
          />
          <StatCard
            label="Repayments (this month)"
            value={summary?.repaymentsThisMonthCount ?? 0}
            sublabel={summary ? formatMoney(summary.repaymentsThisMonthAmount, 0) : undefined}
            icon={HandCoinsIcon}
            tone="success"
            to="/loan-transactions?type=Repayment"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard colored label="Total Requested" value={formatMoney(portfolio?.requestedAmount ?? 0, 0)} sublabel={loansLabel(portfolio?.requestedCount)} icon={FileTextIcon} tone="info" to="/loans" loading={loading} />
          <StatCard colored label="Total Approved" value={formatMoney(portfolio?.approvedAmount ?? 0, 0)} sublabel={loansLabel(portfolio?.approvedCount)} icon={BadgeCheckIcon} tone="primary" loading={loading} />
          <StatCard colored label="Total Rejected" value={formatMoney(portfolio?.rejectedAmount ?? 0, 0)} sublabel={loansLabel(portfolio?.rejectedCount)} icon={XCircleIcon} tone="neutral" loading={loading} />
          <StatCard colored label="Pending Approval" value={formatMoney(portfolio?.pendingApprovalAmount ?? 0, 0)} sublabel={loansLabel(portfolio?.pendingApprovalCount)} icon={HourglassIcon} tone="warning" to="/loan-applications?status=Pending" loading={loading} />
          <StatCard colored label="Total Repaid" value={formatMoney(portfolio?.repaidAmount ?? 0, 0)} sublabel={loansLabel(portfolio?.repaidCount, 'repayment')} icon={HandCoinsIcon} tone="success" to="/loan-transactions?type=Repayment" loading={loading} />
          <StatCard
            colored
            label="In Late Repayment"
            value={formatMoney(portfolio?.lateRepaymentAmount ?? 0, 0)}
            sublabel={portfolio ? `${loansLabel(portfolio.lateRepaymentCount)} · missed a repayment date` : undefined}
            icon={AlertTriangleIcon}
            tone="accent"
            to="/loans/late"
            loading={loading}
          />
          <StatCard
            colored
            label="Defaulted Loans"
            value={formatMoney(portfolio?.defaultedAmount ?? 0, 0)}
            sublabel={portfolio ? `${loansLabel(portfolio.defaultedCount)} · past final repayment date` : undefined}
            icon={ClockAlertIcon}
            tone="danger"
            loading={loading}
          />
        </div>
        
      </section>

      <section>
        <h3 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest mb-3">Network</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Offices" value={summary?.officesCount ?? 0} sublabel={summary ? `${summary.activeOfficesCount} active` : undefined} icon={Building2Icon} tone="primary" to="/offices" loading={loading} />
          <StatCard label="Staff" value={summary?.staffCount ?? 0} icon={UsersIcon} tone="info" to="/staff" loading={loading} />
          <StatCard label="Clients" value={summary?.clientsCount ?? 0} sublabel={summary ? `${summary.activeClientsCount} active` : undefined} icon={ContactIcon} tone="accent" to="/clients" loading={loading} />
          <StatCard label="Pending Staff Onboarding" value={summary?.pendingStaffOnboardingCount ?? 0} icon={UserCheckIcon} tone="warning" to="/staff?onboardingStatus=Pending" loading={loading} />
        </div>
      </section>

    </div>
  );
}
