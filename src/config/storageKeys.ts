// Centralized so the access/refresh token keys are only ever spelled out once — apiClient's
// request interceptor and AuthContext both need them and previously (in BCKashWebClient) each
// redeclared the same string constant.
export const ACCESS_TOKEN_KEY = 'bckashControlAccessToken';
export const REFRESH_TOKEN_KEY = 'bckashControlRefreshToken';
export const USER_DATA_KEY = 'bckashControlUserData';

// sessionStorage, not localStorage: a pending OTP challenge is only meaningful for the tab that
// requested it, and should not silently resurrect itself in an unrelated future session.
export const PENDING_CHALLENGE_KEY = 'bckashControlPendingOtpChallenge';
export const PENDING_EMAIL_KEY = 'bckashControlPendingOtpEmail';

// localStorage: one stable id per browser, sent when completing a sign-in. The API allows one
// signed-in device per user, so signing in elsewhere signs this browser out.
export const DEVICE_ID_KEY = 'bckashControlDeviceId';

// sessionStorage: why the user was just sent back to the login screen, shown there once.
export const SIGNED_OUT_REASON_KEY = 'bckashControlSignedOutReason';
