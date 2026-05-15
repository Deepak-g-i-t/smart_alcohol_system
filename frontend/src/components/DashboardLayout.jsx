// Dashboard Layout wrapper with sidebar
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-dark-950 bg-cyber-grid bg-grid-size">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
