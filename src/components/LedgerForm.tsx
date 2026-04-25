import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, collection, doc, setDoc, updateDoc, Timestamp } from '../lib/firebase';

const LedgerForm = () => {
  const { id } = useParams();
  const { user, settings } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    originalAmount: 0,
    originalCurrency: 'INR' as 'USD' | 'INR',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amountInInr = formData.originalCurrency === 'USD' ? formData.originalAmount * settings.usdToInrRate : formData.originalAmount;

    const ledgerData = {
      ...formData,
      amount: amountInInr,
      ownerId: user.uid,
      date: Timestamp.fromDate(new Date(formData.date)),
      createdAt: Timestamp.now()
    };

    try {
      const newDocRef = doc(collection(db, 'ledger'));
      await setDoc(newDocRef, ledgerData);
      navigate('/ledger');
    } catch (error) {
      console.error("Error saving ledger entry", error);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
        <ArrowLeft size={12} />
        <span>BACK</span>
      </button>

      <div className="card p-5">
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight text-[var(--text-heading)]">NEW ENTRY</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-color)]">
            <button 
              type="button" 
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded transition-all ${formData.type === 'income' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--income)]' : 'text-[var(--text-muted)]'}`}
            >
              Income
            </button>
            <button 
              type="button" 
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded transition-all ${formData.type === 'expense' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}
            >
              Expense
            </button>
          </div>

          <div className="space-y-1">
            <label className="label-caps">Description</label>
            <input
              required
              type="text"
              placeholder="What was this for?"
              className="input font-black"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label-caps">Amount</label>
              <input
                required
                type="number"
                step="0.01"
                className="input font-black"
                value={formData.originalAmount || ''}
                onChange={(e) => setFormData({ ...formData, originalAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className="label-caps">Currency</label>
              <select
                className="input font-black"
                value={formData.originalCurrency}
                onChange={(e) => setFormData({ ...formData, originalCurrency: e.target.value as any })}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label-caps">Category</label>
              <input
                type="text"
                placeholder="Category..."
                className="input font-black"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <label className="label-caps">Date</label>
              <input
                type="date"
                className="input font-bold"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button type="submit" className="btn-primary flex-1 py-2">
              <Save size={14} />
              <span>SAVE ENTRY</span>
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="btn-secondary py-2"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LedgerForm;
