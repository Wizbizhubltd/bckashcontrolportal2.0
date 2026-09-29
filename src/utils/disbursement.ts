/** How a loan is paid out — chosen when it's raised in the office portal. A bank transfer also records the account it goes to. */
export type DisbursementMode = 'CashPickup' | 'ChequePickup' | 'BankTransfer';

const LABELS: Record<DisbursementMode, string> = {
  CashPickup: 'Cash pickup',
  ChequePickup: 'Cheque pickup',
  BankTransfer: 'Bank transfer',
};

export const disbursementModeLabel = (mode: DisbursementMode | null | undefined): string => (mode ? LABELS[mode] : 'Not recorded');

/** "Ada Obi · 0123456789 · Access Bank" for a bank transfer; null otherwise. */
export function payInto(details: { disbursementMode: DisbursementMode | null; disbursementAccountName: string | null; disbursementAccountNumber: string | null; disbursementBankName: string | null }): string | null {
  if (details.disbursementMode !== 'BankTransfer') return null;
  return [details.disbursementAccountName, details.disbursementAccountNumber, details.disbursementBankName].map((v) => v || '—').join(' · ');
}
