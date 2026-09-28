import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ShieldAlertIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // The API already refuses other staff at sign-in; this catches a session that predates that rule.
  if (user && user.user_type !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-4">
        <div role="alert" className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlertIcon size={24} />
          </span>
          <h1 className="mt-4 font-heading text-xl font-bold text-gray-900">Unauthorised</h1>
          <p className="mt-2 text-sm text-gray-500">
            Only super admins can use the Control Portal. Staff should sign in to the Office Portal instead.
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-heading font-bold text-white hover:bg-primary/90"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
