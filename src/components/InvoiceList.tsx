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
  Download,
  CheckSquare,
  Mail
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { format, differenceInDays } from 'date-fns';
import { db, doc, updateDoc, Timestamp, deleteDoc, setDoc, collection } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import { formatCurrency, convertToINR } from '../lib/formatters';

const InvoiceList = () => {
  const { user, invoices, clients, tasks, profile, settings, deleteInvoice, bulkDelete, addInAppNotification } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Date Filters
  const [filterType, setFilterType] = useState<'monthly' | 'all-time' | 'custom'>('monthly');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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

  const filteredInvoices = invoices.filter(i => {
    const clientName = clients.find(c => c.id === i.clientId)?.name || '';
    const matchesSearch = i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
                          clientName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || i.status === filter;
    const matchesDate = isWithinFilter(i.createdAt);
    return matchesSearch && matchesFilter && matchesDate;
  });

  const pendingFilteredTotal = filteredInvoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => {
      const balance = i.amount - (i.advancePaid || 0);
      return s + convertToINR(balance, i.currency, settings.usdToInrRate);
    }, 0);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    await bulkDelete('invoices', selectedIds);
    setSelectedIds([]);
  };

  const handleSendReminder = async (invoice: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const client = clients.find(c => c.id === invoice.clientId);
    if (!client) return;

    if (!client.email) {
      alert(`Client ${client.name} does not have an email address configured.`);
      return;
    }

    const dueDateStr = invoice.dueDate ? format(invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate), 'MMM d, yyyy') : 'N/A';
    const amountStr = formatCurrency(invoice.amount, invoice.currency);
    
    const subject = `Payment Reminder: Invoice #${invoice.invoiceNumber}`;
    const body = `Hi ${client.name},\n\nThis is a friendly reminder regarding Invoice #${invoice.invoiceNumber} for ${amountStr}, which was due on ${dueDateStr}.\n\nIf you have already made the payment, please disregard this message. Otherwise, we would appreciate it if you could settle the balance at your earliest convenience.\n\nBest regards,\nKARTHICK KUMARAN M\nKWORKS`;

    const mailtoUrl = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    if (user) {
      await addInAppNotification(
        user.uid,
        'Reminder Sent',
        `Payment reminder triggered for #${invoice.invoiceNumber} to ${client.name}`,
        'invoice',
        `/invoices/${invoice.id}`
      );
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      const oldStatus = invoice.status;
      
      // Update the invoice status
      await updateDoc(doc(db, 'invoices', invoiceId), { status: newStatus, updatedAt: Timestamp.now() });

      // If transition to paid, record remaining balance as income
      if (oldStatus !== 'paid' && newStatus === 'paid') {
        const alreadyPaid = invoice.advancePaid || 0;
        const remainingBalance = invoice.amount - alreadyPaid;
        
        if (remainingBalance > 0) {
          const amountInInr = invoice.currency === 'USD' ? remainingBalance * settings.usdToInrRate : remainingBalance;
          await setDoc(doc(collection(db, 'ledger')), {
            type: 'income',
            amount: amountInInr,
            originalAmount: remainingBalance,
            originalCurrency: invoice.currency,
            description: `Final Payment for Invoice #${invoice.invoiceNumber}`,
            category: 'Invoice Payment',
            date: Timestamp.now(),
            invoiceId: invoiceId,
            ownerId: user.uid,
            createdAt: Timestamp.now()
          });
        }
        
        // Also update advancePaid to full amount
        await updateDoc(doc(db, 'invoices', invoiceId), { advancePaid: invoice.amount });
      }
    } catch (error) {
      console.error("Update status failed", error);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-heading)]">INVOICES</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Manage your billing and payments.</p>
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
          <button onClick={() => navigate('/invoices/new')} className="btn-primary">
            <Plus size={14} />
            <span>NEW INVOICE</span>
          </button>
        </div>
      </header>

      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
            <button 
              onClick={() => setFilterType('monthly')}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'monthly' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setFilterType('all-time')}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'all-time' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
            >
              All Time
            </button>
            <button 
              onClick={() => setFilterType('custom')}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'custom' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
            >
              Custom
            </button>
          </div>

          {filterType === 'monthly' && (
            <div className="flex items-center gap-2">
              <select 
                className="input h-9 py-1 text-[10px] font-black w-24"
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
              >
                {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
              <select 
                className="input h-9 py-1 text-[10px] font-black w-24"
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
                className="input h-9 py-1 text-[10px] font-black w-32"
              />
              <span className="text-[10px] font-black text-[var(--text-muted)]">TO</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="input h-9 py-1 text-[10px] font-black w-32"
              />
            </div>
          )}

          <div className="h-4 w-px bg-[var(--border-color)] mx-2 hidden md:block" />
          
          <select 
            className="input h-9 text-[10px] font-black uppercase py-1 px-4 w-36"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">ALL STATUS</option>
            <option value="draft">DRAFT</option>
            <option value="sent">SENT</option>
            <option value="paid">PAID</option>
            <option value="overdue">OVERDUE</option>
          </select>

          {isAdmin && (
            <div className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-[var(--pending)]/10 text-[var(--pending)] rounded-full border border-[var(--pending)]/20 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none">Pending for List</p>
              <p className="text-[11px] font-black tracking-tight">{formatCurrency(pendingFilteredTotal, 'INR')}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 h-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg cursor-pointer hover:border-[var(--primary)] transition-colors shrink-0"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-color)]'}`}>
                {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 && <CheckSquare size={10} className="text-white" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select All</span>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              <input
                type="text"
                placeholder="Search by number or client..."
                className="input pl-10 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
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
                className={`card group cursor-pointer hover:border-[var(--primary)] border-t-4 relative border-2 ${selectedIds.includes(invoice.id) ? 'border-[var(--primary)] shadow-xl' : 'border-transparent'}`}
                style={{ borderTopColor: 
                  invoice.status === 'paid' ? 'var(--income)' : 
                  invoice.status === 'sent' ? 'var(--primary)' : 
                  invoice.status === 'overdue' ? 'var(--expense)' : 'var(--text-muted)' 
                }}
              >
                {/* Selection Checkbox */}
                <div 
                  className="absolute top-3 right-3 z-10 w-5 h-5 rounded border bg-[var(--bg-secondary)] border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-all"
                  onClick={(e) => toggleSelect(invoice.id, e)}
                >
                  {selectedIds.includes(invoice.id) && <CheckSquare size={12} className="text-[var(--primary)]" />}
                </div>

                <div className="p-5 space-y-4 pt-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">{invoice.invoiceNumber}</p>
                      <h3 className="text-sm font-black text-[var(--text-heading)] uppercase tracking-tight line-clamp-1 group-hover:text-[var(--primary)] transition-colors">{client?.name || 'UNKNOWN CLIENT'}</h3>
                    </div>
                    {isAdmin ? (
                      <select 
                        value={invoice.status} 
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value, e as any)}
                        className={`text-[9px] font-black uppercase tracking-tight px-2 py-1 rounded-md border appearance-none cursor-pointer ${
                          invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          invoice.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
                        }`}
                      >
                        <option value="draft">DRAFT</option>
                        <option value="sent">SENT</option>
                        <option value="partially_paid">PARTIAL</option>
                        <option value="paid">PAID</option>
                        <option value="overdue">OVERDUE</option>
                      </select>
                    ) : (
                      <div className={`badge ${
                        invoice.status === 'paid' ? 'badge-paid' :
                        invoice.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        invoice.status === 'sent' ? 'badge-sent' :
                        'bg-[var(--bg-main)] text-[var(--text-muted)]'
                      }`}>
                        {invoice.status}
                      </div>
                    )}
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
                       {invoice.status !== 'paid' && (
                         <button 
                           onClick={(e) => handleSendReminder(invoice, e)}
                           className="p-1.5 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                           title="Send Reminder"
                         >
                           <Mail size={14}/>
                         </button>
                       )}
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
                              deleteInvoice(invoice.id);
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
