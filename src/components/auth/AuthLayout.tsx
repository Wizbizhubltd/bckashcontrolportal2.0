import type { ReactNode } from 'react';
import { FileClockIcon, LineChartIcon, LockKeyholeIcon, ShieldCheckIcon } from 'lucide-react';
import { Logo } from '../Logo';

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: 'Enterprise-grade security',
    description: 'Two-step verification on every sign-in, with sessions you can revoke at any time.',
  },
  {
    icon: LineChartIcon,
    title: 'Real-time portfolio visibility',
    description: 'Loans, repayments and arrears across every office, as they happen.',
  },
  {
    icon: FileClockIcon,
    title: 'Complete audit trail',
    description: 'Every approval and change is recorded against the operator who made it.',
  },
];

// Faint grid, faded out toward the edges so it reads as texture rather than a pattern.
const GRID_STYLE = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
  backgroundSize: '44px 44px',
  maskImage: 'radial-gradient(ellipse at 30% 35%, black 20%, transparent 75%)',
  WebkitMaskImage: 'radial-gradient(ellipse at 30% 35%, black 20%, transparent 75%)',
};

/** Split-screen shell shared by the sign-in, OTP and password-reset screens. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex font-body bg-white">
      <aside className="relative hidden lg:flex lg:w-[46%] xl:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-500 via-primary-800 to-primary-950 p-12 xl:p-16 text-white">
        <div className="pointer-events-none absolute inset-0" style={GRID_STYLE} aria-hidden />
        <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-primary-300/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-24 right-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/10">
            <img src="/bckashiconNew.png" alt="" className="h-7 w-7 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="font-heading text-lg font-bold tracking-tight">BCKash</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-200">Control Portal</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Super admin console
          </span>
          <h1 className="mt-6 font-heading text-4xl xl:text-[2.75rem] font-bold leading-[1.15] tracking-tight">
            Run your entire lending network from one secure console.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-primary-100/80">
            Oversee offices, staff, clients and loans with the controls and accountability a regulated lender needs.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 backdrop-blur">
                  <Icon size={18} className="text-primary-100" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-primary-100/70">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-primary-100/60">
          <p>&copy; {new Date().getFullYear()} BCKash. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <LockKeyholeIcon size={12} />
            Authorized personnel only
          </p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-white">
        <div className="flex items-center px-6 pt-6 sm:px-10 lg:hidden">
          <Logo width={120} height={40} />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <p className="px-6 pb-6 text-center text-xs text-gray-400 sm:px-10">
          Access is monitored and logged. Unauthorized use is prohibited.
        </p>
      </main>
    </div>
  );
}
