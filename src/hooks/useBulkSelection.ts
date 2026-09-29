import { useState } from 'react';

/**
 * State for a list's bulk actions: which action is picked (choosing one turns on the row checkboxes)
 * and which rows are ticked. Clearing the action turns selection mode off again.
 */
export function useBulkSelection<Action extends string>() {
  const [action, setAction] = useState<Action | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Ticks every id given, or unticks them all if they're already all ticked. */
  const toggleAll = (ids: number[]) =>
    setSelected((prev) => {
      const allTicked = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      ids.forEach((id) => (allTicked ? next.delete(id) : next.add(id)));
      return next;
    });

  const selectOnly = (ids: number[]) => setSelected(new Set(ids));

  const start = (next: Action) => {
    setAction(next);
    setSelected(new Set());
  };

  const cancel = () => {
    setAction(null);
    setSelected(new Set());
  };

  return { action, selecting: action !== null, selected, toggle, toggleAll, selectOnly, start, cancel };
}
