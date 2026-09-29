import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GoBackButton } from './GoBackButton';
import { useAuth } from '../context/AuthContext';
import { IdleLogout } from './IdleLogout';
import { loadCurrencyDisplay, useCurrencyDisplay } from '../utils/money';

export function Layout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Subscribed so every page re-renders its amounts when the currency display loads or changes.
  useCurrencyDisplay();

  useEffect(() => {
    if (isAuthenticated) void loadCurrencyDisplay();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f5f7fa] overflow-hidden font-body">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto">
            {/* Every page but the dashboard, which is home. */}
            {location.pathname !== '/' && <GoBackButton />}
            <Outlet />
          </div>
        </main>
      </div>
      <IdleLogout />
    </div>
  );
}
