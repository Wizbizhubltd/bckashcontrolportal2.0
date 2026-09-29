import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircle2Icon, LoaderIcon, RefreshCwIcon } from 'lucide-react';
import { pendingActionsApi, timeAgo, type PendingActions } from '../../api/pendingActionsApi';

/**
 * Everything waiting on a super admin's approval, grouped by kind, newest first — deletion and edit
 * requests, high-risk clients, staff and clients pending approval, and loan applications.
 */
export function PendingActionsPage() {
  const [data, setData] = useState<PendingActions | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      setData(await pendingActionsApi.list());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-gray-900">Pending actions</h2>
          <p className="text-sm text-gray-500">Requests waiting on your approval. Each drops off as soon as it's dealt with.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCwIcon size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {failed ? (
        <p className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">Couldn't load the pending actions.</p>
      ) : data === null ? (
        <div className="flex justify-center py-16 text-gray-400">
          <LoaderIcon size={20} className="animate-spin" />
        </div>
      ) : data.groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white py-16 text-center">
          <CheckCircle2Icon size={32} className="text-emerald-500" />
          <p className="font-heading font-bold text-gray-800">All caught up</p>
          <p className="text-sm text-gray-500">Nothing is waiting on your approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {data.groups.map((group) => (
            <section key={group.key} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <h3 className="font-heading text-sm font-bold text-gray-800">
                  {group.title}
                  <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{group.count}</span>
                </h3>
                <Link to={group.link} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Open list <ArrowRightIcon size={12} />
                </Link>
              </div>
              <ul className="divide-y divide-gray-50">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link to={item.link} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900">{item.title}</span>
                        {item.detail && <span className="block truncate text-xs text-gray-500">{item.detail}</span>}
                      </span>
                      <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(item.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {group.count > group.items.length && (
                <Link to={group.link} className="block border-t border-gray-50 px-5 py-2 text-xs font-medium text-primary hover:bg-gray-50">
                  {group.count - group.items.length} more — open the list
                </Link>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
