import type { LucideIcon } from 'lucide-react';
import { Building2Icon, LandmarkIcon, ShieldCheckIcon, BellIcon, UserPlusIcon, ReceiptIcon } from 'lucide-react';

/**
 * Which stored settings (legacy `settings` table keys) each Settings tab edits, and how. Groups
 * without `enforced: true` are stored only — the API doesn't act on them yet, and the page says so.
 * Enforced so far: Company profile (validated on save; used in every email and SMS the API sends).
 */

export type SettingFieldType = 'toggle' | 'number' | 'text' | 'secret' | 'textarea' | 'select';

export interface SettingField {
  key: string;
  label: string;
  help?: string;
  type: SettingFieldType;
  options?: { label: string; value: string }[];
  /** Shown after a number input, e.g. "days". */
  unit?: string;
  /** For a single enforced field in a group that otherwise isn't — the badge then shows per field. */
  enforced?: boolean;
}

export interface SettingGroup {
  title: string;
  description?: string;
  fields: SettingField[];
  /** Starts collapsed — used for long message templates. */
  collapsible?: boolean;
  enforced?: boolean;
}

export type SettingsTabKey = 'organisation' | 'loan' | 'fees' | 'rbac' | 'notifications' | 'onboarding';

export interface SettingsTab {
  key: SettingsTabKey;
  label: string;
  icon: LucideIcon;
  description: string;
  groups: SettingGroup[];
}

/** Legacy toggles are stored as "1"/"0"; some older rows use "true". */
export const isOn = (value: string | null | undefined) => value === '1' || value?.toLowerCase() === 'true';

const PLACEHOLDER_HELP = 'Placeholders such as {clientName}, {loanNumber} and {paymentAmount} are filled in when the message is sent.';

function templateGroup(title: string, prefix: { subject?: string; email?: string; sms?: string }): SettingGroup {
  const fields: SettingField[] = [];
  if (prefix.subject) fields.push({ key: prefix.subject, label: 'Email subject', type: 'text' });
  if (prefix.email) fields.push({ key: prefix.email, label: 'Email message', type: 'textarea', help: PLACEHOLDER_HELP });
  if (prefix.sms) fields.push({ key: prefix.sms, label: 'SMS message', type: 'textarea', help: 'Keep SMS messages short — long ones are split and billed as several messages.' });
  return { title, fields, collapsible: true };
}

