import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Plus, 
  CheckSquare, 
  FileText,
  Clock,
  ExternalLink,
  Edit,
  Trash2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { db, doc, deleteDoc } from '../lib/firebase';

import { formatCurrency, convertToINR } from '../lib/formatters';

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, tasks, invoices, deleteClient, profile, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'tasks' | 'invoices'>('tasks');

  const isAdmin = profile?.role === 'admin';

  const client = clients.find(c => c.id === id);
  const clientTasks = tasks.filter(t => t.clientId === id);
  const clientInvoices = invoices.filter(i => i.clientId === id);

  const totalInvoiced = clientInvoices.reduce((sum, i) => sum + convertToINR(i.amount, i.currency, settings.usdToInrRate), 0);
  const totalPaid = clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + convertToINR(i.amount, i.currency, settings.usdToInrRate), 0);
  const totalBalance = totalInvoiced - totalPaid;

  if (!client) return (
    <div className="py-20 text-center space-y-4">
      <p className="text-xl font-bold">Client not found</p>
      <button onClick={() => navigate('/clients')} className="btn-primary">Back to clients</button>
    </div>
  );

  const handleDelete = async () => {
    await deleteClient(client.id);
    navigate('/clients');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/clients')} className="p-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded bg-zinc-900 text-white flex items-center justify-center text-xl font-black shadow-sm uppercase shrink-0">
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight leading-none">{client.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                {client.company && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                    <Building2 size={12} />
                    <span>{client.company}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase">
                    <Mail size={12} />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase">
                    <Phone size={12} />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 self-end md:self-start">
          <button onClick={() => navigate(`/clients/edit/${client.id}`)} className="btn-secondary py-1 h-fit">
            <Edit size={12} />
            <span>EDIT</span>
          </button>
          {isAdmin && (
            <button onClick={handleDelete} className="btn-secondary py-1 h-fit text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card p-4 border-l-4 border-[var(--primary)] bg-[var(--bg-main)]/30">
            <p className="label-caps mb-1">Total Invoiced</p>
            <h3 className="text-lg font-black text-[var(--text-heading)]">{formatCurrency(totalInvoiced, 'INR')}</h3>
          </div>
          <div className="card p-4 border-l-4 border-[var(--income)] bg-[var(--bg-main)]/30">
            <p className="label-caps mb-1">Total Paid</p>
            <h3 className="text-lg font-black text-[var(--income)]">{formatCurrency(totalPaid, 'INR')}</h3>
          </div>
          <div className="card p-4 border-l-4 border-[var(--pending)] bg-[var(--bg-main)]/30">
            <p className="label-caps mb-1">Outstanding</p>
            <h3 className="text-lg font-black text-[var(--pending)]">{formatCurrency(totalBalance, 'INR')}</h3>
          </div>
        </div>
      )}

      <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-6 px-1">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`pb-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'tasks' ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Tasks ({clientTasks.length})
          {activeTab === 'tasks' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950 dark:bg-zinc-50 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`pb-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'invoices' ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Invoices ({clientInvoices.length})
          {activeTab === 'invoices' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950 dark:bg-zinc-50 rounded-t-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {activeTab === 'tasks' && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate(`/tasks/new?clientId=${client.id}`)}
              className="card flex flex-col items-center justify-center p-4 border-dashed border-2 hover:border-zinc-400/50 group cursor-pointer transition-all min-h-[100px]"
            >
              <Plus size={20} className="text-zinc-900 dark:text-zinc-50 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-50 uppercase">New Task</p>
            </motion.div>
            
            {clientTasks.map(task => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-3 space-y-2 flex flex-col group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks/edit/${task.id}`)}
              >
                <div className="flex justify-between items-center">
                  <span className={`badge ${
                    task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                    task.status === 'ongoing' ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-50 text-zinc-500'
                  }`}>
                    {task.status}
                  </span>
                  <ExternalLink size={10} className="text-zinc-300 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase truncate">
                    {clients.find(c => c.id === task.clientId)?.name}
                  </p>
                  {isAdmin && (
                    <p className="text-[11px] font-black whitespace-nowrap">
                      {formatCurrency(task.amount || 0, task.currency || 'USD')}
                    </p>
                  )}
                </div>
                <div className="mt-auto pt-2 border-t border-zinc-50 dark:border-zinc-800 text-[9px] text-zinc-400 font-black uppercase">
                   {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{format(task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </>
        )}

        {activeTab === 'invoices' && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate(`/invoices/new?clientId=${client.id}`)}
              className="card flex flex-col items-center justify-center p-4 border-dashed border-2 hover:border-zinc-400/50 group cursor-pointer transition-all min-h-[100px]"
            >
              <Plus size={20} className="text-zinc-900 dark:text-zinc-50 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-50 uppercase">Create Invoice</p>
            </motion.div>

            {clientInvoices.map(invoice => (
              <motion.div 
                key={invoice.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="card p-3 space-y-2 flex flex-col group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className={`badge ${
                    invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                    invoice.status === 'sent' ? 'bg-zinc-100 text-zinc-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {invoice.status}
                  </span>
                  <p className="text-[9px] font-black text-zinc-400 uppercase">#{invoice.invoiceNumber}</p>
                </div>
                {isAdmin ? (
                  <h4 className="font-black text-sm">{formatCurrency(invoice.amount, invoice.currency)}</h4>
                ) : (
                  <h4 className="font-bold text-xs text-zinc-400 italic">Amount Hidden</h4>
                )}
                <div className="mt-auto pt-2 border-t border-zinc-50 dark:border-zinc-800 flex justify-between items-center">
                   <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-black uppercase">
                      <Clock size={10} />
                      <span>{format(invoice.createdAt.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <FileText size={12} className="text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors" />
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDetails;
