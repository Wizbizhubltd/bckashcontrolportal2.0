import type { Charge, ChargeOption, ChargeProduct, ChargeType } from '../../api/chargesApi';
import { formatMoney } from '../../utils/money';

/**
 * Plain-language labels and the allowed combinations for fees and penalties. The allowed
 * combinations mirror the server's ChargeRules / ChargeValidationRules (the server re-checks
 * everything); they're repeated here only so the form never offers a choice that would be refused.
 */

export type Lifecycle = 'One-time' | 'Recurring' | 'Per transaction' | 'When triggered';

interface TypeInfo {
  label: string;
  lifecycle: Lifecycle;
  /** When it's charged, in a sentence. */
  when: string;
  products: ChargeProduct[];
  penalty?: boolean;
}

export const CHARGE_TYPES: Record<ChargeType, TypeInfo> = {
  Disbursement: { label: 'Upfront fee', lifecycle: 'One-time', when: 'Charged once, when the loan is disbursed — e.g. a processing or insurance fee.', products: ['Loan'] },
  DisbursementRepayment: { label: 'Upfront fee, paid in instalments', lifecycle: 'Recurring', when: 'Set at disbursement and collected in equal parts with each repayment.', products: ['Loan'] },
  InstallmentFee: { label: 'Fee on every instalment', lifecycle: 'Recurring', when: 'Added to every instalment for the life of the loan.', products: ['Loan'] },
  SpecifiedDueDate: { label: 'Fee on a set date', lifecycle: 'One-time', when: 'Charged once, on a date chosen when it’s attached to a loan.', products: ['Loan'] },
  LoanReschedulingFee: { label: 'Rescheduling fee', lifecycle: 'When triggered', when: 'Charged each time the loan’s schedule is restructured.', products: ['Loan'] },
  OverdueInstallmentFee: { label: 'Late repayment fee', lifecycle: 'When triggered', when: 'Charged when an instalment isn’t paid by its due date (after any grace days).', products: ['Loan'], penalty: true },
  OverdueMaturity: { label: 'Loan default penalty', lifecycle: 'When triggered', when: 'Charged when the loan is still unpaid after its final repayment date (after any grace days).', products: ['Loan'], penalty: true },
  EarlyRepayment: { label: 'Early closure fee', lifecycle: 'When triggered', when: 'Charged when the borrower pays the loan off before the schedule ends.', products: ['Loan'], penalty: true },
  Activation: { label: 'Registration fee', lifecycle: 'One-time', when: 'Charged once, when the customer or group joins.', products: ['Client', 'Group'] },
  MonthlyFee: { label: 'Monthly fee', lifecycle: 'Recurring', when: 'Charged every month — membership dues or account maintenance.', products: ['Client', 'Group', 'Savings'] },
  AnnualFee: { label: 'Annual fee', lifecycle: 'Recurring', when: 'Charged every year — membership dues or account maintenance.', products: ['Client', 'Group', 'Savings'] },
  SavingsActivation: { label: 'Account opening fee', lifecycle: 'One-time', when: 'Charged once, when the savings account is opened.', products: ['Savings'] },
  WithdrawalFee: { label: 'Withdrawal fee', lifecycle: 'Per transaction', when: 'Charged on every withdrawal.', products: ['Savings'] },
  SharesPurchase: { label: 'Share purchase fee', lifecycle: 'Per transaction', when: 'Charged on every share purchase.', products: ['Shares'] },
  SharesRedeem: { label: 'Share redemption fee', lifecycle: 'Per transaction', when: 'Charged on every share redemption.', products: ['Shares'] },
};

export const PRODUCT_LABELS: Record<ChargeProduct, string> = {
  Loan: 'Loan',
  Client: 'Customer',
  Group: 'Group',
  Savings: 'Savings',
  Shares: 'Shares',
};

/** Levels a new fee can be created at (Shares exists in legacy data only). */
export const FEE_LEVELS: ChargeProduct[] = ['Loan', 'Client', 'Group', 'Savings'];

/** What a percentage is taken of. */
export const BASE_LABELS: Record<Exclude<ChargeOption, 'Flat'>, string> = {
  Percentage: 'the transaction amount',
  OriginalPrincipal: 'the amount disbursed',
  InstallmentPrincipalDue: 'the instalment’s principal',
  InstallmentInterestDue: 'the instalment’s interest',
  InstallmentPrincipalInterestDue: 'the instalment (principal + interest)',
  InstallmentTotalDue: 'the whole instalment (incl. fees)',
  PrincipalDue: 'the principal still owed',
  InterestDue: 'the interest due',
  TotalDue: 'everything currently due',
  TotalOutstanding: 'the total balance still owed',
};

