import axios from 'axios';
import { env } from '../config/env';

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
}

export interface OtpVerifyResponse {
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  userData: UserData;
}

function toFriendlyError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const title = (error.response?.data as { title?: string } | undefined)?.title;
    return new Error(title || error.message);
  }
  return error instanceof Error ? error : new Error('Unexpected error');
}

export const authApi = {
  /** Password check only — every login now always continues into the OTP step below. */
  async login(email: string, password: string): Promise<OtpChallengeResponse> {
    try {
      const response = await authClient.post<OtpChallengeResponse>('/auth/login', { email, password });
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
      const response = await authClient.post<OtpVerifyResponse>('/auth/login/otp/verify', { challengeToken, code });
      return response.data;
    } catch (error) {
      throw toFriendlyError(error);
    }
  },
};
