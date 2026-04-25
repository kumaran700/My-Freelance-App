import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, X, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { db, collection, doc, setDoc, updateDoc, Timestamp } from '../lib/firebase';

import { formatCurrency } from '../lib/formatters';

const TaskForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  
  const { clients, tasks, user, profile } = useAppContext();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    clientId: preSelectedClientId || '',
    description: '',
    amount: 0,
    currency: 'INR' as 'USD' | 'INR', // Default to INR based on user request example
    status: 'pending' as any,
    dueDate: '',
    reminderDate: '',
    checklist: [] as { id: string; text: string; price: number; completed: boolean }[]
  });

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistPrice, setNewChecklistPrice] = useState('');
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

  useEffect(() => {
    if (id) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        setFormData({
          title: task.title,
          clientId: task.clientId,
          description: task.description || '',
          amount: task.amount || 0,
          currency: task.currency || 'USD',
          status: task.status,
          dueDate: task.dueDate ? new Date(task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate).toISOString().split('T')[0] : '',
          reminderDate: task.reminderDate ? new Date(task.reminderDate.toDate ? task.reminderDate.toDate() : task.reminderDate).toISOString().slice(0, 16) : '',
          checklist: task.checklist || []
        });
      }
    }
  }, [id, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const taskData = {
      ...formData,
      ownerId: user.uid,
      dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : null,
      reminderDate: formData.reminderDate ? Timestamp.fromDate(new Date(formData.reminderDate)) : null,
      updatedAt: Timestamp.now()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'tasks', id), taskData);
      } else {
        const newDocRef = doc(collection(db, 'tasks'));
        await setDoc(newDocRef, {
          ...taskData,
          createdAt: Timestamp.now()
        });
      }
      navigate('/tasks');
    } catch (error) {
      console.error("Error saving task", error);
    }
  };

  const calculateTotal = (list: any[]) => {
    return list.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const addChecklistItem = () => {
    if (newChecklistText.trim()) {
      const newList = [
        ...formData.checklist, 
        { 
          id: Math.random().toString(36).substr(2, 9),
          text: newChecklistText.trim(), 
          price: parseFloat(newChecklistPrice) || 0,
          completed: false 
        }
      ];
      setFormData({
        ...formData,
        checklist: newList,
        amount: calculateTotal(newList)
      });
      setNewChecklistText('');
      setNewChecklistPrice('');
    }
  };

  const removeChecklistItem = (index: number) => {
    const newList = [...formData.checklist];
    newList.splice(index, 1);
    setFormData({ 
      ...formData, 
      checklist: newList,
      amount: calculateTotal(newList)
    });
  };

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
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight text-[var(--text-heading)]">{id ? 'EDIT TASK' : 'NEW TASK'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="label-caps">Task Title</label>
            <input
              required
              type="text"
              placeholder="What needs to be done?"
              className="input font-bold"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <label className="label-caps">Client</label>
                <button 
                  type="button"
                  onClick={() => setIsAddingClient(true)}
                  className="text-[9px] font-black text-[var(--primary)] uppercase hover:underline"
                >
                  + Add New Client
                </button>
              </div>
              <select
                required
                className="input font-bold h-9 py-1 text-xs"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">SELECT CLIENT</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="label-caps">Amount {formData.checklist.length > 0 && '(Auto-calculated)'}</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly={formData.checklist.length > 0}
                  className={`input font-bold h-9 py-1 text-xs ${formData.checklist.length > 0 ? 'bg-[var(--bg-main)] cursor-not-allowed opacity-70' : ''}`}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-caps">Currency</label>
                <select
                  className="input font-bold h-9 py-1 text-xs"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="label-caps">Status</label>
            <select
              className="input font-bold h-9 py-1 text-xs"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="pending">PENDING</option>
              <option value="ongoing">ONGOING</option>
              <option value="completed">COMPLETED</option>
              <option value="invoiced">INVOICED</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="label-caps">Description</label>
            <textarea
              placeholder="Task details..."
              className="input min-h-[80px] text-xs font-medium"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <label className="label-caps">Itemized Checklist & Pricing</label>
              <div className="space-y-1.5">
                {formData.checklist.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-1.5">
                    <div className="flex-1 px-3 py-2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] text-[10px] uppercase font-black flex items-center justify-between">
                      <span className="truncate">{item.text}</span>
                      <span className="text-[var(--primary)] ml-2">{formatCurrency(item.price, formData.currency)}</span>
                    </div>
                    <button type="button" onClick={() => removeChecklistItem(idx)} className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                <div className="grid grid-cols-12 gap-1.5 pt-1">
                  <div className="col-span-7">
                    <input
                      type="text"
                      placeholder="DESCRIPTION"
                      className="input h-9 text-[10px] font-black"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="PRICE"
                      className="input h-9 text-[10px] font-black px-2"
                      value={newChecklistPrice}
                      onChange={(e) => setNewChecklistPrice(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <button 
                      type="button" 
                      onClick={addChecklistItem}
                      className="btn-primary w-full h-9 flex items-center justify-center !p-0"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isAdmin && formData.checklist.length > 0 && (
            <div className="space-y-2">
              <label className="label-caps">Task Checklist</label>
              <div className="space-y-1.5">
                {formData.checklist.map((item, idx) => (
                  <div key={item.id || idx} className="flex px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-[10px] uppercase font-black">
                    <span className="truncate">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              <span>{id ? 'UPDATE TASK' : 'SAVE TASK'}</span>
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

export default TaskForm;
