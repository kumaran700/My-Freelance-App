import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, User, signOut } from 'firebase/auth';
import { auth, db, onSnapshot, collection, query, where, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc } from '../lib/firebase';
import { Client, Task, Invoice, LedgerEntry, AppSettings, UserProfile } from '../types';

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  clients: Client[];
  tasks: Task[];
  invoices: Invoice[];
  ledger: LedgerEntry[];
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  deleteClient: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  deleteLedgerEntry: (id: string) => Promise<void>;
  bulkDelete: (type: 'clients' | 'tasks' | 'invoices' | 'ledger', ids: string[]) => Promise<void>;
  toggleTheme: () => void;
  refreshRates: () => Promise<void>;
  loginWithPassword: (password: string) => Promise<boolean>;
  updatePasswords: (adminPass: string, managerPass: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('kworks_clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('kworks_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('kworks_invoices');
    return saved ? JSON.parse(saved) : [];
  });
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
    const saved = localStorage.getItem('kworks_ledger');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('kworks_settings');
    return saved ? JSON.parse(saved) : { usdToInrRate: 83, theme: 'light', lastRateUpdate: '' };
  });

  const setSettings = (s: AppSettings) => {
    setSettingsState(s);
    localStorage.setItem('kworks_settings', JSON.stringify(s));
    if (user && profile?.role === 'admin') {
      updateDoc(doc(db, 'profiles', user.uid), { usdToInrRate: s.usdToInrRate });
    }
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setSettings({ ...settings, theme: newTheme });
  };

  const refreshRates = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data.rates && data.rates.INR) {
        const newRate = Math.round(data.rates.INR * 100) / 100;
        const newSettings = { 
          ...settings, 
          usdToInrRate: newRate,
          lastRateUpdate: new Date().toISOString()
        };
        setSettings(newSettings);
      }
    } catch (e) {
      console.error("Failed to fetch rate", e);
    }
  };

  const loginWithPassword = async (password: string): Promise<boolean> => {
    try {
      // 1. Fetch shared passwords publicly (rules allow this)
      let adminPass = '8525';
      let managerPass = '4545';
      
      try {
        const passDoc = await getDoc(doc(db, 'config', 'passwords'));
        if (passDoc.exists()) {
          adminPass = passDoc.data().admin;
          managerPass = passDoc.data().manager;
        }
      } catch (e) {
        console.warn("Could not fetch cloud passwords, using defaults", e);
      }

      const role = password === adminPass ? 'admin' : password === managerPass ? 'manager' : null;
      
      if (!role) return false;

      // 2. Sign in anonymously to get a session
      try {
        const res = await signInAnonymously(auth);
        const uid = res.user.uid;

        // 3. Update or create profile
        await setDoc(doc(db, 'profiles', uid), {
          uid,
          role,
          usdToInrRate: settings.usdToInrRate,
          displayName: role === 'admin' ? 'KARTHICK KUMARAN M' : 'Task Manager'
        });
        return true;
      } catch (authErr: any) {
        if (authErr.code === 'auth/admin-restricted-operation') {
          throw new Error("ANONYMOUS_AUTH_DISABLED");
        }
        throw authErr;
      }
    } catch (error: any) {
      if (error.message === 'ANONYMOUS_AUTH_DISABLED') throw error;
      console.error("Login failed", error);
      return false;
    }
  };

  const updatePasswords = async (admin: string, manager: string) => {
    if (profile?.role !== 'admin') return;
    await setDoc(doc(db, 'config', 'passwords'), { admin, manager });
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const pDoc = await getDoc(doc(db, 'profiles', u.uid));
        if (pDoc.exists()) {
          const pData = pDoc.data() as UserProfile;
          setProfile(pData);
          if (pData.usdToInrRate) {
            setSettingsState(prev => ({ ...prev, usdToInrRate: pData.usdToInrRate }));
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Auto Currency update
  useEffect(() => {
    refreshRates();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setClients([]);
      setTasks([]);
      setInvoices([]);
      setLedger([]);
      return;
    }

    // Role-based filtering: Managers only see tasks
    const unsubs: (() => void)[] = [];

    if (profile?.role === 'admin') {
      const qClients = query(collection(db, 'clients'), orderBy('name'));
      const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const qInvoices = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
      const qLedger = query(collection(db, 'ledger'), orderBy('date', 'desc'));

      unsubs.push(
        onSnapshot(qClients, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
          setClients(data);
          localStorage.setItem('kworks_clients', JSON.stringify(data));
        }),
        onSnapshot(qTasks, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
          setTasks(data);
          localStorage.setItem('kworks_tasks', JSON.stringify(data));
        }),
        onSnapshot(qInvoices, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)).filter(i => i.status !== 'archived');
          setInvoices(data);
          localStorage.setItem('kworks_invoices', JSON.stringify(data));
        }),
        onSnapshot(qLedger, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LedgerEntry));
          setLedger(data);
          localStorage.setItem('kworks_ledger', JSON.stringify(data));
        })
      );
    } else if (profile?.role === 'manager') {
      // Manager sees all tasks and clients
      const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const qClients = query(collection(db, 'clients'), orderBy('name'));
      unsubs.push(
        onSnapshot(qTasks, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
          setTasks(data);
          localStorage.setItem('kworks_tasks', JSON.stringify(data));
        }),
        onSnapshot(qClients, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
          setClients(data);
          localStorage.setItem('kworks_clients', JSON.stringify(data));
        })
      );
    }

    return () => unsubs.forEach(u => u());
  }, [user, profile]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const deleteClient = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
      const next = clients.filter(c => c.id !== id);
      setClients(next);
      localStorage.setItem('kworks_clients', JSON.stringify(next));
    } catch (e) {
      console.error("Delete client failed", e);
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
      const next = tasks.filter(t => t.id !== id);
      setTasks(next);
      localStorage.setItem('kworks_tasks', JSON.stringify(next));
    } catch (e) {
      console.error("Delete task failed", e);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
      const next = invoices.filter(i => i.id !== id);
      setInvoices(next);
      localStorage.setItem('kworks_invoices', JSON.stringify(next));
    } catch (e) {
      console.error("Delete invoice failed", e);
    }
  };

  const deleteLedgerEntry = async (id: string) => {
    if (!window.confirm('Delete this ledger entry?')) return;
    try {
      await deleteDoc(doc(db, 'ledger', id));
      const next = ledger.filter(l => l.id !== id);
      setLedger(next);
      localStorage.setItem('kworks_ledger', JSON.stringify(next));
    } catch (e) {
      console.error("Delete ledger failed", e);
    }
  };

  const bulkDelete = async (type: 'clients' | 'tasks' | 'invoices' | 'ledger', ids: string[]) => {
    if (ids.length === 0) return;
    const confirmMsg = `Are you sure you want to delete ${ids.length} ${type}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const promises = ids.map(id => deleteDoc(doc(db, type, id)));
      await Promise.all(promises);
      
      // Update local states optimistically
      const updateRef: Record<string, [any, any, string]> = {
        clients: [clients, setClients, 'kworks_clients'],
        tasks: [tasks, setTasks, 'kworks_tasks'],
        invoices: [invoices, setInvoices, 'kworks_invoices'],
        ledger: [ledger, setLedger, 'kworks_ledger'],
      };

      const [current, setter, key] = updateRef[type];
      const next = current.filter((item: any) => !ids.includes(item.id));
      setter(next);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.error(`Bulk delete ${type} failed`, e);
    }
  };

  const value = {
    user,
    profile,
    loading,
    clients,
    tasks,
    invoices,
    ledger,
    settings,
    setSettings,
    toggleTheme,
    refreshRates,
    loginWithPassword,
    updatePasswords,
    logout,
    deleteClient,
    deleteTask,
    deleteInvoice,
    deleteLedgerEntry,
    bulkDelete
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
