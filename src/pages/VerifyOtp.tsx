import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, MailCheckIcon } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthAlert, AuthHeader, AuthSubmitButton } from '../components/auth/AuthFields';
import { useAuth } from '../context/AuthContext';

// Matches the server's resend cooldown; the server enforces it regardless of this timer.
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyOtp() {
  const { verifyOtp, resendOtp, pendingChallengeToken, pendingEmail } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!pendingChallengeToken) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await verifyOtp(code);
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);

    try {
      await resendOtp();
      setCode('');
      setNotice('A new code has been sent. Codes sent earlier will no longer work.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon={MailCheckIcon}
        title="Verify your identity"
        subtitle={
          <>
            Enter the 6-digit code sent to your email
            {pendingEmail ? (
              <>
                {' '}and phone on file for <span className="font-medium text-gray-700">{pendingEmail}</span>.
              </>
            ) : (
              ' and phone on file.'
            )}
          </>
        }
      />

      {error && <AuthAlert>{error}</AuthAlert>}
      {notice && <AuthAlert tone="success">{notice}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-gray-700">
            Verification code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50/70 text-center font-heading text-xl tracking-[0.5em] text-gray-900 placeholder:text-gray-300 outline-none transition-all hover:border-gray-300 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            autoFocus
            required
          />
        </div>

        <div className="pt-2">
          <AuthSubmitButton loading={loading} disabled={code.length !== 6} loadingLabel="Verifying...">
            Verify &amp; continue
          </AuthSubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Didn't get the code?{' '}
        {resendCooldown > 0 ? (
          <span className="text-gray-400">Resend in {resendCooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-medium text-primary transition-colors hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? 'Sending...' : 'Resend code'}
          </button>
        )}
      </p>
      <p className="mt-2 text-center text-xs text-gray-400">The code expires in 5 minutes.</p>

      <Link
        to="/login"
        state={{ email: pendingEmail ?? '' }}
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeftIcon size={16} />
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
