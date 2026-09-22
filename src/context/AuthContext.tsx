import { createContext, useContext, useState, type ReactNode } from 'react';
import { authApi, type UserData } from '../api/authApi';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
  PENDING_CHALLENGE_KEY,
  PENDING_EMAIL_KEY,
} from '../config/storageKeys';

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  pendingChallengeToken: string | null;
  pendingEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readUser(): UserData | null {
  const raw = localStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [user, setUser] = useState<UserData | null>(() => readUser());
  // Persisted in sessionStorage (not plain state) so a page refresh mid-OTP-entry doesn't bounce
  // the operator back to the login screen and force them to re-enter their password.
  const [pendingChallengeToken, setPendingChallengeToken] = useState<string | null>(() =>
    sessionStorage.getItem(PENDING_CHALLENGE_KEY),
  );
  const [pendingEmail, setPendingEmail] = useState<string | null>(() => sessionStorage.getItem(PENDING_EMAIL_KEY));

  const login = async (email: string, password: string): Promise<void> => {
    const { challengeToken } = await authApi.login(email, password);
    sessionStorage.setItem(PENDING_CHALLENGE_KEY, challengeToken);
    sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    setPendingChallengeToken(challengeToken);
    setPendingEmail(email);
  };

  const verifyOtp = async (code: string): Promise<void> => {
    if (!pendingChallengeToken) {
      throw new Error('Login session expired — please sign in again.');
    }

    const result = await authApi.verifyOtp(pendingChallengeToken, code);

    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(result.userData));
    sessionStorage.removeItem(PENDING_CHALLENGE_KEY);
    sessionStorage.removeItem(PENDING_EMAIL_KEY);

    setAccessToken(result.accessToken);
    setUser(result.userData);
    setPendingChallengeToken(null);
    setPendingEmail(null);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    sessionStorage.removeItem(PENDING_CHALLENGE_KEY);
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
    setAccessToken(null);
    setUser(null);
    setPendingChallengeToken(null);
    setPendingEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!accessToken,
        pendingChallengeToken,
        pendingEmail,
        login,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
