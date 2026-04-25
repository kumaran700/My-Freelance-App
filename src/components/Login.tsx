import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Login = () => {
  const { loginWithPassword } = useAppContext();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setError(false);
    
    try {
      const success = await loginWithPassword(password);
      if (!success) {
        setError(true);
        setLoading(false);
      }
    } catch (err: any) {
      if (err.message === 'ANONYMOUS_AUTH_DISABLED') {
        setMsg("CRITICAL: Anonymous Authentication is disabled. Please enable it in Firebase Console > Authentication > Sign-in method.");
      } else {
        setMsg("An unexpected error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  const [msg, setMsg] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
      <div className="max-w-[320px] w-full card p-6 text-center space-y-6 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-blue-600 dark:text-blue-500 uppercase tracking-tighter leading-none">KWORKS</h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Freelance Business OS</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Passkey</label>
            <div className="relative">
              <input 
                type="password"
                placeholder="••••"
                className={`input w-full pl-9 h-11 text-center font-black tracking-[0.5em] text-lg !bg-white !text-slate-900 border-slate-200 focus:ring-blue-500 ${error || msg ? 'border-rose-500 !bg-rose-50' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
            {error && <p className="text-[10px] text-rose-500 font-black uppercase mt-1 text-center">Invalid Passkey</p>}
            {msg && <p className="text-[10px] text-rose-500 font-bold leading-tight mt-2 text-left uppercase">{msg}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 dark:bg-blue-600 text-white rounded font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <span>ACCESS DASHBOARD</span>}
          </button>
        </form>

        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
          Manage tasks, invoices & ledger in one high-density interface.
        </p>
      </div>
    </div>
  );
};

export default Login;
