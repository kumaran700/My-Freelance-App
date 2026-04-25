import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Mail, 
  CheckCircle, 
  Clock, 
  Building2,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { db, doc, updateDoc, setDoc, collection, Timestamp } from '../lib/firebase';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import { formatCurrency } from '../lib/formatters';

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, clients, tasks, user, settings, profile } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const invoiceRef = useRef<HTMLDivElement>(null);

  const invoice = invoices.find(i => i.id === id);
  const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
  const invoiceTasks = invoice ? tasks.filter(t => invoice.taskIds.includes(t.id)) : [];

  const handleDownload = () => {
    if (invoice && client) {
      downloadInvoicePDF(invoice, client, invoiceTasks);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!invoice || !client) return <div>Invoice not found</div>;

  const markAsPaid = async () => {
    if (!user) return;
    try {
      // 1. Update invoice status
      await updateDoc(doc(db, 'invoices', invoice.id), { status: 'paid', updatedAt: Timestamp.now() });

      // 2. Add to ledger (Calculated in INR)
      const amountInInr = invoice.currency === 'USD' ? invoice.amount * settings.usdToInrRate : invoice.amount;
      const ledgerRef = doc(collection(db, 'ledger'));
      await setDoc(ledgerRef, {
        type: 'income',
        amount: amountInInr,
        originalAmount: invoice.amount,
        originalCurrency: invoice.currency,
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
        category: 'Invoice Payment',
        date: Timestamp.now(),
        invoiceId: invoice.id,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      });

      alert('Invoice marked as paid and added to ledger.');
    } catch (error) {
      console.error("Error marking as paid", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button onClick={() => navigate(-1)} className="btn-secondary py-1.5 h-fit">
          <ArrowLeft size={14} />
          <span>BACK</span>
        </button>
        <div className="flex gap-2">
          {invoice.status !== 'paid' && (
            <button onClick={markAsPaid} className="btn-primary bg-emerald-600 hover:bg-emerald-700 py-1.5 h-fit">
              <CheckCircle size={14} />
              <span>MARK PAID</span>
            </button>
          )}
          <button onClick={() => navigate(`/invoices/edit/${invoice.id}`)} className="btn-secondary py-1.5 h-fit px-2">
            <Edit size={14} />
          </button>
          <button onClick={handleDownload} className="btn-secondary py-1.5 h-fit text-blue-600 border-blue-200">
            <Download size={14} />
            <span>DOWNLOAD</span>
          </button>
          <button onClick={handlePrint} className="btn-secondary py-1.5 h-fit">
            <Printer size={14} />
            <span>PRINT</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto shadow-2xl no-scrollbar overflow-x-auto rounded-xl">
        <div ref={invoiceRef} className="bg-white text-slate-900 p-8 md:p-12 min-h-[11in] w-full" id="invoice-bill">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 leading-none">INVOICE</h1>
              <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase mt-2">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-blue-600 leading-none">KARTHICK KUMARAN M</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">+91 9159538955</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-10">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BILL TO</h3>
              <div className="space-y-0.5">
                <p className="text-lg font-black uppercase leading-tight">{client.name}</p>
                {client.company && <p className="text-xs text-slate-600 font-black uppercase tracking-tight">{client.company}</p>}
                <div className="pt-2 space-y-0.5">
                  {client.email && <p className="text-[11px] text-slate-500 font-medium">{client.email}</p>}
                  {client.phone && <p className="text-[11px] text-slate-500 font-medium">{client.phone}</p>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 inline-grid text-left">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">DATE ISSUED</h3>
                  <p className="text-xs font-black uppercase leading-none">{format(invoice.createdAt.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">DUE DATE</h3>
                  {invoice.dueDate ? (
                    <p className="text-xs font-black uppercase leading-none">{format(invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                  ) : <p className="text-xs font-black uppercase text-slate-300 leading-none">UPON RECEIPT</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-slate-900 text-left text-[10px] font-black text-slate-900 uppercase tracking-[0.15em]">
                  <th className="pb-3 text-left">DESCRIPTION</th>
                  <th className="pb-3 text-right">PRICE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr key={task.id} className="text-slate-800">
                    <td className="py-5 pr-8">
                      <p className="font-black text-sm uppercase tracking-tight leading-tight">{task.title}</p>
                      {task.description && <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight leading-relaxed max-w-md">{task.description}</p>}
                    </td>
                    <td className="py-5 text-right font-black text-sm tabular-nums">
                      {formatCurrency(task.amount || 0, invoice.currency)}
                    </td>
                  </tr>
                  {task.checklist && task.checklist.map((item, idx) => (
                    <tr key={`${task.id}-${idx}`} className="text-slate-500 border-none">
                      <td className="py-1 pl-4 pr-8 border-none text-left italic">
                        <p className="text-[10px] font-bold uppercase tracking-tight">• {item.text}</p>
                      </td>
                      <td className="py-1 text-right font-bold text-[10px] italic tabular-nums border-none">
                        {item.price > 0 ? formatCurrency(item.price, invoice.currency) : ''}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
                ))}
                {invoiceTasks.length === 0 && (
                  <tr className="text-slate-800">
                    <td className="py-5 pr-8">
                      <p className="font-black text-sm uppercase tracking-tight">PROFESSIONAL SERVICES</p>
                    </td>
                    <td className="py-5 text-right font-black text-sm tabular-nums">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between items-center text-slate-500 py-1 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest">SUBTOTAL</span>
                <span className="text-xs font-black tabular-nums">{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between items-baseline text-slate-900 bg-slate-900 text-white p-3 rounded-lg overflow-hidden relative">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">TOTAL DUE</span>
                <span className="text-2xl font-black tabular-nums relative z-10 tracking-tighter">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
                <div className="absolute top-0 right-0 w-24 h-full bg-blue-600 -skew-x-[20deg] translate-x-12"></div>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-end">
            <div className="text-left space-y-1">
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">THANK YOU</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
