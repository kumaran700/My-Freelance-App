import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  Calendar,
  Download
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { db, doc, deleteDoc } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import { formatCurrency } from '../lib/formatters';

const InvoiceList = () => {
  const { invoices, clients, tasks, profile, settings, deleteInvoice } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredInvoices = invoices.filter(i => {
    const clientName = clients.find(c => c.id === i.clientId)?.name || '';
    const matchesSearch = i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
                          clientName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || i.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-heading)]">INVOICES</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Manage your billing and payments.</p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={14} />
          <span>NEW INVOICE</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input
            type="text"
            placeholder="Search by number or client..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="input h-10 text-xs font-bold uppercase py-1 px-4 w-40"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">ALL STATUS</option>
            <option value="draft">DRAFT</option>
            <option value="sent">SENT</option>
            <option value="paid">PAID</option>
            <option value="overdue">OVERDUE</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredInvoices.map((invoice) => {
            const client = clients.find(c => c.id === invoice.clientId);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="card group cursor-pointer hover:border-[var(--primary)] border-t-4"
                style={{ borderTopColor: 
                  invoice.status === 'paid' ? 'var(--income)' : 
                  invoice.status === 'sent' ? 'var(--primary)' : 
                  invoice.status === 'overdue' ? 'var(--expense)' : 'var(--text-muted)' 
                }}
              >
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">{invoice.invoiceNumber}</p>
                      <h3 className="text-sm font-black text-[var(--text-heading)] uppercase tracking-tight line-clamp-1 group-hover:text-[var(--primary)] transition-colors">{client?.name || 'UNKNOWN CLIENT'}</h3>
                    </div>
                    <div className={`badge ${
                      invoice.status === 'paid' ? 'badge-paid' :
                      invoice.status === 'sent' ? 'badge-sent' :
                      invoice.status === 'overdue' ? 'badge-overdue' :
                      'bg-[var(--bg-main)] text-[var(--text-muted)]'
                    }`}>
                      {invoice.status}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {isAdmin ? (
                      <>
                        <p className="text-2xl font-black text-[var(--text-heading)] leading-none tracking-tight">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </p>
                        {invoice.currency === 'USD' && (
                           <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">
                            ~ {formatCurrency(invoice.amount * settings.usdToInrRate, 'INR')}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-tighter italic">Amount Protected</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[var(--divider-color)] flex justify-between items-center bg-[var(--bg-main)]/30 -mx-5 -mb-5 px-5 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                      <Calendar size={12} />
                      <span>{format(invoice.createdAt.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex gap-1">
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           const currentClient = clients.find(c => c.id === invoice.clientId);
                           const invoiceTasks = tasks.filter(t => invoice.taskIds.includes(t.id));
                           if (currentClient) downloadInvoicePDF(invoice, currentClient, invoiceTasks);
                         }} 
                         className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                         title="Download PDF"
                       >
                         <Download size={14}/>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); navigate(`/invoices/edit/${invoice.id}`); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"><Edit size={14}/></button>
                        {isAdmin && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (window.confirm('Delete this invoice?')) deleteInvoice(invoice.id);
                            }} 
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14}/>
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredInvoices.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-4 bg-[var(--bg-main)]/20 rounded-3xl border border-dashed border-[var(--border-color)]">
            <div className="bg-[var(--bg-main)] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)] shadow-inner">
              <FileText size={32} />
            </div>
            <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-[10px]">No invoices found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
