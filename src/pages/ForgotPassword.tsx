import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon, HashIcon, KeyRoundIcon, MailIcon, MailOpenIcon, RotateCwIcon, ShieldCheckIcon, TimerIcon } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthAlert, AuthHeader, AuthPasswordInput, AuthSubmitButton, AuthTextInput } from '../components/auth/AuthFields';
import { authApi } from '../api/authApi';

type Step = 'request' | 'reset' | 'done';

// Mirrors the backend: 8-char minimum, and at most one code per account per minute.
const MIN_PASSWORD_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An error occurred. Please try again.';
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: '' };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 1, label: 'Too short' };
  if (variety <= 2) return { score: 2, label: 'Fair' };
  if (variety === 3 || password.length < 12) return { score: 3, label: 'Good' };
  return { score: 4, label: 'Strong' };
}

const STRENGTH_COLORS = ['bg-gray-200', 'bg-red-500', 'bg-amber-500', 'bg-primary-400', 'bg-primary'];

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(initialEmail);
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const strength = passwordStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canReset = code.length === 6 && newPassword.length >= MIN_PASSWORD_LENGTH && passwordsMatch;

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.forgotPassword(email.trim());
      setChallengeToken(result.challengeToken);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('reset');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);

    try {
      const result = await authApi.forgotPassword(email.trim());
      setChallengeToken(result.challengeToken);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice('A new code is on its way. Codes sent earlier will no longer work.');
    } catch (resendError) {
      setError(errorMessage(resendError));
    } finally {
      setResending(false);
    }
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await authApi.resetPassword(challengeToken, code, newPassword);
      setStep('done');
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setStep('request');
    setChallengeToken('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setNotice('');
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'request' && (
          <motion.div key="request" {...stepMotion}>
            <AuthHeader
              icon={KeyRoundIcon}
              title="Forgot your password?"
              subtitle="Enter the email address on your account and we'll send a 6-digit reset code to your email and phone on file."
            />

            {error && <AuthAlert>{error}</AuthAlert>}

            <form onSubmit={handleRequest} className="space-y-5" noValidate>
              <AuthTextInput
                id="reset-email"
                label="Email address"
                icon={MailIcon}
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                required
              />

              <div className="pt-2">
                <AuthSubmitButton loading={loading} disabled={!email.trim()} loadingLabel="Sending code...">
                  Send reset code
                </AuthSubmitButton>
              </div>
            </form>

            <BackToSignIn email={email} />
          </motion.div>
        )}

        {step === 'reset' && (
          <motion.div key="reset" {...stepMotion}>
            <AuthHeader
              icon={MailOpenIcon}
              title="Check your inbox"
              subtitle={
                <>
                  If an account exists for <span className="font-medium text-gray-700">{email.trim()}</span>, we've sent a
                  6-digit code to its email and phone. The code expires in 15 minutes.
                </>
              }
            />

            {error && <AuthAlert>{error}</AuthAlert>}
            {notice && !error && <AuthAlert tone="success">{notice}</AuthAlert>}

            <form onSubmit={handleReset} className="space-y-5" noValidate>
              <div>
                <AuthTextInput
                  id="reset-code"
                  label="Reset code"
                  icon={HashIcon}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  className="font-heading tracking-[0.4em]"
                  autoFocus
                  required
                />
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="text-gray-500">Didn't receive a code?</span>
                  {cooldown > 0 ? (
                    <span className="flex items-center gap-1.5 font-medium text-gray-500">
                      <TimerIcon size={14} />
                      Resend in <span className="tabular-nums text-gray-700">{formatCountdown(cooldown)}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary-500 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      <RotateCwIcon size={14} className={resending ? 'animate-spin' : ''} />
                      {resending ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <AuthPasswordInput
                  id="new-password"
                  label="New password"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                {newPassword && (
                  <div className="mt-2.5">
                    <div className="flex gap-1.5" aria-hidden>
                      {[1, 2, 3, 4].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1 flex-1 rounded-full transition-colors ${strength.score >= segment ? STRENGTH_COLORS[strength.score] : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Strength: <span className="font-medium text-gray-700">{strength.label}</span>
                      {strength.score < 4 && ' · mix upper and lower case, numbers and symbols for a stronger password'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <AuthPasswordInput
                  id="confirm-password"
                  label="Confirm new password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                {confirmPassword && (
                  <p className={`mt-1.5 flex items-center gap-1 text-xs ${passwordsMatch ? 'text-primary' : 'text-red-600'}`}>
                    {passwordsMatch && <CheckIcon size={14} />}
                    {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <AuthSubmitButton loading={loading} disabled={!canReset} loadingLabel="Updating password...">
                  Reset password
                </AuthSubmitButton>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button type="button" onClick={startOver} className="font-medium text-gray-500 transition-colors hover:text-gray-800">
                Use a different email
              </button>
              <Link to="/login" state={{ email: email.trim() }} className="font-medium text-primary transition-colors hover:text-primary-500">
                Back to sign in
              </Link>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" {...stepMotion}>
            <AuthHeader
              icon={ShieldCheckIcon}
              title="Password updated"
              subtitle="Your password has been changed and you've been signed out of every other session. Sign in with your new password to continue."
            />

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true, state: { email: email.trim(), passwordReset: true } })}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-accent font-heading text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-[#e64a19] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
            >
              Continue to sign in
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

function BackToSignIn({ email }: { email: string }) {
  return (
    <Link
      to="/login"
      state={{ email: email.trim() }}
      className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
    >
      <ArrowLeftIcon size={16} />
      Back to sign in
    </Link>
  );
}
