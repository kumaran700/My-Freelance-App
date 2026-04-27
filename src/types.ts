export type Currency = 'USD' | 'INR';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  price: number;
  completed: boolean;
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description: string;
  amount: number; // Total calculated from checklist
  currency: Currency;
  checklist: TaskChecklistItem[];
  status: 'pending' | 'ongoing' | 'completed' | 'invoiced';
  isInvoiced?: boolean;
  dueDate?: any;
  reminderDate?: any;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Invoice {
  id: string;
  clientId: string;
  taskIds: string[];
  invoiceNumber: string;
  amount: number;
  advancePaid?: number;
  currency: Currency;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'archived' | 'partially_paid';
  dueDate?: any;
  reminderDate?: any;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
  roundOff?: number;
}

export interface LedgerEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number; // Base currency (INR)
  originalAmount: number;
  originalCurrency: Currency;
  description: string;
  category: string;
  date: any;
  invoiceId?: string;
  ownerId: string;
  createdAt: any;
}

export interface AppSettings {
  usdToInrRate: number;
  theme: 'light' | 'dark';
  lastRateUpdate?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'invoice' | 'system';
  read: boolean;
  createdAt: any;
  link?: string;
}

export interface UserProfile {
  uid: string;
  role: 'admin' | 'manager';
  password?: string;
  usdToInrRate: number;
  displayName: string;
}
