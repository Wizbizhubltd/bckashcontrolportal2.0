import { CheckSquareIcon, LayersIcon, XIcon } from 'lucide-react';

export interface BulkActionOption<Action extends string> {
  value: Action;
  label: string;
}

/** The "Bulk actions" picker shown above a list. Picking an action turns on the row checkboxes. */
export function BulkActionMenu<Action extends string>({
  options,
  onChoose,
  disabled,
}: {
  options: BulkActionOption<Action>[];
  onChoose: (action: Action) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <LayersIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <select
        aria-label="Bulk actions"
        value=""
        disabled={disabled}
        onChange={(e) => e.target.value && onChoose(e.target.value as Action)}
        className="pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-60"
      >
        <option value="">Bulk actions…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Shown while a bulk action is in progress: what's being done, how many rows are ticked, and the
 * buttons to tick everything shown, carry the action out, or back out.
 */
export function BulkSelectionBar({
  actionLabel,
  selectedCount,
  totalCount,
  noun,
  onSelectAll,
  onClear,
  onContinue,
  onCancel,
  selectAllLabel,
  allSelected,
}: {
  actionLabel: string;
  selectedCount: number;
  totalCount: number;
  /** Plural noun for the rows, e.g. "offices". */
  noun: string;
  onSelectAll: () => void;
  onClear: () => void;
  onContinue: () => void;
  onCancel: () => void;
  /** Overrides "Select all {totalCount}", e.g. when a paged list can only tick what's on screen. */
  selectAllLabel?: string;
  /** Whether everything "select all" covers is ticked; defaults to every row being ticked. */
  allSelected?: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <CheckSquareIcon size={16} className="text-primary" />
      <span className="font-heading font-bold text-primary">{actionLabel}</span>
      <span className="text-gray-600">
        {selectedCount} of {totalCount} {noun} selected
      </span>
      {!(allSelected ?? selectedCount >= totalCount) ? (
        <button type="button" onClick={onSelectAll} className="text-primary hover:underline">
          {selectAllLabel ?? `Select all ${totalCount}`}
        </button>
      ) : (
        <button type="button" onClick={onClear} className="text-primary hover:underline">
          Clear selection
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-white">
          <XIcon size={14} />
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedCount === 0}
          className="px-4 py-1.5 rounded-lg bg-accent text-white font-heading font-bold hover:bg-[#e64a19] disabled:opacity-50"
        >
          {actionLabel} ({selectedCount})
        </button>
      </div>
    </div>
  );
}

/** A row or header checkbox for bulk selection. Clicks don't reach the row, so ticking never opens the record. */
export function BulkCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked;
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}
