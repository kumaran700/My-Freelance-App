import React, { useState, useEffect } from 'react';
import { Globe, Moon, Sun, ShieldCheck, KeyRound, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, doc, getDoc } from '../lib/firebase';

const Settings = () => {
  const { settings, setSettings, toggleTheme, updatePasswords, profile } = useAppContext();
  const [adminPass, setAdminPass] = useState('');
  const [managerPass, setManagerPass] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchPass = async () => {
      const d = await getDoc(doc(db, 'config', 'passwords'));
      if (d.exists()) {
        setAdminPass(d.data().admin);
        setManagerPass(d.data().manager);
      } else {
        setAdminPass('8525');
        setManagerPass('4545');
      }
    };
    fetchPass();
  }, []);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, usdToInrRate: parseFloat(e.target.value) || 0 });
  };

  const handleSavePasswords = async () => {
    setStatus('saving');
    try {
      await updatePasswords(adminPass, managerPass);
      setStatus('success');
      setTimeout(() => setStatus(''), 2000);
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-black uppercase tracking-tight">SETTINGS</h2>
      </div>

      <div className="card p-5 space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <Globe size={16} />
            <h3 className="font-black text-xs uppercase tracking-widest leading-none">CURRENCY & CONVERSION</h3>
          </div>
          <p className="text-[10px] text-indigo-400 font-bold uppercase leading-relaxed">Set the base conversion rate for USD invoices to be calculated in INR on your dashboard.</p>
          <div className="space-y-1">
            <label className="label-caps">1 USD = ? INR</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                className="input font-black w-24 h-9 py-1 text-sm bg-indigo-50/50"
                value={settings.usdToInrRate}
                onChange={handleRateChange}
              />
              <span className="text-[10px] font-black text-indigo-300 uppercase">INR</span>
            </div>
          </div>
        </section>

        {profile?.role === 'admin' && (
          <section className="space-y-4 pt-6 border-t border-indigo-50">
            <div className="flex items-center gap-2 text-rose-500">
              <ShieldCheck size={16} />
              <h3 className="font-black text-xs uppercase tracking-widest leading-none">SECURITY & PASSKEYS</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="label-caps">Admin Passkey</label>
                <div className="relative">
                  <input 
                    type="password"
                    className="input pl-8 font-black bg-indigo-50/50"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                  />
                  <KeyRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="label-caps">Manager Passkey</label>
                <div className="relative">
                  <input 
                    type="password"
                    className="input pl-8 font-black bg-indigo-50/50"
                    value={managerPass}
                    onChange={(e) => setManagerPass(e.target.value)}
                  />
                  <KeyRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300" />
                </div>
              </div>
              <button 
                onClick={handleSavePasswords}
                disabled={status === 'saving'}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Save size={14} />
                <span>{status === 'saving' ? 'SAVING...' : status === 'success' ? 'SAVED!' : 'UPDATE PASSKEYS'}</span>
              </button>
            </div>
          </section>
        )}

        <section className="space-y-3 pt-6 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-[var(--primary)]">
            {settings.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
            <h3 className="font-black text-xs uppercase tracking-widest leading-none">APPEARANCE</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight">THEME MODE</p>
              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Switch between light and dark versions.</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${settings.theme === 'dark' ? 'bg-[var(--primary)]' : 'bg-slate-200'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'} shadow-sm`} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
