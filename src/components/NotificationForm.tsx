import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Users, User, Info, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, collection, getDocs, query, where } from '../lib/firebase';
import { motion } from 'motion/react';

const NotificationForm = () => {
  const { user, profile, addInAppNotification } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<'role' | 'individual'>('role');
  const [targetRole, setTargetRole] = useState<'admin' | 'manager'>('manager');
  const [targetUser, setTargetUser] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'system' | 'task' | 'invoice'>('system');
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const q = query(collection(db, 'profiles'));
        const snap = await getDocs(q);
        setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to fetch profiles", e);
      }
    };
    fetchProfiles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setLoading(true);

    try {
      let recipientIds: string[] = [];

      if (targetType === 'role') {
        const q = query(collection(db, 'profiles'), where('role', '==', targetRole));
        const snap = await getDocs(q);
        recipientIds = snap.docs.map(d => d.id).filter(id => id !== user?.uid);
      } else {
        recipientIds = [targetUser];
      }

      for (const recipientId of recipientIds) {
        await addInAppNotification(recipientId, title, message, type);
      }

      alert('Notification(s) sent successfully!');
      navigate(-1);
    } catch (e) {
      console.error("Failed to send notifications", e);
      alert('Failed to send notification. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Send Notification</h1>
          <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Broadcast messages to the team</p>
        </div>
      </div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="card space-y-6 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label-caps">Target Group</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType('role')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${targetType === 'role' ? 'border-[var(--primary)] bg-blue-500/10 text-[var(--primary)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}
              >
                <Users size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">By Role</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${targetType === 'individual' ? 'border-[var(--primary)] bg-blue-500/10 text-[var(--primary)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}
              >
                <User size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Individual</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-caps">
              {targetType === 'role' ? 'Select Role' : 'Select User'}
            </label>
            {targetType === 'role' ? (
              <select 
                className="input"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
              >
                <option value="admin">Admins</option>
                <option value="manager">Managers</option>
              </select>
            ) : (
              <select 
                className="input"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                required
              >
                <option value="">Select a user...</option>
                {profiles.filter(p => p.id !== user?.uid).map(p => (
                  <option key={p.id} value={p.id}>{p.displayName || p.id} ({p.role})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="label-caps">Notification Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'system', icon: Info, label: 'System', color: 'slate' },
                { id: 'task', icon: AlertTriangle, label: 'Task', color: 'blue' },
                { id: 'invoice', icon: Send, label: 'Invoice', color: 'emerald' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as any)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${type === t.id ? `border-${t.color}-500 bg-${t.color}-500/10 text-${t.color}-500` : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}
                >
                  <t.icon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="label-caps">Title</label>
            <input 
              type="text" 
              className="input font-black uppercase tracking-tight"
              placeholder="E.G. URGENT: CLIENT FEEDBACK"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="label-caps">Message</label>
            <textarea 
              className="input min-h-[120px] py-3 uppercase text-[11px] font-medium leading-relaxed"
              placeholder="What do you want to tell them?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary w-full py-4 justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send size={16} />
              <span>SEND NOTIFICATION NOW</span>
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
};

export default NotificationForm;
