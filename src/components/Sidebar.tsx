import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, FileText, Landmark, LogOut, Sun, Moon, Settings as SettingsIcon, Menu, X, RefreshCw, Bell } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, convertToINR } from '../lib/formatters';
import { format } from 'date-fns';

const Sidebar = () => {
  const { settings, toggleTheme, refreshRates, ledger, invoices, profile, logout, isSidebarOpen, setSidebarOpen } = useAppContext();
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRates();
    setTimeout(() => setRefreshing(false), 500);
  };

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, role: 'any' },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, role: 'any' },
    { name: 'Clients', path: '/clients', icon: Users, role: 'any' },
    { name: 'Broadcast', path: '/notifications/send', icon: Bell, role: 'any' },
    { name: 'Invoices', path: '/invoices', icon: FileText, role: 'admin' },
    { name: 'Ledger', path: '/ledger', icon: Landmark, role: 'admin' },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, role: 'admin' },
  ];

  const filteredLinks = links.filter(l => l.role === 'any' || (l.role === 'admin' && isAdmin));

  const monthlyLedgerIncome = ledger
    .filter(entry => {
      const d = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
      const now = new Date();
      return entry.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-black text-[var(--text-heading)] uppercase tracking-tight leading-none">
          {isAdmin ? 'KARTHICK KUMARAN M' : 'KWORKS'}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] mt-2 uppercase tracking-[0.2em] font-black">
          {isAdmin ? 'Freelance Business OS' : 'Task Manager'}
        </p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-bold uppercase tracking-widest ${
                isActive 
                  ? 'bg-[var(--primary)] text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-heading)]'
              }`}
            >
              <Icon size={14} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-4">
        {isAdmin && (
          <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Monthly Revenue</p>
            <p className="text-xl font-black text-[var(--income)] font-mono tracking-tighter">{formatCurrency(monthlyLedgerIncome, 'INR')}</p>
            <div className="mt-4 pt-3 border-t border-[var(--divider-color)]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Rate: {settings.usdToInrRate}</p>
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-heading)] disabled:opacity-50"
                  title="Refresh Rate"
                >
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
              {settings.lastRateUpdate && (
                <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold text-right italic">
                  Updated: {format(new Date(settings.lastRateUpdate), 'MMM d, HH:mm')}
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-heading)] transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            {settings.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{settings.theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle - Hidden now because we use header/nav */}
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-[var(--bg-secondary)] flex-shrink-0 flex-col sticky top-0 border-r border-[var(--border-color)]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed top-0 left-0 z-40 h-screen w-64 bg-[var(--bg-secondary)] flex flex-col border-r border-[var(--border-color)] transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
