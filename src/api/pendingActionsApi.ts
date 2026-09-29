import apiClient from './apiClient';

/** One pending item and where it opens in this portal. */
export interface PendingActionItem {
  id: number;
  title: string;
  detail: string | null;
  link: string;
  createdAt: string | null;
}

/** One kind of pending item: the newest few, the full count, and the list page they're all on. */
export interface PendingActionGroup {
  key: string;
  title: string;
  link: string;
  count: number;
  items: PendingActionItem[];
}

export interface PendingActions {
  total: number;
  groups: PendingActionGroup[];
}

/**
 * The super admin's to-do list — requests and records waiting on an approval. Read live from the
 * records, so an item drops off as soon as anyone deals with it.
 */
export const pendingActionsApi = {
  async summary(): Promise<number> {
    return (await apiClient.get<{ total: number }>('/pending-actions/summary')).data.total;
  },

  async list(): Promise<PendingActions> {
    return (await apiClient.get<PendingActions>('/pending-actions')).data;
  },
};

export function timeAgo(value: string | null): string {
  if (!value) return '';
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
