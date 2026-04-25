import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Building2, 
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, doc, deleteDoc } from '../lib/firebase';
import { motion } from 'motion/react';
import { formatCurrency, convertToINR } from '../lib/formatters';

const ClientList = () => {
  const { clients, tasks, invoices, profile, settings, deleteClient } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-heading)]">CLIENTS</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Manage your client register and their history.</p>
        </div>
        <button onClick={() => navigate('/clients/new')} className="btn-primary">
          <UserPlus size={14} />
          <span>NEW CLIENT</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
        <input
          type="text"
          placeholder="Search by name, email or company..."
          className="input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClients.map((client) => {
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const clientInvoices = invoices.filter(i => i.clientId === client.id);
          
          const totalInvoiced = clientInvoices.reduce((sum, inv) => 
            sum + convertToINR(inv.amount, inv.currency, settings.usdToInrRate), 0
          );

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="card group cursor-pointer hover:border-[var(--primary)]"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] text-[var(--primary)] flex items-center justify-center font-black text-base uppercase shrink-0 border border-[var(--border-color)]">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate text-[var(--text-heading)] group-hover:text-[var(--primary)] transition-colors uppercase leading-tight tracking-wide">{client.name}</h3>
                    {client.company && (
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-bold truncate">
                        <Building2 size={10} />
                        <span>{client.company.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/edit/${client.id}`);
                      }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this client?')) deleteClient(client.id);
                        }} 
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {client.email && (
                    <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-secondary)] font-medium">
                      <Mail size={12} className="shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-secondary)] font-medium">
                      <Phone size={12} className="shrink-0 text-[var(--text-muted)]" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 grid grid-cols-2 gap-2 border-t border-[var(--divider-color)]">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tasks?clientId=${client.id}`);
                    }}
                    className="text-left group/stat hover:bg-[var(--bg-main)] p-2 rounded-xl transition-all"
                  >
                    <p className="label-caps mb-0.5">Tasks</p>
                    <p className="text-sm font-black text-[var(--text-heading)] group-hover/stat:text-[var(--primary)]">{clientTasks.length}</p>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/invoices?clientId=${client.id}`);
                    }}
                    className="text-left group/stat hover:bg-[var(--bg-main)] p-2 rounded-xl transition-all"
                  >
                    <p className="label-caps mb-0.5">Invoices</p>
                    <p className="text-sm font-black text-[var(--text-heading)] group-hover/stat:text-[var(--primary)]">{clientInvoices.length}</p>
                  </button>
                </div>

                {isAdmin && (
                  <div className="pt-3 border-t border-[var(--divider-color)]">
                     <p className="label-caps text-[var(--primary)]">Total Invoiced</p>
                     <p className="text-lg font-black text-[var(--text-heading)] tracking-tight">
                       {formatCurrency(totalInvoiced, 'INR')}
                     </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="col-span-full py-24 text-center bg-[var(--bg-main)]/20 rounded-3xl border border-dashed border-[var(--border-color)] italic text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[10px]">No clients found.</div>
        )}
      </div>
    </div>
  );
};

export default ClientList;
