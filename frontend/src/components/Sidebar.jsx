// Sidebar Navigation — controlled collapse via props from DashboardLayout
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard, ShoppingCart, Users, Shield, BarChart3,
  FileText, LogOut, AlertTriangle, Wine, ChevronLeft,
  ChevronRight, Activity, History, ClipboardList, Zap,
  QrCode, Package, Map, Bell,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { userProfile, signOut } = useAuth();
  const { policies } = useData();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getNavItems = () => {
    switch (userProfile?.role) {
      case 'authority':
        return [
          { to: '/authority', icon: LayoutDashboard, label: 'Dashboard', end: true },
          { to: '/authority/transactions', icon: ClipboardList, label: 'Transactions' },
          { to: '/authority/buyers', icon: Users, label: 'Buyers' },
          { to: '/authority/policies', icon: Shield, label: 'Policies' },
          { to: '/authority/analytics', icon: BarChart3, label: 'Analytics' },
          { to: '/authority/heatmap', icon: Map, label: 'Heatmap' },
          { to: '/authority/inventory', icon: Package, label: 'Inventory' },
          { to: '/authority/audit-logs', icon: FileText, label: 'Audit Logs' },
        ];
      case 'shop':
        return [
          { to: '/shop', icon: LayoutDashboard, label: 'Dashboard', end: true },
          { to: '/shop/new-sale', icon: ShoppingCart, label: 'New Sale' },
          { to: '/shop/scanner', icon: QrCode, label: 'QR Scanner' },
          { to: '/shop/inventory', icon: Package, label: 'Inventory' },
          { to: '/shop/history', icon: History, label: 'History' },
        ];
      case 'buyer':
        return [
          { to: '/buyer', icon: LayoutDashboard, label: 'Dashboard', end: true },
          { to: '/buyer/history', icon: History, label: 'Purchase History' },
          { to: '/buyer/id-card', icon: QrCode, label: 'My ID Card' },
          { to: '/buyer/notifications', icon: Bell, label: 'Notifications' },
        ];
      default:
        return [];
    }
  };

  const roleConfig = {
    authority: { label: 'Authority Admin', color: 'text-accent-purple', bg: 'bg-accent-purple/10', icon: Shield },
    shop: { label: 'Shop Operator', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', icon: Wine },
    buyer: { label: 'Buyer', color: 'text-accent-green', bg: 'bg-accent-green/10', icon: Users },
  };

  const role = roleConfig[userProfile?.role] || roleConfig.buyer;
  const RoleIcon = role.icon;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${
        collapsed ? 'w-20' : 'w-64'
      } bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50 flex flex-col z-50 transition-all duration-300`}
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-dark-900" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-dark-100 leading-tight">SLMRS</h1>
              <p className="text-[10px] text-dark-400 leading-tight">Liquor Management</p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Banner */}
      {policies?.emergencyFlag && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 animate-pulse" />
          <span className="text-xs text-accent-red font-semibold">EMERGENCY ACTIVE</span>
        </div>
      )}
      {policies?.emergencyFlag && collapsed && (
        <div className="mx-3 mt-3 flex justify-center">
          <AlertTriangle className="w-5 h-5 text-accent-red animate-pulse" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
        {getNavItems().map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'sidebar-link-active' : 'sidebar-link')}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">{label}</span>}
            {/* Notification badge on Bell nav item */}
            {label === 'Notifications' && unreadCount > 0 && !collapsed && (
              <span className="ml-auto text-xs bg-accent-red text-white rounded-full px-1.5 py-0.5 leading-none">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Notification Bell (always visible) */}
      {!collapsed && (
        <div className="px-4 pb-2">
          <NotificationBell />
        </div>
      )}

      {/* User Profile */}
      <div className="p-3 border-t border-dark-700/50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} mb-3`}>
          <div className={`w-9 h-9 rounded-full ${role.bg} flex items-center justify-center flex-shrink-0`}>
            <RoleIcon className={`w-4 h-4 ${role.color}`} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-dark-100 truncate">{userProfile?.name}</p>
              <p className={`text-xs ${role.color} font-medium`}>{role.label}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center' : 'gap-3'
          } px-3 py-2.5 rounded-lg text-dark-400 hover:text-accent-red hover:bg-accent-red/10 transition-all duration-200`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-dark-700 border border-dark-600 rounded-full flex items-center justify-center text-dark-400 hover:text-accent-cyan hover:border-accent-cyan/50 transition-all z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
