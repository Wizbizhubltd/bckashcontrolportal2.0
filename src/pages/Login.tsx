import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, MailIcon, ShieldCheckIcon } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthAlert, AuthHeader, AuthPasswordInput, AuthSubmitButton, AuthTextInput } from '../components/auth/AuthFields';
import { useAuth } from '../context/AuthContext';
import { SIGNED_OUT_REASON_KEY } from '../config/storageKeys';

// Read once and cleared, so the notice shows on the redirect to this page but not on later visits.
function takeSignedOutReason(): string | null {
  const reason = sessionStorage.getItem(SIGNED_OUT_REASON_KEY);
  sessionStorage.removeItem(SIGNED_OUT_REASON_KEY);
  return reason;
}

interface LoginLocationState {
  email?: string;
  passwordReset?: boolean;
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as LoginLocationState;

  const [email, setEmail] = useState(locationState.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedOutReason] = useState(takeSignedOutReason);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/verify-otp', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader title="Welcome back" subtitle="Sign in to the BCKash Control Portal to continue." />

      {locationState.passwordReset && !error && (
        <AuthAlert tone="success">Your password has been updated. Sign in with your new password.</AuthAlert>
      )}
      {signedOutReason && !error && <AuthAlert>{signedOutReason}</AuthAlert>}
      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthTextInput
          id="email"
          label="Email address"
          icon={MailIcon}
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          autoFocus={!email}
          required
        />

        <AuthPasswordInput
          id="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus={!!email}
          required
          labelAction={
            <Link
              to="/forgot-password"
              state={{ email }}
              className="text-sm font-medium text-primary transition-colors hover:text-primary-500"
            >
              Forgot password?
            </Link>
          }
        />

        <div className="pt-2">
          <AuthSubmitButton loading={loading} disabled={!email || !password} loadingLabel="Signing in...">
            Sign in
            <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
          </AuthSubmitButton>
        </div>
      </form>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <ShieldCheckIcon size={18} className="mt-0.5 flex-shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-gray-500">
          <span className="font-medium text-gray-700">Protected by two-step verification.</span> After signing in, you'll
          receive a one-time code on the email and phone linked to your account.
        </p>
      </div>
    </AuthLayout>
  );
}
