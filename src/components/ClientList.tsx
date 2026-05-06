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
  Edit,
  CheckSquare
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, doc, deleteDoc } from '../lib/firebase';
import { motion } from 'motion/react';
import { formatCurrency, convertToINR } from '../lib/formatters';

const ClientList = () => {
  const { clients, tasks, invoices, profile, settings, deleteClient, bulkDelete } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map(c => c.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    await bulkDelete('clients', selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-heading)]">CLIENTS</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Manage your client register and their history.</p>
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
          <button onClick={() => navigate('/clients/new')} className="btn-primary">
            <UserPlus size={14} />
            <span>NEW CLIENT</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 h-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg cursor-pointer hover:border-[var(--primary)] transition-colors shrink-0"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.length === filteredClients.length && filteredClients.length > 0 ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-color)]'}`}>
              {selectedIds.length === filteredClients.length && filteredClients.length > 0 && <CheckSquare size={10} className="text-white" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select All</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input
              type="text"
              placeholder="Search by name, email or company..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClients.map((client) => {
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const clientInvoices = invoices.filter(i => i.clientId === client.id);
          const pendingBalance = clientInvoices.filter(i => i.status !== 'paid').reduce((sum, inv) => 
            sum + convertToINR(inv.amount, inv.currency, settings.usdToInrRate), 0
          );

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className={`card group cursor-pointer hover:border-[var(--primary)] relative border-2 ${selectedIds.includes(client.id) ? 'border-[var(--primary)] shadow-xl' : 'border-transparent'}`}
            >
              {/* Selection Checkbox */}
              <div 
                className="absolute top-3 left-3 z-10 w-5 h-5 rounded border bg-[var(--bg-secondary)] border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-all"
                onClick={(e) => toggleSelect(client.id, e)}
              >
                {selectedIds.includes(client.id) && <CheckSquare size={12} className="text-[var(--primary)]" />}
              </div>

              <div className="p-5 space-y-4 pt-10">
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
                          deleteClient(client.id);
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
                     <p className="label-caps text-[var(--pending)]">Pending Balance</p>
                     <p className="text-lg font-black text-[var(--text-heading)] tracking-tight">
                       {formatCurrency(pendingBalance, 'INR')}
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
