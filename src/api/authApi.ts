import axios from 'axios';
import { env } from '../config/env';
import { getDeviceId } from '../config/deviceId';

const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

// The backend also has a legacy authenticator-app (TOTP) 2FA path for any user with
// EnableGoogle2fa set — challengeType distinguishes it from the OTP path this portal supports.
// The control portal has no TOTP UI, so a "totp" challenge is treated as an error rather than
// silently posting the wrong verify endpoint.
export interface OtpChallengeResponse {
  challengeToken: string;
  challengeType: 'totp' | 'otp';
}

export interface UserData {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  user_class: string | null;
  user_type: string | null;
  mustChangePassword: boolean;
}

export interface OtpVerifyResponse {
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  userData: UserData;
}

/** An auth error carrying the API's machine-readable `reason`, when it sent one. */
export interface AuthError extends Error {
  reason?: string;
}

/** The API refuses anyone but a super admin here (other staff belong on the office portal) with this reason. */
export function isWrongPortalError(error: unknown): boolean {
  return (error as AuthError | undefined)?.reason === 'wrong_portal';
}

function toFriendlyError(error: unknown): AuthError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { title?: string; reason?: string } | undefined;
    const friendly: AuthError = new Error(data?.title || error.message);
    friendly.reason = data?.reason;
    return friendly;
  }
  return error instanceof Error ? error : new Error('Unexpected error');
}

export const authApi = {
  /** Password check only — every login now always continues into the OTP step below. */
  async login(email: string, password: string): Promise<OtpChallengeResponse> {
    try {
      // `portal` makes the API refuse everyone but super admins, who are the only users of this portal.
      const response = await authClient.post<OtpChallengeResponse>('/auth/login', { email, password, portal: 'control' });
      if (response.data.challengeType === 'totp') {
        throw new Error('This account has authenticator-app 2FA enabled, which the control portal does not support yet. Disable it or sign in from the main portal.');
      }
      return response.data;
    } catch (error) {
      throw toFriendlyError(error);
    }
  },

  async verifyOtp(challengeToken: string, code: string): Promise<OtpVerifyResponse> {
    try {
      const response = await authClient.post<OtpVerifyResponse>('/auth/login/otp/verify', { challengeToken, code, deviceId: getDeviceId() });
      return response.data;
    } catch (error) {
      throw toFriendlyError(error);
    }
  },

  /** Sends a fresh login code and invalidates the old one — the returned token replaces the pending challenge. */
  async resendOtp(challengeToken: string): Promise<OtpChallengeResponse> {
    try {
      const response = await authClient.post<OtpChallengeResponse>('/auth/login/otp/resend', { challengeToken });
      return response.data;
    } catch (error) {
      throw toFriendlyError(error);
    }
  },

  /**
   * Sends a reset code to the account's email and phone. The backend answers the same way for
   * unknown emails (the returned challenge just never verifies), so success here doesn't
   * confirm the account exists.
   */
  async forgotPassword(email: string): Promise<{ challengeToken: string }> {
    try {
      const response = await authClient.post<{ challengeToken: string }>('/auth/password/forgot', { email });
      return response.data;
    } catch (error) {
      throw toFriendlyError(error);
    }
  },

  async resetPassword(challengeToken: string, code: string, newPassword: string): Promise<void> {
    try {
      await authClient.post('/auth/password/reset', { challengeToken, code, newPassword });
    } catch (error) {
      throw toFriendlyError(error);
    }
  },
};
