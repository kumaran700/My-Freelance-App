import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAppContext } from '../context/AppContext';

const Layout = () => {
  const { user, profile, settings } = useAppContext();
  
  return (
    <div className={`flex h-screen overflow-hidden ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex h-full w-full bg-main text-primary font-sans overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300">
          <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-8 z-20 shrink-0 shadow-sm">
            <div className="flex items-center space-x-4 pl-12 lg:pl-0">
              <p className="font-black uppercase tracking-widest text-[10px] text-[var(--text-muted)]">
                {profile?.role === 'admin' ? 'DASHBOARD • ADMIN' : 'DASHBOARD • MANAGER'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
               <div className="hidden sm:flex items-center bg-[var(--bg-main)] rounded-full p-1 border border-[var(--border-color)]">
                 <span className="px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] line-none">SYSTEM ONLINE</span>
               </div>
               <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-black tracking-tighter shadow-lg shadow-blue-500/20">
                  {profile?.displayName ? profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'KW'}
               </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
