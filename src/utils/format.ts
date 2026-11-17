/** "loan_officer" / "LoanOfficer" → "Loan Officer". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** "Ada Obi Nwosu" → "AO". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  return withTime
    ? date.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Reassigned by Ada Obi · 3 Nov 2026" for a client's or group's marketer — null if never reassigned. */
export function reassignedNote(byName: string | null | undefined, at: string | null | undefined): string | null {
  if (!at) return null;
  return `Reassigned${byName ? ` by ${byName}` : ''} · ${formatDate(at)}`;
}
