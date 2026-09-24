import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircleIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, LoaderIcon, LockKeyholeIcon, type LucideIcon } from 'lucide-react';

const INPUT_CLASS =
  'w-full h-12 rounded-xl border border-gray-200 bg-gray-50/70 pl-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all hover:border-gray-300 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10';

type AuthTextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  labelAction?: ReactNode;
};

export function AuthTextInput({ id, label, icon: Icon, labelAction, className = '', ...inputProps }: AuthTextInputProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input id={id} className={`${INPUT_CLASS} pr-4 ${className}`} {...inputProps} />
      </div>
    </div>
  );
}

type AuthPasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string;
  label: string;
  labelAction?: ReactNode;
};

/** Password field with an eye toggle to reveal what's been typed. */
export function AuthPasswordInput({ id, label, labelAction, ...inputProps }: AuthPasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <LockKeyholeIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input id={id} type={visible ? 'text' : 'password'} className={`${INPUT_CLASS} pr-12`} {...inputProps} />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
    </div>
  );
}

export function AuthAlert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const styles =
    tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-primary-200 bg-primary-50 text-primary-700';
  const Icon = tone === 'error' ? AlertCircleIcon : CheckCircle2Icon;

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-6 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${styles}`}>
      <Icon size={18} className="mt-px flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}

type AuthSubmitButtonProps = {
  loading: boolean;
  disabled?: boolean;
  loadingLabel: string;
  children: ReactNode;
};

export function AuthSubmitButton({ loading, disabled, loadingLabel, children }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-heading text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-[#e64a19] hover:shadow-accent/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
    >
      {loading ? (
        <>
          <LoaderIcon size={18} className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthHeader({ icon: Icon, title, subtitle }: { icon?: LucideIcon; title: string; subtitle: ReactNode }) {
  return (
    <div className="mb-8">
      {Icon && (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary ring-1 ring-primary-100">
          <Icon size={22} />
        </div>
      )}
      <h2 className="font-heading text-[1.75rem] font-bold tracking-tight text-gray-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{subtitle}</p>
    </div>
  );
}
