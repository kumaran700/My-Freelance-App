import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  MoreVertical, 
  Trash2, 
  Edit, 
  FileText,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { db, doc, deleteDoc, updateDoc, collection, query, where, getDocs } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';

import { formatCurrency } from '../lib/formatters';

const TaskList = () => {
  const { tasks, clients, profile, deleteTask, bulkDelete, addInAppNotification } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          clients.find(c => c.id === t.clientId)?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasks.map(t => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    await bulkDelete('tasks', selectedIds);
    setSelectedIds([]);
  };

  const handleTaskReminder = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;

    try {
      const targetRole = profile.role === 'admin' ? 'manager' : 'admin';
      const q = query(collection(db, 'profiles'), where('role', '==', targetRole));
      const snapshot = await getDocs(q);
      
      const client = clients.find(c => c.id === task.clientId);
      const clientName = client?.name || 'Unknown Client';

      snapshot.forEach(profileDoc => {
        addInAppNotification(
          profileDoc.id,
          'Task Reminder',
          `${profile.displayName} sent a reminder for task: ${task.title} (Client: ${clientName})`,
          'task',
          `/tasks/edit/${task.id}`
        );
      });
      alert('Reminder sent successfully!');
    } catch (error) {
      console.error("Error sending task reminder", error);
    }
  };

  const toggleChecklist = async (taskId: string, index: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newChecklist = [...task.checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    await updateDoc(doc(db, 'tasks', taskId), { checklist: newChecklist });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-heading)]">TASKS</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Manage your active work and reminders.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="btn h-10 px-4 bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={14} />
              <span>DELETE ({selectedIds.length})</span>
            </button>
          )}
          <button onClick={() => navigate('/tasks/new')} className="btn-primary">
            <Plus size={14} />
            <span>NEW TASK</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 h-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg cursor-pointer hover:border-[var(--primary)] transition-colors"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.length === filteredTasks.length && filteredTasks.length > 0 ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-color)]'}`}>
              {selectedIds.length === filteredTasks.length && filteredTasks.length > 0 && <CheckSquare size={10} className="text-white" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select All</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input
              type="text"
              placeholder="Search tasks or clients..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select 
            className="input h-10 text-xs font-bold uppercase py-1 px-4 w-40"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">ALL STATUS</option>
            <option value="pending">PENDING</option>
            <option value="ongoing">ONGOING</option>
            <option value="completed">COMPLETED</option>
            <option value="invoiced">INVOICED</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredTasks.map((task) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              key={task.id}
              className={`card flex flex-col group h-fit relative border-2 transition-all ${selectedIds.includes(task.id) ? 'border-[var(--primary)] shadow-xl' : 'border-transparent'}`}
            >
              {/* Selection Checkbox */}
              <div 
                className="absolute top-3 left-3 z-10 w-5 h-5 rounded border bg-[var(--bg-secondary)] border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(task.id);
                }}
              >
                {selectedIds.includes(task.id) && <CheckSquare size={12} className="text-[var(--primary)]" />}
              </div>

              <div className="p-5 flex-1 space-y-4 pt-10">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`badge ${
                      task.status === 'completed' ? 'badge-paid' :
                      task.status === 'ongoing' ? 'badge-sent' :
                      task.status === 'invoiced' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      'bg-[var(--bg-main)] text-[var(--text-muted)]'
                    }`}>
                      {task.status}
                    </span>
                    {task.isInvoiced && (
                      <span className="badge bg-[var(--primary)] text-white shadow-sm border-[var(--primary)]">
                        INVOICED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status !== 'completed' && task.status !== 'invoiced' && (
                      <button 
                        onClick={(e) => handleTaskReminder(task, e)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                        title="Send Reminder to Team"
                      >
                        <Bell size={14} />
                      </button>
                    )}
                    <button onClick={() => navigate(`/tasks/edit/${task.id}`)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                      <Edit size={14} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }} 
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-black tracking-tight text-[var(--text-heading)] uppercase line-clamp-1 group-hover:text-[var(--primary)] transition-colors">{task.title}</h3>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase truncate tracking-wide">
                      {clients.find(c => c.id === task.clientId)?.name}
                    </p>
                    {isAdmin && (
                      <p className="text-[11px] font-black whitespace-nowrap text-[var(--primary)]">
                        {formatCurrency(task.amount || 0, task.currency || 'INR')}
                      </p>
                    )}
                  </div>
                </div>

                {task.description && (
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-medium">
                    {task.description}
                  </p>
                )}

                {task.checklist && task.checklist.length > 0 && (
                  <div className="space-y-2 bg-[var(--bg-main)]/50 p-3 rounded-xl max-h-32 overflow-y-auto custom-scrollbar border border-[var(--border-color)]">
                    {task.checklist.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-2 text-[10px] uppercase font-black tracking-wide group/item cursor-pointer"
                        onClick={() => toggleChecklist(task.id, idx)}
                      >
                        {item.completed ? 
                          <CheckCircle2 size={13} className="text-[var(--income)] mt-px shrink-0 shadow-sm" /> : 
                          <Circle size={13} className="text-[var(--text-muted)] mt-px shrink-0" />
                        }
                        <span className={item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-[var(--divider-color)] flex items-center justify-between bg-[var(--bg-main)]/30 mt-auto">
                <div className="flex flex-col">
                  {task.dueDate && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${
                      new Date(task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'invoiced'
                        ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'
                    }`}>
                      <Calendar size={12} />
                      <span>{format(task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>

                {isAdmin && task.status !== 'invoiced' && !task.isInvoiced && (
                  <button 
                    onClick={() => navigate(`/invoices/new?taskId=${task.id}`)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[var(--primary)] hover:text-[var(--primary-hover)] uppercase tracking-widest decoration-2 underline-offset-4 hover:underline"
                  >
                    <FileText size={12} />
                    <span>INVOICE</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-4 bg-[var(--bg-main)]/20 rounded-3xl border border-dashed border-[var(--border-color)]">
            <div className="bg-[var(--bg-main)] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)] shadow-inner">
              <CheckSquare size={32} />
            </div>
            <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-[10px]">No tasks found match your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