const INSTALLMENT_BASES: ChargeOption[] = ['InstallmentPrincipalDue', 'InstallmentPrincipalInterestDue', 'InstallmentInterestDue', 'InstallmentTotalDue'];

const LOAN_OPTIONS: Partial<Record<ChargeType, ChargeOption[]>> = {
  Disbursement: ['Flat', 'OriginalPrincipal'],
  DisbursementRepayment: ['Flat', 'OriginalPrincipal'],
  SpecifiedDueDate: ['Flat', 'OriginalPrincipal', 'TotalOutstanding'],
  InstallmentFee: ['Flat', 'OriginalPrincipal', ...INSTALLMENT_BASES],
  LoanReschedulingFee: ['Flat', 'OriginalPrincipal', 'PrincipalDue', 'TotalOutstanding'],
  OverdueInstallmentFee: ['Flat', ...INSTALLMENT_BASES],
  OverdueMaturity: ['Flat', 'PrincipalDue', 'TotalDue', 'TotalOutstanding'],
  EarlyRepayment: ['Flat', 'PrincipalDue', 'TotalOutstanding'],
};

export function allowedOptions(type: ChargeType, product: ChargeProduct): ChargeOption[] {
  if (product === 'Loan') return LOAN_OPTIONS[type] ?? ['Flat'];
  if (product === 'Client' || product === 'Group') return ['Flat'];
  return ['Flat', 'Percentage'];
}

export const PENALTY_TYPES: ChargeType[] = ['OverdueInstallmentFee', 'OverdueMaturity', 'EarlyRepayment'];
export const LATENESS_TYPES: ChargeType[] = ['OverdueInstallmentFee', 'OverdueMaturity'];

export function typesFor(product: ChargeProduct, penalty: boolean): ChargeType[] {
  return (Object.keys(CHARGE_TYPES) as ChargeType[]).filter((t) => CHARGE_TYPES[t].products.includes(product) && !!CHARGE_TYPES[t].penalty === penalty);
}

/** Credit-risk guidance shown next to each penalty. */
export const PENALTY_GUIDANCE: Partial<Record<ChargeType, string>> = {
  OverdueInstallmentFee:
    'Base the fee on the missed instalment, never the whole loan, so a small miss isn’t punished out of proportion. A few grace days absorb bank transfer delays and avoid penalising borrowers who pay a day late. If it repeats, cap the total.',
  OverdueMaturity:
    'This applies once the loan is past its final date — usually after collections have started. Base it on what’s still owed, give a grace period to allow a settlement, and always cap it: penalties that keep growing rarely get paid and raise disputes.',
  EarlyRepayment:
    'Early repayment lowers credit risk, so keep this modest — it only needs to recover the interest income you expected. A common approach is to drop it once the loan is well advanced, using “No fee after N instalments”.',
};

/** A fee's rule in one sentence, e.g. "5% of the instalment (principal + interest), after 3 days' grace, again every 30 days, capped at 10% of the amount disbursed". */
export function describeCharge(c: Pick<Charge, 'chargeOption' | 'amount' | 'minimumAmount' | 'maximumAmount' | 'graceDays' | 'repeatEveryDays' | 'maxTotalPercent' | 'freeAfterInstallments'>): string {
  if (c.amount == null) return '—';
  const parts: string[] = [];
  if (c.chargeOption === 'Flat') {
    parts.push(formatMoney(c.amount));
  } else {
    let pct = `${c.amount}% of ${BASE_LABELS[c.chargeOption]}`;
    if (c.minimumAmount != null && c.maximumAmount != null) pct += ` (${formatMoney(c.minimumAmount)}–${formatMoney(c.maximumAmount)})`;
    else if (c.minimumAmount != null) pct += ` (at least ${formatMoney(c.minimumAmount)})`;
    else if (c.maximumAmount != null) pct += ` (at most ${formatMoney(c.maximumAmount)})`;
    parts.push(pct);
  }
  if (c.graceDays) parts.push(`after ${c.graceDays} day${c.graceDays === 1 ? '' : 's'}’ grace`);
  if (c.repeatEveryDays) parts.push(`again every ${c.repeatEveryDays} day${c.repeatEveryDays === 1 ? '' : 's'} while unpaid`);
  if (c.maxTotalPercent != null) parts.push(`capped at ${c.maxTotalPercent}% of the amount disbursed`);
  if (c.freeAfterInstallments) parts.push(`none once ${c.freeAfterInstallments} instalment${c.freeAfterInstallments === 1 ? ' is' : 's are'} paid`);
  return parts.join(', ');
}
