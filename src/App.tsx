/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientDetails from './components/ClientDetails';
import ClientForm from './components/ClientForm';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import InvoiceView from './components/InvoiceView';
import Ledger from './components/Ledger';
import LedgerForm from './components/LedgerForm';
import NotificationForm from './components/NotificationForm';
import Settings from './components/Settings';
import Login from './components/Login';
import PublicInvoiceView from './components/PublicInvoiceView';

const AppRoutes = () => {
  const { user, profile, loading, settings } = useAppContext();

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings?.theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/public/invoice/:id" element={<PublicInvoiceView />} />
      
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          
          {/* Managed routes */}
          <Route path="/clients" element={<ClientList />} />
          <Route path="/clients/:id" element={<ClientDetails />} />
          
          {/* Admin only routes */}
          {profile?.role === 'admin' && (
            <>
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/edit/:id" element={<ClientForm />} />
              
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceView />} />
              <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
              
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/ledger/new" element={<LedgerForm />} />
              <Route path="/settings" element={<Settings />} />
            </>
          )}
          
          {/* Shared/Manager routes */}
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/new" element={<TaskForm />} />
          <Route path="/tasks/:id" element={<TaskForm />} />
          <Route path="/tasks/edit/:id" element={<TaskForm />} />
          
          <Route path="/notifications/send" element={<NotificationForm />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
