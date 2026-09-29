import { XIcon } from 'lucide-react';
import type { BulkActionResult } from '../api/types';

/**
 * What a bulk action did: how many records it changed, and each one it skipped with the reason.
 * <paramref name="done"/> finishes the sentence "N staff members …", e.g. "were disabled".
 */
export function BulkResultModal({
  title,
  result,
  done,
  noun,
  onClose,
}: {
  title: string;
  result: BulkActionResult;
  done: string;
  /** Counts the records, e.g. (n) => `${n} client${n === 1 ? '' : 's'}`. */
  noun: (count: number) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <XIcon size={18} />
        </button>
        <h3 className="text-lg font-heading font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">
          {result.succeeded === 0 ? 'Nothing was changed.' : `${noun(result.succeeded)} ${done}.`}
          {result.skipped.length > 0 && ` ${noun(result.skipped.length)} skipped:`}
        </p>
        {result.skipped.length > 0 && (
          <ul className="mt-3 max-h-72 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
            {result.skipped.map((skip) => (
              <li key={skip.id} className="flex items-start justify-between gap-4 px-3 py-2">
                <span className="font-medium text-gray-700">{skip.name}</span>
                <span className="text-right text-gray-500">{skip.reason}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold rounded-lg bg-primary text-white hover:bg-primary/90">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
