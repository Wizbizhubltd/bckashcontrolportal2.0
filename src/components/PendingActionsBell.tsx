import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BellIcon, LoaderIcon } from 'lucide-react';
import { pendingActionsApi, timeAgo, type PendingActions } from '../api/pendingActionsApi';

const REFRESH_MS = 60_000;

/**
 * The top bar's bell: how many requests are waiting on a super admin's approval, and the newest of
 * each kind behind it. Items stay counted until someone deals with them.
 */
export function PendingActionsBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PendingActions | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    pendingActionsApi
      .summary()
      .then(setCount)
      .catch(() => undefined);
  }, []);

  // On load, every minute, and whenever the page changes — acting on an item usually means navigating.
  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    setOpen(false);
  }, [location.pathname, refreshCount]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    pendingActionsApi
      .list()
      .then((result) => {
        setData(result);
        setCount(result.total);
      })
      .catch(() => setData({ total: 0, groups: [] }));

    const close = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-primary"
        aria-label={count > 0 ? `${count} request${count === 1 ? '' : 's'} pending approval` : 'Notifications'}
      >
        <BellIcon size={20} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-heading text-sm font-bold text-gray-800">Pending approvals</h2>
            <Link to="/pending-actions" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {data === null ? (
              <div className="flex justify-center py-8 text-gray-400">
                <LoaderIcon size={18} className="animate-spin" />
              </div>
            ) : data.groups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Nothing is waiting on you.</p>
            ) : (
              data.groups.map((group) => (
                <div key={group.key}>
                  <p className="flex justify-between bg-gray-50 px-4 py-1.5 text-[11px] font-heading font-bold uppercase tracking-widest text-gray-400">
                    <span>{group.title}</span>
                    <span>{group.count}</span>
                  </p>
                  <ul className="divide-y divide-gray-50">
                    {group.items.slice(0, 3).map((item) => (
                      <li key={`${group.key}-${item.id}`}>
                        <button onClick={() => navigate(item.link)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-gray-50">
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">{item.title}</span>
                            {item.detail && <span className="mt-0.5 block truncate text-xs text-gray-500">{item.detail}</span>}
                            <span className="mt-1 block text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {group.count > 3 && (
                    <Link to={group.link} className="block px-4 py-2 text-xs font-medium text-primary hover:bg-gray-50">
                      See all {group.count}
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
