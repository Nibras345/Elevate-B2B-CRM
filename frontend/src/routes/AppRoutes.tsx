import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { ShellLayout } from '../components/layout/ShellLayout';
import { SignIn } from '../pages/auth/SignIn';
import { Register } from '../pages/auth/Register';
import { Dashboard } from '../pages/Dashboard';
import { LeadsPipeline } from '../pages/LeadsPipeline';
import { Clients } from '../pages/Clients';
import { Invoices } from '../pages/Invoices';
import { Settings } from '../pages/Settings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<SignIn />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Multi-Tenant CRM Routes */}
      <Route element={<PrivateRoute />}>
        <Route element={<ShellLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsPipeline />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
