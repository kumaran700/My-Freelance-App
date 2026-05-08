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
  Sun,
  AlertCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { db, doc, updateDoc } from '../lib/firebase';
import { Task } from '../types';
import { generateStatementPDF } from '../lib/pdfGenerator';
import { formatCurrency, convertToINR } from '../lib/formatters';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const Dashboard = () => {
  const { user, clients, tasks, invoices, ledger, settings, profile, toggleTheme } = useAppContext();
  const navigate = useNavigate();
  const [viewMonth, setViewMonth] = React.useState(new Date().getMonth());
  const [viewYear, setViewYear] = React.useState(new Date().getFullYear());
  const [filterType, setFilterType] = React.useState<'monthly' | 'all-time' | 'custom'>('monthly');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const isWithinFilter = (dateStr: any) => {
    if (!dateStr) return false;
    const d = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    
    if (filterType === 'all-time') return true;
    
    if (filterType === 'monthly') {
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    }
    
    if (filterType === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    
    return true;
  };

  const filteredTasks = tasks.filter(t => isWithinFilter(t.createdAt));
  const filteredInvoices = invoices.filter(i => isWithinFilter(i.createdAt));
  const filteredLedger = ledger.filter(entry => isWithinFilter(entry.date));

  const activeTasks = filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'invoiced');
  
  // Revised calculations with currency conversion
  const invoicedPending = filteredInvoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => {
      const balance = i.amount - (i.advancePaid || 0);
      return s + convertToINR(balance, i.currency, settings.usdToInrRate);
    }, 0);

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
    { 
      name: filterType === 'monthly' ? 'Monthly Projects' : filterType === 'all-time' ? 'Total Projects' : 'Projects in Range', 
      value: filteredTasks.length, 
      icon: CheckSquare, 
      color: 'text-[var(--primary)]', 
      note: `${activeTasks.length} PENDING`, 
      path: '/tasks', 
      bg: 'bg-blue-500/10' 
    },
    { name: 'Pending Income', value: formatCurrency(invoicedPending, 'INR'), icon: FileText, color: 'text-[var(--pending)]', note: null, path: '/invoices', bg: 'bg-amber-500/10' },
    { 
      name: filterType === 'monthly' ? 'Monthly Revenue' : filterType === 'all-time' ? 'Total Revenue' : 'Revenue in Range', 
      value: formatCurrency(monthlyIncome, 'INR'), 
      icon: TrendingUp, 
      color: 'text-[var(--income)]', 
      note: null, 
      path: '/ledger', 
      bg: 'bg-emerald-500/10' 
    },
    { name: 'Total Invoiced', value: formatCurrency(totalInvoiced, 'INR'), icon: FileText, color: 'text-[var(--text-secondary)]', note: null, path: '/invoices', bg: 'bg-slate-500/10' },
  ] : [
    { name: filterType === 'monthly' ? 'Monthly Tasks' : 'Filtered Tasks', value: filteredTasks.length, icon: CheckSquare, color: 'text-[var(--primary)]', note: `${activeTasks.length} TODO`, path: '/tasks', bg: 'bg-blue-500/10' },
    { name: 'Invoiced', value: filteredTasks.filter(t => t.status === 'invoiced').length, icon: FileText, color: 'text-[var(--primary)]', note: 'Invoiced tasks', path: '/tasks', bg: 'bg-blue-500/10' },
  ];

  // Chart Data Preparation
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(viewYear, viewMonth)),
    end: endOfMonth(new Date(viewYear, viewMonth))
  });

  const chartData = daysInMonth.map(day => {
    const dayLedger = filteredLedger.filter(entry => {
      const d = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
      return isSameDay(d, day);
    });

    const income = dayLedger.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = dayLedger.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

    return {
      name: format(day, 'd'),
      income,
      expense
    };
  });

  const taskStatusData = [
    { name: 'Pending', value: filteredTasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
    { name: 'Ongoing', value: filteredTasks.filter(t => t.status === 'ongoing').length, color: '#3b82f6' },
    { name: 'Completed', value: filteredTasks.filter(t => t.status === 'completed').length, color: '#10b981' },
    { name: 'Invoiced', value: filteredTasks.filter(t => t.status === 'invoiced').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

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

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--border-color)]">
           <div className="flex items-center gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
             <button 
               onClick={() => setFilterType('monthly')}
               className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'monthly' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
             >
               Monthly
             </button>
             <button 
               onClick={() => setFilterType('all-time')}
               className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'all-time' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
             >
               All Time
             </button>
             <button 
               onClick={() => setFilterType('custom')}
               className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'custom' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
             >
               Custom Range
             </button>
           </div>

           {filterType === 'monthly' && (
             <div className="flex items-center gap-2">
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
             </div>
           )}

           {filterType === 'custom' && (
             <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)}
                 className="input h-10 py-1 text-[10px] font-black w-36"
               />
               <span className="text-[10px] font-black text-[var(--text-muted)]">TO</span>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => setEndDate(e.target.value)}
                 className="input h-10 py-1 text-[10px] font-black w-36"
               />
             </div>
           )}

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

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-[var(--text-heading)] tracking-tight">Revenue Analytics</h3>
                <p className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Daily income vs expenses</p>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--income)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--income)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)',
                      fontSize: '11px',
                      borderRadius: '12px'
                    }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="var(--income)" 
                    fillOpacity={1} 
                    fill="url(#incomeGradient)" 
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="var(--expense)" 
                    fill="#f43f5e" 
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Task Status Pie */}
          <div className="card p-6">
            <h3 className="font-bold text-[var(--text-heading)] tracking-tight mb-1">Project Status</h3>
            <p className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-6">Current task distribution</p>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)',
                      fontSize: '11px',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-[var(--text-heading)]">{filteredTasks.length}</span>
                <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">Tasks</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {taskStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] font-black uppercase text-[var(--text-secondary)]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                onClick={() => generateStatementPDF(ledger)}
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
