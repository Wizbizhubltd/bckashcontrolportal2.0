import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon } from 'lucide-react';
import { usersApi, USER_TYPE_SLUGS, type StaffUser, type OnboardingStatus } from '../../api/usersApi';
import { officesApi, type Office } from '../../api/officesApi';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';

const PAGE_SIZE = 15;

const USER_TYPE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  controller: 'Controller',
  director: 'Director',
  manager: 'Manager',
  marketer: 'Marketer',
};

interface StaffListPageProps {
  /** Locks the list (and hides the picker) to a single user_type — used by the Super Admins screen. */
  fixedUserType?: string;
  title?: string;
  subtitle?: string;
  createLabel?: string;
  createTo?: string;
}

export function StaffListPage({ fixedUserType, title, subtitle, createLabel, createTo }: StaffListPageProps) {
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState<StaffUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);

  const [officeId, setOfficeId] = useState('');
  const [userType, setUserType] = useState(fixedUserType ?? '');
  const [onboardingStatus, setOnboardingStatus] = useState((searchParams.get('onboardingStatus') as OnboardingStatus | null) ?? '');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await usersApi.list({
        officeId: officeId ? Number(officeId) : undefined,
        userType: fixedUserType || userType || undefined,
        onboardingStatus: (onboardingStatus || undefined) as OnboardingStatus | undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(1), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId, userType, onboardingStatus]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-primary">{title ?? 'Staff Directory'}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle ?? 'Every staff account across the network, and their RBAC role.'}</p>
        </div>
        <Link to={createTo ?? '/staff/new'} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <PlusIcon size={16} />
          {createLabel ?? 'Add Staff'}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {!fixedUserType && (
          <select value={userType} onChange={(e) => setUserType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
            <option value="">All Roles</option>
            {USER_TYPE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {USER_TYPE_LABELS[slug]}
              </option>
            ))}
          </select>
        )}

        <select value={onboardingStatus} onChange={(e) => setOnboardingStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Onboarding Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Declined">Declined</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Onboarding</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No staff found.
                </td>
              </tr>
            ) : (
              items.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    <Link to={`/staff/${staff.id}`} className="text-primary hover:underline font-medium">
                      {`${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim() || staff.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{staff.email}</td>
                  <td className="px-4 py-3 text-gray-700">{staff.officeName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{staff.userType ? USER_TYPE_LABELS[staff.userType] ?? staff.userType : '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={staff.onboardingStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={staff.blocked ? 'Blocked' : 'Active'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={(p) => void load(p)} />
      </div>
    </div>
  );
}
