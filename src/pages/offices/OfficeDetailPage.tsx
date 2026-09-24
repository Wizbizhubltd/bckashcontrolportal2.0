import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PencilIcon } from 'lucide-react';
import { officesApi, type Office } from '../../api/officesApi';
import { usersApi, type StaffUser } from '../../api/usersApi';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';

const STAFF_PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 break-words">{children || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

export function OfficeDetailPage() {
  const { id } = useParams();
  const officeId = Number(id);

  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffPage, setStaffPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    void officesApi
      .get(officeId)
      .then(setOffice)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load office.'))
      .finally(() => setLoading(false));
  }, [officeId]);

  useEffect(() => {
    void usersApi
      .list({ officeId, page: staffPage, pageSize: STAFF_PAGE_SIZE })
      .then((result) => {
        setStaff(result.items);
        setStaffTotal(result.totalCount);
      })
      .catch(() => undefined);
  }, [officeId, staffPage]);

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading…</div>;
  }

  if (!office) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-3">Office not found.</p>
        <Link to="/offices" className="text-primary hover:underline text-sm">Back to Office Directory</Link>
      </div>
    );
  }

  const createdAt = formatDate(office.createdAt);

  return (
    <div className="max-w-5xl">
      <Link to="/offices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeftIcon size={14} />
        Back to Office Directory
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-primary">{office.name}</h1>
              <StatusBadge status={office.active ? 'Active' : 'Inactive'} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {office.defaultOffice ? 'Head office' : 'Branch'}
              {office.officeCode && (
                <>
                  {' · '}
                  <span className="font-mono">{office.officeCode}</span>
                </>
              )}
            </p>
          </div>
          <Link to={`/offices/${office.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5">
            <PencilIcon size={14} />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <section className="bg-white rounded-xl border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-sm font-heading font-bold text-gray-700 mb-4">Office details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Parent office">
              {office.parentId ? <Link to={`/offices/${office.parentId}`} className="text-primary hover:underline">{office.parentName ?? `Office #${office.parentId}`}</Link> : null}
            </Field>
            <Field label="Opening date">{office.openingDate}</Field>
            <Field label="Phone">{office.phone}</Field>
            <Field label="Email">{office.email}</Field>
            <Field label="Address">{office.address}</Field>
            <Field label="External ID">{office.externalId}</Field>
            <div className="sm:col-span-2">
              <Field label="Notes">{office.notes}</Field>
            </div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-heading font-bold text-gray-700 mb-4">Location</h2>
            <dl className="space-y-3">
              <Field label="Zone">{office.zoneName}</Field>
              <Field label="State">{office.stateName}</Field>
              <Field label="Local government area">{office.lgaName}</Field>
              <Field label="City">{office.cityName}</Field>
            </dl>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-heading font-bold text-gray-700 mb-4">Record</h2>
            <dl className="space-y-3">
              <Field label="Created">{createdAt}</Field>
              <Field label="Created by">{office.createdByName}</Field>
            </dl>
          </section>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-heading font-bold text-gray-700">Staff ({office.staffCount})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">User type</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No staff assigned to this office.</td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/staff/${member.id}`} className="text-primary hover:underline font-medium">
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{member.email}</td>
                    <td className="px-4 py-3 text-gray-700">{member.userType ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.blocked ? 'Blocked' : 'Active'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {staffTotal > STAFF_PAGE_SIZE && <Pagination page={staffPage} pageSize={STAFF_PAGE_SIZE} totalCount={staffTotal} onPageChange={setStaffPage} />}
      </section>
    </div>
  );
}
