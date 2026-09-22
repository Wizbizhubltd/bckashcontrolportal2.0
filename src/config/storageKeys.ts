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
