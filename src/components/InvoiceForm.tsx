import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { db, collection, doc, setDoc, updateDoc, Timestamp } from '../lib/firebase';

import { convertCurrency } from '../lib/formatters';

const InvoiceForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preSelectedTaskId = searchParams.get('taskId');
  const preSelectedClientId = searchParams.get('clientId');

  const { clients, tasks, invoices, user, settings } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    clientId: preSelectedClientId || '',
    taskIds: [] as string[],
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    amount: 0,
    currency: 'INR' as 'USD' | 'INR',
    status: 'draft' as any,
    dueDate: '',
    reminderDate: '',
  });

  useEffect(() => {
    if (preSelectedTaskId) {
      const task = tasks.find(t => t.id === preSelectedTaskId);
      if (task) {
        setFormData(prev => {
          const taskAmount = convertCurrency(task.amount || 0, task.currency || 'USD', prev.currency, settings.usdToInrRate);
          return {
            ...prev,
            clientId: task.clientId,
            taskIds: [task.id],
            amount: taskAmount
          };
        });
      }
    }
  }, [preSelectedTaskId, tasks, settings.usdToInrRate]);

  useEffect(() => {
    if (id) {
      const invoice = invoices.find(i => i.id === id);
      if (invoice) {
        setFormData({
          clientId: invoice.clientId,
          taskIds: invoice.taskIds || [],
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          dueDate: invoice.dueDate ? new Date(invoice.dueDate.toDate ? invoice.dueDate.toDate() : invoice.dueDate).toISOString().split('T')[0] : '',
          reminderDate: invoice.reminderDate ? new Date(invoice.reminderDate.toDate ? invoice.reminderDate.toDate() : invoice.reminderDate).toISOString().slice(0, 16) : '',
        });
      }
    }
  }, [id, invoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const invoiceData = {
      ...formData,
      ownerId: user.uid,
      dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : null,
      reminderDate: formData.reminderDate ? Timestamp.fromDate(new Date(formData.reminderDate)) : null,
      updatedAt: Timestamp.now()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'invoices', id), invoiceData);
      } else {
        const newDocRef = doc(collection(db, 'invoices'));
        await setDoc(newDocRef, {
          ...invoiceData,
          createdAt: Timestamp.now()
        });

        // If we created this invoice from tasks, mark those tasks as invoiced
        if (formData.taskIds.length > 0) {
          for (const taskId of formData.taskIds) {
            await updateDoc(doc(db, 'tasks', taskId), { isInvoiced: true });
          }
        }
      }
      navigate('/invoices');
    } catch (error) {
      console.error("Error saving invoice", error);
    }
  };

  const calculateInvoiceTotal = (taskIds: string[], targetCurrency: string) => {
    const selectedTasks = tasks.filter(t => taskIds.includes(t.id));
    return selectedTasks.reduce((sum, t) => 
      sum + convertCurrency(t.amount || 0, t.currency || 'USD', targetCurrency, settings.usdToInrRate), 
    0);
  };

  const toggleTaskSelection = (taskId: string) => {
    setFormData(prev => {
      const isSelected = prev.taskIds.includes(taskId);
      const newTaskIds = isSelected 
        ? prev.taskIds.filter(id => id !== taskId)
        : [...prev.taskIds, taskId];
      
      const totalAmount = calculateInvoiceTotal(newTaskIds, prev.currency);
      
      return {
        ...prev,
        taskIds: newTaskIds,
        amount: totalAmount || prev.amount
      };
    });
  };

  useEffect(() => {
    // Re-calculate amount if currency changes
    if (formData.taskIds.length > 0) {
      setFormData(prev => ({
        ...prev,
        amount: calculateInvoiceTotal(prev.taskIds, prev.currency)
      }));
    }
  }, [formData.currency, settings.usdToInrRate]);

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClientName) return;
    try {
      const newClientRef = doc(collection(db, 'clients'));
      await setDoc(newClientRef, {
        name: newClientName,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setFormData(prev => ({ ...prev, clientId: newClientRef.id }));
      setNewClientName('');
      setIsAddingClient(false);
    } catch (error) {
      console.error("Error adding client", error);
    }
  };

  const clientTasks = tasks.filter(t => t.clientId === formData.clientId && (!t.isInvoiced || formData.taskIds.includes(t.id)));

  return (
    <div className="max-w-md mx-auto space-y-4">
      {isAddingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Quick Add Client</h3>
            <form onSubmit={handleAddClient} className="space-y-4">
              <input 
                type="text" 
                placeholder="CLIENT NAME"
                className="input font-bold"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">ADD CLIENT</button>
                <button type="button" onClick={() => setIsAddingClient(false)} className="btn-secondary">CANCEL</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
        <ArrowLeft size={12} />
        <span>BACK</span>
      </button>

      <div className="card p-5">
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight text-[var(--text-heading)]">{id ? 'EDIT INVOICE' : 'NEW INVOICE'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
              <label className="label-caps">Invoice NO</label>
              <input
                required
                type="text"
                className="input font-mono uppercase text-xs"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <label className="label-caps">Status</label>
              </div>
              <select
                required
                className="input font-bold h-9 py-1 text-xs"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="draft">DRAFT</option>
                <option value="sent">SENT</option>
                <option value="paid">PAID</option>
                <option value="overdue">OVERDUE</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <label className="label-caps">Client</label>
              <button 
                type="button"
                onClick={() => setIsAddingClient(true)}
                className="text-[9px] font-black text-[var(--primary)] uppercase hover:underline"
              >
                + New Client
              </button>
            </div>
            <select
              required
              className="input font-bold h-9 py-1 text-xs"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value, taskIds: [], amount: 0 })}
            >
              <option value="">SELECT CLIENT</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="label-caps">Link Tasks</label>
            <div className="border border-[var(--border-color)] rounded p-1.5 max-h-32 overflow-y-auto space-y-1 bg-[var(--bg-main)]/50">
              {clientTasks.length === 0 ? (
                <p className="p-2 text-center text-[10px] text-[var(--text-muted)] italic uppercase font-bold">No available tasks</p>
              ) : (
                clientTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => toggleTaskSelection(task.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      formData.taskIds.includes(task.id) 
                        ? 'bg-[var(--primary)] text-white' 
                        : 'hover:bg-[var(--bg-main)] text-[10px] font-bold uppercase text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase truncate">{task.title}</span>
                    {formData.taskIds.includes(task.id) && <Plus size={12} className="rotate-45" />}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="label-caps">Amount</label>
              <input
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                className="input text-lg font-black tabular-nums h-10"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className="label-caps">Currency</label>
              <select
                className="input font-black h-10 py-1 text-xs"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label-caps">Due Date</label>
              <input
                type="date"
                className="input font-bold h-9 py-1 text-xs"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="label-caps">Reminder</label>
              <input
                type="datetime-local"
                className="input font-bold h-9 py-1 text-xs"
                value={formData.reminderDate}
                onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button type="submit" className="btn-primary flex-1 py-2">
              <Save size={14} />
              <span>{id ? 'UPDATE INVOICE' : 'GENERATE INVOICE'}</span>
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

export default InvoiceForm;
