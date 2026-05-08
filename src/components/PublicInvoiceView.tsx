import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, doc, getDoc } from '../lib/firebase';
import { Invoice } from '../types';
import { formatCurrency } from '../lib/formatters';
import { Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { usePDF } from 'react-to-pdf';
import { generateInvoicePDF } from '../lib/pdfGenerator';

const PublicInvoiceView = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'invoices', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isPublic) {
            setInvoice({ id: docSnap.id, ...data });
          } else {
            setError("This invoice is not public.");
          }
        } else {
          setError("Invoice not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load invoice.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Loading Secure Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-6">
        <div className="max-w-sm w-full text-center space-y-6 card p-8">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-[var(--text-heading)]">Access Denied</h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">
              {error || "We couldn't retrieve the requested document."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Public Header */}
        <div className="flex justify-between items-center bg-[var(--card-bg)] p-6 rounded-2xl shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center gap-4">
             <div className="bg-[var(--primary)] text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl">K</div>
             <div>
               <h1 className="text-sm font-black uppercase tracking-tight text-[var(--text-heading)]">KARTHICK KUMARAN M</h1>
               <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Official Business Invoice</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => generateInvoicePDF(invoice, invoice.clientSnapshot, invoice.tasksSnapshot?.map((t: any) => ({ ...t, checklist: [] })) || [])}
               className="btn bg-[var(--primary)] text-white py-2 px-4 shadow-lg shadow-[var(--primary)]/20"
              >
               <Download size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest ml-2">Download PDF</span>
             </button>
          </div>
        </div>

        {/* Invoice Body (Simplified View) */}
        <div className="card p-8 md:p-12 space-y-12 relative overflow-hidden">
           {isPaid && (
             <div className="absolute top-12 right-[-30px] bg-emerald-500 text-white px-12 py-1 rotate-45 font-black text-[10px] tracking-[0.2em] shadow-xl uppercase z-10">
               FULLY PAID
             </div>
           )}

           <div className="flex justify-between items-start gap-8">
             <div className="space-y-4">
               <div>
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Bill To</p>
                 <h2 className="text-xl font-black text-[var(--text-heading)] uppercase">{invoice.clientSnapshot?.name}</h2>
                 {invoice.clientSnapshot?.company && <p className="text-xs font-bold text-[var(--text-secondary)]">{invoice.clientSnapshot.company}</p>}
                 {invoice.clientSnapshot?.email && <p className="text-xs font-medium text-[var(--text-muted)]">{invoice.clientSnapshot.email}</p>}
               </div>
             </div>
             <div className="text-right space-y-2">
               <h3 className="text-3xl font-black text-[var(--text-heading)] tracking-tighter">#{invoice.invoiceNumber}</h3>
               <div className="flex flex-col items-end gap-1">
                 <span className="badge badge-paid bg-slate-100 text-[var(--text-secondary)] border-transparent uppercase font-black text-[9px] tracking-widest">
                   Invoice Generated
                 </span>
               </div>
             </div>
           </div>

           <div className="space-y-6">
              <div className="grid grid-cols-12 gap-4 border-b-2 border-[var(--bg-main)] pb-4">
                <div className="col-span-8 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Description</div>
                <div className="col-span-4 text-right text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Amount</div>
              </div>
              <div className="space-y-4">
                {(invoice.tasksSnapshot || []).map((task: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-8">
                      <p className="text-sm font-black text-[var(--text-heading)] uppercase">{task.title}</p>
                    </div>
                    <div className="col-span-4 text-right">
                      <p className="text-sm font-black text-[var(--text-heading)]">
                        {formatCurrency(task.amount, invoice.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-12 border-t border-[var(--divider-color)]">
              <div className="space-y-6 max-w-xs">
                {invoice.bankAccountSelected === 'kotak' && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Bank Transfer Details</p>
                    <div className="p-4 bg-[var(--bg-main)] rounded-xl space-y-1">
                       <p className="text-[11px] font-black text-[var(--text-heading)]">KOTAK MAHINDRA BANK</p>
                       <p className="text-[10px] font-bold text-[var(--text-secondary)]">A/C: 6546590111</p>
                       <p className="text-[10px] font-bold text-[var(--text-secondary)]">IFSC: KKBK0008479</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-[var(--text-muted)] uppercase tracking-widest">Subtotal</span>
                  <span className="font-black text-[var(--text-heading)] tracking-tight">
                    {formatCurrency(invoice.amount + (invoice.showDiscount ? (invoice.discount || 0) : 0) - (invoice.roundOff || 0), invoice.currency)}
                  </span>
                </div>
                {invoice.showDiscount && (
                  <div className="flex justify-between items-center text-[11px] text-rose-500">
                    <span className="font-bold uppercase tracking-widest">Discount</span>
                    <span className="font-black tracking-tight">- {formatCurrency(invoice.discount || 0, invoice.currency)}</span>
                  </div>
                )}
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                     <span className="font-bold text-[var(--text-muted)] uppercase tracking-widest">Round Off</span>
                     <span className="font-black text-[var(--text-heading)] tracking-tight">
                       {invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff || 0, invoice.currency)}
                     </span>
                  </div>
                )}
                <div className="h-px bg-[var(--divider-color)] my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-black text-[var(--text-heading)] uppercase tracking-tight">Total Amount</span>
                  <span className="text-xl font-black text-[var(--primary)] tracking-tighter">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </span>
                </div>
                {invoice.advancePaid > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-emerald-500">
                    <span className="font-bold uppercase tracking-widest">Paid Already</span>
                    <span className="font-black tracking-tight">{formatCurrency(invoice.advancePaid, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl mt-4">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Balance Due</span>
                  <span className="text-lg font-black text-rose-600 tracking-tighter">
                    {formatCurrency(invoice.amount - (invoice.advancePaid || 0), invoice.currency)}
                  </span>
                </div>
              </div>
           </div>

           <div className="text-center pt-12">
             <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Thank you for your business!</p>
           </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Secure Public Invoice • Generated by KWORKS</p>
          <div className="flex justify-center gap-4">
             <a href="https://kworks.com" className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest hover:underline">Support</a>
             <span className="text-[var(--border-color)]">|</span>
             <a href="https://kworks.com/terms" className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest hover:underline">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
