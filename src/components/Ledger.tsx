import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  Calendar,
  ChevronDown,
  Printer,
  CheckSquare
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { db, doc, deleteDoc } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { generateStatementPDF } from '../lib/pdfGenerator';
import { formatCurrency } from '../lib/formatters';

const Ledger = () => {
  const { ledger, deleteLedgerEntry, bulkDelete } = useAppContext();
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredLedger = ledger
    .filter(entry => {
      const matchesType = filterType === 'all' || entry.type === filterType;
      const matchesSearch = entry.description.toLowerCase().includes(search.toLowerCase()) || 
                            entry.category.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
      return sortOrder === 'recent' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLedger.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLedger.map(l => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    await bulkDelete('ledger', selectedIds);
    setSelectedIds([]);
  };

  const totalIncome = ledger.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = ledger.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2 no-print">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-heading)]">LEDGER</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Track your income and expenses in INR.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="btn px-4 bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={14} />
              <span>DELETE ({selectedIds.length})</span>
            </button>
          )}
          <button 
            onClick={() => generateStatementPDF(filteredLedger, 'KARTHICK KUMARAN M')}
            className="btn-secondary"
          >
            <Printer size={14} />
            <span>STATEMENT</span>
          </button>
          <button onClick={() => navigate('/ledger/new')} className="btn-primary">
            <Plus size={14} />
            <span>NEW ENTRY</span>
          </button>
        </div>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-[var(--income)]">
          <p className="label-caps mb-1">Total Income</p>
          <h3 className="text-xl font-black text-[var(--income)]">{formatCurrency(totalIncome, 'INR')}</h3>
        </div>
        <div className="card p-5 border-l-4 border-[var(--expense)]">
          <p className="label-caps mb-1">Total Expenses</p>
          <h3 className="text-xl font-black text-[var(--expense)]">{formatCurrency(totalExpense, 'INR')}</h3>
        </div>
        <div className="card p-5 border-l-4 border-[var(--primary)]">
          <p className="label-caps mb-1">Net Balance</p>
          <h3 className={`text-xl font-black ${balance >= 0 ? 'text-[var(--text-heading)]' : 'text-[var(--expense)]'}`}>{formatCurrency(balance, 'INR')}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input
            type="text"
            placeholder="Search entries..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="input h-10 text-xs font-bold uppercase py-1 px-4 w-40"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">ALL TYPES</option>
            <option value="income">INCOME</option>
            <option value="expense">EXPENSE</option>
          </select>
          <select 
            className="input h-10 text-xs font-bold uppercase py-1 px-4 w-40"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="recent">RECENT FIRST</option>
            <option value="oldest">OLDEST FIRST</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden border-[var(--border-color)]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-main)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)]">
              <tr>
                <th className="px-6 py-4 w-10">
                   <div 
                    onClick={toggleSelectAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${selectedIds.length === filteredLedger.length && filteredLedger.length > 0 ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-color)]'}`}
                  >
                    {selectedIds.length === filteredLedger.length && filteredLedger.length > 0 && <CheckSquare size={10} className="text-white" />}
                  </div>
                </th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Amount (INR)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider-color)]">
              <AnimatePresence>
                {filteredLedger.map((entry) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    key={entry.id} 
                    className="hover:bg-[var(--bg-main)]/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div 
                        onClick={() => toggleSelect(entry.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${selectedIds.includes(entry.id) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-color)]'}`}
                      >
                        {selectedIds.includes(entry.id) && <CheckSquare size={10} className="text-white" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase">
                      {format(entry.date.toDate ? entry.date.toDate() : new Date(entry.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${entry.type === 'income' ? 'bg-emerald-500/10 text-[var(--income)]' : 'bg-rose-500/10 text-[var(--expense)]'}`}>
                          {entry.type === 'income' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight text-[var(--text-heading)]">{entry.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="badge bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                        {entry.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-black text-sm ${entry.type === 'income' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                      {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount, 'INR')}
                      {entry.originalCurrency !== 'INR' && (
                         <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-tight mt-0.5">
                           ({formatCurrency(entry.originalAmount, entry.originalCurrency as any)})
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--text-muted)]">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this ledger entry?')) deleteLedgerEntry(entry.id);
                        }} 
                        className="p-1.5 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px] italic">No ledger entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
