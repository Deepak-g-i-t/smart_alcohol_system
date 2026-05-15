// DashboardLayout — BUG 6 FIX: sidebar collapse state synced via shared localStorage context
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect, createContext, useContext } from 'react';

// Shared sidebar state context so any child can read collapsed status
const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout() {
  // Persist collapsed state in localStorage so it survives navigation
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('slmrs_sidebar_collapsed') ?? 'false');
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('slmrs_sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed }}>
      <div className="min-h-screen bg-dark-950 bg-cyber-grid bg-grid-size">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        {/* BUG 6 FIX — dynamic margin synced with sidebar width */}
        <main
          className={`min-h-screen transition-all duration-300 ${
            collapsed ? 'ml-20' : 'ml-64'
          }`}
        >
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
