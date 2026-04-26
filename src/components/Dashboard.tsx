import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckSquare, 
  FileText, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  ChevronRight,
  Landmark,
  Edit2,
  Moon,
  Sun
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { db, doc, updateDoc } from '../lib/firebase';
import { Task } from '../types';
import { generateStatementPDF } from '../lib/pdfGenerator';
import { formatCurrency, convertToINR } from '../lib/formatters';

const Dashboard = () => {
  const { clients, tasks, invoices, ledger, settings, profile, toggleTheme } = useAppContext();
  const navigate = useNavigate();
  const [viewMonth, setViewMonth] = React.useState(new Date().getMonth());
  const [viewYear, setViewYear] = React.useState(new Date().getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredTasks = tasks.filter(t => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const filteredInvoices = invoices.filter(i => {
    const d = i.createdAt?.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const filteredLedger = ledger.filter(entry => {
    const d = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const activeTasks = filteredTasks.filter(t => t.status !== 'completed');
  
  // Revised calculations with currency conversion
  const invoicedPending = filteredInvoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + convertToINR(i.amount, i.currency, settings.usdToInrRate), 0);

  const revenuePaid = filteredInvoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + convertToINR(i.amount, i.currency, settings.usdToInrRate), 0);

  const totalInvoiced = filteredInvoices
    .reduce((s, i) => s + convertToINR(i.amount, i.currency, settings.usdToInrRate), 0);

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { 
        status,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };
  
  // Calculate income based on filter
  const monthlyIncome = filteredLedger
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const isAdmin = profile?.role === 'admin';

  const stats = isAdmin ? [
    { name: 'Monthly Projects', value: filteredTasks.length, icon: CheckSquare, color: 'text-[var(--primary)]', note: `${activeTasks.length} PENDING`, path: '/tasks', bg: 'bg-blue-500/10' },
    { name: 'Pending Income', value: formatCurrency(invoicedPending, 'INR'), icon: FileText, color: 'text-[var(--pending)]', note: null, path: '/invoices', bg: 'bg-amber-500/10' },
    { name: 'Ledger Income', value: formatCurrency(monthlyIncome, 'INR'), icon: Landmark, color: 'text-[var(--income)]', note: null, path: '/ledger', bg: 'bg-emerald-500/10' },
    { name: 'Total Revenue', value: formatCurrency(totalInvoiced, 'INR'), icon: TrendingUp, color: 'text-[var(--income)]', note: null, path: '/invoices', bg: 'bg-emerald-500/10' },
  ] : [
    { name: 'Filtered Tasks', value: filteredTasks.length, icon: CheckSquare, color: 'text-[var(--primary)]', note: `${activeTasks.length} TODO`, path: '/tasks', bg: 'bg-blue-500/10' },
    { name: 'Invoiced', value: filteredTasks.filter(t => t.status === 'invoiced').length, icon: FileText, color: 'text-[var(--primary)]', note: 'Invoiced tasks', path: '/tasks', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="space-y-6">
      <header className="card p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text-heading)]">Dashboard Overview</h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Real-time business status</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--primary)] transition-colors border border-[var(--border-color)]"
              title="Toggle Theme"
            >
              {settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={() => navigate('/tasks/new')} className="btn-primary py-2 text-white">
              <Plus size={16} />
              <span>NEW TASK</span>
            </button>
            {isAdmin && (
              <>
                <button onClick={() => navigate('/invoices/new')} className="btn-secondary py-2">
                  <Plus size={16} />
                  <span>NEW INVOICE</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
           <select 
             className="input h-10 py-1 text-[10px] font-black w-36"
             value={viewMonth}
             onChange={(e) => setViewMonth(parseInt(e.target.value))}
           >
             {months.map((m, idx) => <option key={m} value={idx}>{m.toUpperCase()}</option>)}
           </select>
           <select 
             className="input h-10 py-1 text-[10px] font-black w-28"
             value={viewYear}
             onChange={(e) => setViewYear(parseInt(e.target.value))}
           >
             {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <p className="text-[10px] font-bold text-[var(--text-muted)] ml-auto uppercase tracking-widest">Analytics Filter</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(stat.path || '/')}
            className="card p-6 cursor-pointer group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} -mr-10 -mt-10 rounded-full blur-3xl transition-all group-hover:scale-110 opacity-70`} />
            <div className="relative flex justify-between items-start">
               <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">{stat.name}</span>
               <div className={`p-2.5 rounded-xl ${stat.bg} shadow-sm`}>
                 <stat.icon size={18} className={stat.color} />
               </div>
            </div>
            <div className="relative mt-6 flex items-baseline justify-between">
              <h3 className="text-2xl font-black tracking-tight text-[var(--text-heading)]">{stat.value}</h3>
              {stat.note && (
                <span className={`text-[10px] font-bold ${stat.color} bg-[var(--card-bg)] shadow-sm border border-[var(--border-color)] px-3 py-1 rounded-full`}>
                  {stat.note}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Recent Tasks */}
        <div className="col-span-12 lg:col-span-8 card flex flex-col">
          <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/50">
            <h3 className="font-bold text-[var(--text-heading)] tracking-tight">Ongoing Projects</h3>
            <button onClick={() => navigate('/tasks')} className="btn-secondary py-1 text-[10px] rounded-lg">View All</button>
          </div>
          <div className="p-5 space-y-4">
            {activeTasks.slice(0, 5).map(task => (
              <div 
                key={task.id} 
                className="p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-[var(--primary)] transition-all cursor-pointer group shadow-sm"
                onClick={() => navigate(`/tasks/edit/${task.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${task.status === 'ongoing' ? 'bg-[var(--primary)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                      <h3 className="text-sm font-black text-[var(--text-heading)] truncate uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors">{task.title}</h3>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-tight">
                      {clients.find(c => c.id === task.clientId)?.name || 'Direct Client'} {isAdmin && `• ${formatCurrency(task.amount || 0, task.currency || 'USD')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <select 
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                      className="input h-8 py-1 text-[10px] font-black w-28"
                    >
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                
                {task.checklist && task.checklist.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[var(--divider-color)] flex flex-wrap items-center gap-4">
                    <div className="flex -space-x-1.5">
                      {task.checklist.slice(0, 5).map((_, idx) => (
                        <div key={idx} className="w-5 h-5 rounded-full bg-[var(--bg-main)] border-2 border-[var(--card-bg)] shadow-sm" />
                      ))}
                      {task.checklist.length > 5 && <div className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[7px] flex items-center justify-center border-2 border-[var(--card-bg)] shadow-sm">+{task.checklist.length-5}</div>}
                    </div>
                    <div className="flex items-center gap-3 ml-auto px-4 py-1.5 bg-[var(--bg-main)] rounded-full border border-[var(--border-color)]">
                       <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tight">{task.checklist.filter(i => i.completed).length}/{task.checklist.length} STEPS</p>
                       <div className="w-24 h-1.5 bg-[var(--divider-color)] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(task.checklist.filter(i => i.completed).length / task.checklist.length) * 100}%` }}
                            className="h-full bg-[var(--primary)] rounded-full" 
                          />
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {activeTasks.length === 0 && <div className="p-16 text-center text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[11px] italic">No active projects found.</div>}
          </div>
        </div>

        {/* Ledger Column */}
        {isAdmin && (
          <div className="col-span-12 lg:col-span-4 card flex flex-col">
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/50">
              <h2 className="font-bold text-[var(--text-heading)] tracking-tight">Financial Ledger</h2>
              <button onClick={() => navigate('/ledger')} className="btn-secondary py-1 text-[10px] rounded-lg">History</button>
            </div>
            <div className="p-3 space-y-2">
              {ledger.slice(0, 8).map(entry => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-[var(--bg-main)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${entry.type === 'income' ? 'bg-emerald-500/10 text-[var(--income)] group-hover:bg-[var(--income)] group-hover:text-white group-hover:shadow-lg' : 'bg-rose-500/10 text-[var(--expense)] group-hover:bg-[var(--expense)] group-hover:text-white group-hover:shadow-lg'}`}>
                      {entry.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black truncate leading-tight uppercase tracking-tight text-[var(--text-heading)]">{entry.description}</p>
                      <p className="text-[9px] text-[var(--text-secondary)] uppercase font-black tracking-tighter">{format(entry.date.toDate ? entry.date.toDate() : new Date(entry.date), 'MMM d, HH:mm')}</p>
                    </div>
                  </div>
                  <p className={`text-xs font-black ${entry.type === 'income' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                    {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount, 'INR')}
                  </p>
                </div>
              ))}
              {ledger.length === 0 && <div className="p-16 text-center text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[11px] italic">No transactions.</div>}
            </div>
            <div className="p-5 border-t border-[var(--divider-color)] bg-[var(--bg-main)]/30 mt-auto">
              <button 
                onClick={() => generateStatementPDF(ledger, profile?.displayName || 'KARTHICK KUMARAN M')}
                className="btn-secondary w-full justify-center text-[11px] py-2.5 h-fit"
              >
                Export Ledger Statement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
