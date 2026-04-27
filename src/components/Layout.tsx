import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAppContext } from '../context/AppContext';
import { Bell, X, Check, Trash2, ExternalLink, Send, LayoutDashboard, CheckSquare, Users, FileText, Landmark, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const Layout = () => {
  const { user, profile, settings, notifications, markNotificationAsRead, deleteNotification, setSidebarOpen } = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = profile?.role === 'admin';
  const unreadCount = notifications.filter(n => !n.read).length;

  const mobileNavLinks = [
    { name: 'Home', path: '/', icon: LayoutDashboard, role: 'any' },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, role: 'any' },
    { name: 'Clients', path: '/clients', icon: Users, role: 'any' },
    ...(isAdmin ? [
      { name: 'Ledger', path: '/ledger', icon: Landmark, role: 'admin' }
    ] : []),
    { name: 'Menu', path: '#menu', icon: Menu, role: 'any' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: any) => {
    markNotificationAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setShowNotifications(false);
    }
  };

  const handleMobileNavClick = (path: string, e: React.MouseEvent) => {
    if (path === '#menu') {
      e.preventDefault();
      setSidebarOpen(true);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex h-full w-full bg-main text-primary font-sans overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)] pb-[env(safe-area-inset-bottom)]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 relative">
          <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-8 z-20 shrink-0 shadow-sm pt-[env(safe-area-inset-top)] box-content">
            <div className="flex items-center space-x-2 pl-0">
              {/* Profile Link or Burger */}
               <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-black tracking-tighter shadow-lg shadow-blue-500/20 lg:hidden">
                  {profile?.displayName ? profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'KW'}
               </div>
              <p className="font-black uppercase tracking-widest text-[10px] text-[var(--text-muted)] lg:pl-0">
                {profile?.role === 'admin' ? 'KWORKS • PRO' : 'KWORKS • TASK'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
               <div className="hidden sm:flex items-center bg-[var(--bg-main)] rounded-full p-1 border border-[var(--border-color)]">
                 <span className="px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] line-none">SYSTEM ONLINE</span>
               </div>
               
               {/* Notification Bell */}
               <div className="relative" ref={notificationRef}>
                 <button 
                   onClick={() => setShowNotifications(!showNotifications)}
                   className={`p-2 rounded-xl transition-all relative ${showNotifications ? 'bg-blue-500/10 text-[var(--primary)]' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-blue-500/5 hover:text-[var(--primary)] border border-[var(--border-color)]'}`}
                 >
                   <Bell size={18} />
                   {unreadCount > 0 && (
                     <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-secondary)]" />
                   )}
                 </button>

                 <AnimatePresence>
                   {showNotifications && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute right-0 mt-3 w-80 max-h-[450px] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                     >
                       <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-main)]/50">
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-widest">NOTIFICATIONS</h3>
                            <span className="text-[8px] font-black bg-[var(--primary)] text-white px-2 py-0.5 rounded-full">{unreadCount} UNREAD</span>
                          </div>
                          <button 
                            onClick={() => { navigate('/notifications/send'); setShowNotifications(false); }}
                            className="p-2 hover:bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg transition-colors group"
                            title="Send Manual Notification"
                          >
                            <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </button>
                       </div>
                       
                       <div className="overflow-y-auto custom-scrollbar flex-1">
                          {notifications.length === 0 ? (
                            <div className="p-10 text-center space-y-3">
                              <Bell className="mx-auto text-[var(--text-muted)] opacity-20" size={32} />
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Everything is quiet.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-[var(--border-color)]">
                              {notifications.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`p-4 hover:bg-[var(--bg-main)]/50 transition-colors cursor-pointer group relative ${!n.read ? 'bg-blue-500/[0.02]' : ''}`}
                                  onClick={() => handleNotificationClick(n)}
                                >
                                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary)]" />}
                                  <div className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      n.type === 'task' ? 'bg-blue-500/10 text-blue-500' :
                                      n.type === 'invoice' ? 'bg-emerald-500/10 text-emerald-500' :
                                      'bg-slate-500/10 text-slate-500'
                                    }`}>
                                      {n.type === 'task' ? <Check size={14} /> : n.type === 'invoice' ? <ExternalLink size={14} /> : <Bell size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-[11px] font-black uppercase tracking-tight text-[var(--text-heading)] line-clamp-1">{n.title}</h4>
                                      <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed line-clamp-2 mt-0.5 uppercase">{n.message}</p>
                                      <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1 tracking-tighter">
                                        {formatDistanceToNow(n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt), { addSuffix: true })}
                                      </p>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       {!n.read && (
                                         <button 
                                           onClick={(e) => { e.stopPropagation(); markNotificationAsRead(n.id); }}
                                           className="p-1 hover:text-[var(--primary)]"
                                         >
                                           <Check size={12} />
                                         </button>
                                       )}
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                         className="p-1 hover:text-rose-500"
                                       >
                                         <Trash2 size={12} />
                                       </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                       
                       {notifications.length > 0 && (
                         <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-main)]/50 text-center">
                            <button 
                              onClick={() => {
                                notifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id));
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline"
                            >
                              MARK ALL AS READ
                            </button>
                         </div>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>

               <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-black tracking-tighter shadow-lg shadow-blue-500/20">
                  {profile?.displayName ? profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'KW'}
               </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto mb-16 lg:mb-0 pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>

          {/* iOS Style Bottom Tab Bar */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-around px-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] box-content">
            {mobileNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => handleMobileNavClick(link.path, e)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-[var(--primary)]/10' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {link.name === 'Broadcast' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-secondary)]" />
                    )}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tight">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Layout;