export const SETTINGS_TABS: SettingsTab[] = [
  {
    key: 'organisation',
    label: 'Organisation',
    icon: Building2Icon,
    description: 'Company profile, how money is displayed, and the office structure.',
    groups: [
      {
        title: 'Company profile',
        description: 'How the system names your organisation in every email and SMS it sends — sign-in codes, password resets and staff account emails. Changes apply to the next message.',
        enforced: true,
        fields: [
          { key: 'company_name', label: 'Company name', type: 'text', help: 'Required. Used in message wording and as the email sender name.' },
          { key: 'company_email', label: 'Contact email', type: 'text', help: 'Replies to system emails go here, and it appears in the email sign-off.' },
          { key: 'company_website', label: 'Website', type: 'text', help: 'A full address, e.g. https://example.com. Appears in the email sign-off.' },
          { key: 'portal_address', label: 'Portal address', type: 'text', help: 'A full address, e.g. https://portal.example.com. Staff account emails link to it.' },
          { key: 'company_address', label: 'Head office address', type: 'textarea', help: 'Appears in the email sign-off.' },
        ],
      },
      {
        title: 'Currency display',
        description: 'How every amount is shown in both portals and in the SMS and emails the system sends.',
        enforced: true,
        fields: [
          { key: 'currency_symbol', label: 'Currency symbol', type: 'text', help: 'Up to 5 characters, e.g. ₦ or NGN. A symbol longer than one character is spaced from the amount (NGN 1,000).' },
          {
            key: 'currency_position',
            label: 'Symbol position',
            type: 'select',
            options: [
              { label: 'Before the amount (₦1,000)', value: 'left' },
              { label: 'After the amount (1,000₦)', value: 'right' },
            ],
          },
        ],
      },
      {
        title: 'Features',
        fields: [{ key: 'enable_custom_fields', label: 'Custom fields', help: 'Let staff capture extra, organisation-defined fields on records.', type: 'toggle' }],
      },
    ],
  },
  {
    key: 'loan',
    label: 'Loan',
    icon: LandmarkIcon,
    description: 'Loan products and the rules for overdue loans and applications.',
    groups: [
      {
        title: 'Overdue & penalty rules',
        description: 'When a repayment or a loan officially counts as overdue — used by the dashboard and the Late Loans list — and whether the penalties in Fees & Payments are charged automatically.',
        enforced: true,
        fields: [
          {
            key: 'auto_overdue_repayment_days',
            label: 'Repayment overdue after',
            help: 'Days after an instalment’s due date before it counts as late. Also the grace period for late repayment fees that don’t set their own.',
            type: 'number',
            unit: 'days',
          },
          {
            key: 'auto_overdue_loan_days',
            label: 'Loan in default after',
            help: 'Days after the final repayment date before a loan counts as defaulted. Also the grace period for default penalties that don’t set their own.',
            type: 'number',
            unit: 'days',
          },
          {
            key: 'auto_apply_penalty',
            label: 'Apply penalties automatically',
            help: 'Once a day, charge the active late repayment and default penalties onto overdue loans — respecting each penalty’s grace, repeat and cap. Not retroactive: only penalties falling due from now on are charged (a missed day is caught up within a week). Penalties are added to the instalment, so the next repayment collects them, and can be waived.',
            type: 'toggle',
          },
        ],
      },
      {
        title: 'Office funding',
        description: 'Each office lends from its own funds — funding sent by a super admin and acknowledged by the office’s branch manager (Offices → an office → Business operations).',
        enforced: true,
        fields: [
          {
            key: 'loan_requires_office_funds',
            label: 'Loans draw on office funds',
            help: 'When on, an application can only be approved if its office has enough available funds (after loans already approved), and disbursing deducts from the office’s balance. Fund your offices before switching this on — offices with no funds can’t approve or disburse loans.',
            type: 'toggle',
          },
        ],
      },
      {
        title: 'Applications',
        fields: [{ key: 'allow_client_apply', label: 'Customers can apply online', help: 'Let customers submit loan applications themselves from the customer portal.', type: 'toggle' }],
      },
    ],
  },
  {
    key: 'fees',
    label: 'Fees & Payments',
    icon: ReceiptIcon,
    description: 'The fees customers pay at loan, customer, group and savings level, and the penalties for late repayment, default and early closure.',
    // Managed as records (the `charges` table), not key/value settings — see FeesSection.
    groups: [],
  },
  {
    key: 'rbac',
    label: 'Roles & Access',
    icon: ShieldCheckIcon,
    description: 'Who can do what, and how staff sign in.',
    groups: [
      {
        title: 'Sign-in protection',
        description: 'A reCAPTCHA check on the sign-in page to stop automated password guessing.',
        fields: [
          { key: 'enable_google_recaptcha', label: 'Require reCAPTCHA at sign-in', type: 'toggle' },
          { key: 'google_recaptcha_site_key', label: 'reCAPTCHA site key', type: 'text' },
          { key: 'google_recaptcha_secret_key', label: 'reCAPTCHA secret key', type: 'secret' },
        ],
      },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: BellIcon,
    description: 'Which messages customers get automatically, and what they say.',
    groups: [
      {
        title: 'Channels',
        fields: [{ key: 'sms_enabled', label: 'SMS sending', help: 'Master switch — when off, no SMS is sent, whatever the settings below say.', type: 'toggle' }],
      },
      {
        title: 'Loan messages',
        fields: [
          {
            key: 'loan_raised_client_code',
            label: 'Loan raised — client confirmation code',
            help: 'When staff raise a loan for a customer, the customer gets a code by SMS and email naming the staff member, product and amount. The application can only be submitted with that code, so no loan is raised without the customer’s agreement. Doesn’t apply to group loans.',
            type: 'toggle',
            enforced: true,
          },
          { key: 'loan_approved_auto_email', label: 'Loan approved — email', type: 'toggle' },
          { key: 'loan_approved_auto_sms', label: 'Loan approved — SMS', type: 'toggle' },
          { key: 'loan_disbursed_auto_email', label: 'Loan disbursed — email', type: 'toggle' },
          { key: 'loan_disbursed_auto_sms', label: 'Loan disbursed — SMS', type: 'toggle' },
        ],
      },
      {
        title: 'Repayment messages',
        fields: [
          { key: 'auto_payment_receipt_email', label: 'Payment receipt — email', type: 'toggle' },
          { key: 'auto_payment_receipt_sms', label: 'Payment receipt — SMS', type: 'toggle' },
          { key: 'auto_repayment_email_reminder', label: 'Upcoming repayment reminder — email', type: 'toggle' },
          { key: 'auto_repayment_sms_reminder', label: 'Upcoming repayment reminder — SMS', type: 'toggle' },
          { key: 'auto_repayment_days', label: 'Send the reminder', help: 'How many days before the due date.', type: 'number', unit: 'days before' },
          { key: 'auto_overdue_repayment_email_reminder', label: 'Missed repayment — email', type: 'toggle' },
          { key: 'auto_overdue_repayment_sms_reminder', label: 'Missed repayment — SMS', type: 'toggle' },
          { key: 'auto_overdue_loan_email_reminder', label: 'Loan overdue — email', type: 'toggle' },
          { key: 'auto_overdue_loan_sms_reminder', label: 'Loan overdue — SMS', type: 'toggle' },
        ],
      },
      templateGroup('Template: loan approved', { subject: 'loan_approved_email_subject', email: 'loan_approved_email_template', sms: 'loan_approved_sms_template' }),
      templateGroup('Template: loan disbursed', { subject: 'loan_disbursed_email_subject', email: 'loan_disbursed_email_template', sms: 'loan_disbursed_sms_template' }),
      templateGroup('Template: payment received', { subject: 'payment_received_email_subject', email: 'payment_received_email_template', sms: 'payment_received_sms_template' }),
      templateGroup('Template: upcoming repayment reminder', { subject: 'loan_payment_reminder_subject', email: 'loan_payment_reminder_email_template', sms: 'loan_payment_reminder_sms_template' }),
      templateGroup('Template: missed repayment', { subject: 'missed_payment_email_subject', email: 'missed_payment_email_template', sms: 'missed_payment_sms_template' }),
      templateGroup('Template: loan overdue', { subject: 'loan_overdue_email_subject', email: 'loan_overdue_email_template', sms: 'loan_overdue_sms_template' }),
    ],
  },
  {
    key: 'onboarding',
    label: 'Customer Onboarding',
    icon: UserPlusIcon,
    description: 'How customers join, and what they receive when they do.',
    groups: [
      {
        title: 'Registration',
        fields: [{ key: 'allow_self_registration', label: 'Customers can sign up themselves', help: 'When off, only staff can create customer records.', type: 'toggle' }],
      },
      templateGroup('Template: customer login details', { subject: 'login_details_email_subject', email: 'login_details_email_template' }),
      templateGroup('Template: customer statement', { subject: 'client_statement_email_subject', email: 'client_statement_email_template' }),
    ],
  },
];

/** Every toggle on the Notifications tab that sends a message automatically (the SMS master switch excluded). */
export const AUTO_NOTIFICATION_KEYS = (SETTINGS_TABS.find((t) => t.key === 'notifications')?.groups ?? [])
  .flatMap((g) => g.fields)
  .filter((f) => f.type === 'toggle' && f.key !== 'sms_enabled')
  .map((f) => f.key);
