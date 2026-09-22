import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboardIcon,
  Building2Icon,
  UsersIcon,
  ShieldCheckIcon,
  SlidersIcon,
  XIcon,
  LogOutIcon,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/', end: true, label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/offices', label: 'Office Directory', icon: Building2Icon },
  { to: '/staff', label: 'Staff Directory', icon: UsersIcon },
  { to: '/super-admins', label: 'Super Admins', icon: ShieldCheckIcon },
  { to: '/settings', label: 'Rules & Settings', icon: SlidersIcon },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${isActive ? 'bg-white/10 text-white font-heading font-bold border-l-4 border-accent' : 'text-gray-300 hover:bg-white/5 hover:text-white font-body border-l-4 border-transparent'}`;

  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-primary text-white w-64 shadow-xl">
      <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
        <Logo width={140} height={46} />
        <button className="lg:hidden text-gray-300 hover:text-white" onClick={onMobileClose}>
          <XIcon size={24} />
        </button>
      </div>

      <div className="px-6 py-3 border-b border-white/10">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-heading font-bold">Control Portal</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClasses}>
            <link.icon size={20} className="mr-3" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <div onClick={handleLogout} className="group flex items-center px-2 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 text-white flex items-center justify-center text-xs font-heading font-bold">
            {initials}
          </div>

          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-heading font-bold text-white truncate">{user?.fullName || 'Signed in'}</p>
            <p className="text-xs text-gray-300 truncate">{user?.user_type ?? user?.email}</p>
          </div>
          <span className="w-8 h-8 rounded-full bg-white/10 text-gray-300 flex items-center justify-center group-hover:bg-white/15 group-hover:text-accent transition-colors">
            <LogOutIcon size={16} />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`fixed inset-y-0 left-0 z-50 transform lg:translate-x-0 lg:static lg:flex-shrink-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:transition-none`}
      >
        {sidebarContent}
      </motion.div>
    </>
  );
}
