import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Building,
  DollarSign,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  FileText,
  Clock,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { initialClients } from '../data/mockData';
import { Badge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';

export const Clients = () => {
  const [clients, setClients] = useState(initialClients);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('ltv-desc'); // ltv-desc, ltv-asc, name-asc
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Add Client Drawer
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    ltv: '',
    status: 'Active',
    industry: 'Enterprise Software',
    address: '',
    city: '',
    country: 'United States',
  });
  const [formErrors, setFormErrors] = useState({});

  // Client History Drawer
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);

  // Edit Client Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);

  const { notify } = useNotification();
  const navigate = useNavigate();

  // Filter clients
  const filteredClients = clients
    .filter((client) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        client.name.toLowerCase().includes(query) ||
        client.company.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.industry.toLowerCase().includes(query) ||
        client.city.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'ltv-desc') return b.ltv - a.ltv;
      if (sortBy === 'ltv-asc') return a.ltv - b.ltv;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!newClientForm.name.trim()) errors.name = 'Client name is required';
    if (!newClientForm.company.trim()) errors.company = 'Company name is required';
    if (!newClientForm.email.trim() || !newClientForm.email.includes('@')) {
      errors.email = 'Valid corporate email is required';
    }
    if (!newClientForm.phone.trim()) errors.phone = 'Phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateClient = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      notify('Please resolve highlighted form validation errors', 'warning');
      return;
    }

    const createdClient = {
      id: `cli-${Date.now()}`,
      name: newClientForm.name,
      company: newClientForm.company,
      email: newClientForm.email,
      phone: newClientForm.phone,
      ltv: Number(newClientForm.ltv) || 15000,
      status: newClientForm.status,
      industry: newClientForm.industry,
      lastContacted: new Date().toISOString().split('T')[0],
      address: newClientForm.address || '100 Business Parkway',
      city: newClientForm.city || 'Austin, TX',
      country: newClientForm.country,
      openDealsCount: 1,
      invoicesCount: 0,
    };

    setClients([createdClient, ...clients]);
    setIsAddDrawerOpen(false);
    setNewClientForm({
      name: '',
      company: '',
      email: '',
      phone: '',
      ltv: '',
      status: 'Active',
      industry: 'Enterprise Software',
      address: '',
      city: '',
      country: 'United States',
    });
    setFormErrors({});
    notify(`Client ${createdClient.name} (${createdClient.company}) added successfully`, 'success');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setClients((prev) =>
      prev.map((c) => (c.id === clientToEdit.id ? clientToEdit : c))
    );
    setIsEditModalOpen(false);
    notify(`Updated client record for ${clientToEdit.company}`, 'success');
  };

  const handleDeleteClient = (clientId, companyName) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    notify(`Deleted client record for ${companyName}`, 'info');
  };

  const openHistoryDrawer = (client) => {
    setSelectedClientForHistory(client);
    setIsHistoryDrawerOpen(true);
  };

  const openEditModal = (client) => {
    setClientToEdit({ ...client });
    setIsEditModalOpen(true);
  };

  const handleGenerateInvoiceShortcut = (client) => {
    notify(`Redirecting to Invoices for ${client.company}`, 'info');
    navigate(`/invoices?clientId=${client.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Client Directory
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {clients.length} Total Accounts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Searchable multi-tenant client database, lifetime value metrics, and historical ledgers
          </p>
        </div>

        <button
          onClick={() => setIsAddDrawerOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by client, company, email, city..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Status filter tabs & Sort selector */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {['All', 'Active', 'Pending', 'Inactive'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="ltv-desc">Highest LTV</option>
              <option value="ltv-asc">Lowest LTV</option>
              <option value="name-asc">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client Database Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Client & Location</th>
                <th className="py-3.5 px-4">Company & Industry</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Lifetime Value (LTV)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Open Items</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {paginatedClients.length > 0 ? (
                paginatedClients.map((client) => {
                  let statusBadge = 'neutral';
                  if (client.status === 'Active') statusBadge = 'success';
                  if (client.status === 'Pending') statusBadge = 'warning';

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {client.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {client.city}, {client.country}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Company & Industry */}
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {client.company}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {client.industry}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[170px]">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.phone}</span>
                        </div>
                      </td>

                      {/* LTV */}
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                          ${client.ltv.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Last deal: {client.lastContacted}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <Badge variant={statusBadge} size="sm">
                          {client.status}
                        </Badge>
                      </td>

                      {/* Open Items */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px]" title="Open Deals">
                            {client.openDealsCount} Deals
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px]" title="Invoices">
                            {client.invoicesCount} Invoices
                          </span>
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openHistoryDrawer(client)}
                            title="View History & Ledger"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleGenerateInvoiceShortcut(client)}
                            title="Generate Invoice for Client"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(client)}
                            title="Edit Client Information"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteClient(client.id, client.company)}
                            title="Delete Client"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No clients found matching the query "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredClients.length)}</strong> to{' '}
            <strong className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredClients.length)}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{filteredClients.length}</strong> clients
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  currentPage === page
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add New Client Slide-over Drawer with Validation States */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Add New Enterprise Client"
        subtitle="Provision client account profile with LTV projection and contact info"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          {/* Client Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Primary Contact Full Name *
            </label>
            <input
              type="text"
              value={newClientForm.name}
              onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
              placeholder="e.g. Jessica Sterling"
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white ${
                formErrors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {formErrors.name && (
              <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.name}</span>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={newClientForm.company}
              onChange={(e) => setNewClientForm({ ...newClientForm, company: e.target.value })}
              placeholder="e.g. Quantum Analytics Ltd"
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white ${
                formErrors.company ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {formErrors.company && (
              <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.company}</span>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Corporate Email *
              </label>
              <input
                type="email"
                value={newClientForm.email}
                onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                placeholder="contact@quantumanalytics.io"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white ${
                  formErrors.email ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {formErrors.email && (
                <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.email}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                placeholder="+1 (555) 789-0123"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white ${
                  formErrors.phone ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {formErrors.phone && (
                <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.phone}</span>
              )}
            </div>
          </div>

          {/* Initial LTV & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Lifetime Value ($ USD)
              </label>
              <input
                type="number"
                value={newClientForm.ltv}
                onChange={(e) => setNewClientForm({ ...newClientForm, ltv: e.target.value })}
                placeholder="e.g. 45000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Client Status
              </label>
              <select
                value={newClientForm.status}
                onChange={(e) => setNewClientForm({ ...newClientForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending Contract</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Industry & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Industry Sector
              </label>
              <select
                value={newClientForm.industry}
                onChange={(e) => setNewClientForm({ ...newClientForm, industry: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option>Enterprise Software</option>
                <option>Biotechnology & Health</option>
                <option>Renewable Energy</option>
                <option>Investment Banking</option>
                <option>Robotics & AI</option>
                <option>E-commerce & Retail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={newClientForm.country}
                onChange={(e) => setNewClientForm({ ...newClientForm, country: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={newClientForm.address}
                onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                placeholder="400 Silicon Way"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                City & State
              </label>
              <input
                type="text"
                value={newClientForm.city}
                onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                placeholder="San Jose, CA"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20"
            >
              Provision Client
            </button>
          </div>
        </form>
      </Drawer>

      {/* View Client History / Profile Drawer */}
      <Drawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        title="Client Ledger & Account History"
        subtitle={selectedClientForHistory ? `${selectedClientForHistory.company} · ${selectedClientForHistory.name}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedClientForHistory && (
          <div className="space-y-6">
            {/* Account Summary Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">{selectedClientForHistory.company}</h3>
                  <p className="text-xs text-brand-100 mt-0.5">{selectedClientForHistory.industry}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
                  {selectedClientForHistory.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-center">
                <div>
                  <span className="text-[10px] text-brand-100 block">Lifetime Value</span>
                  <span className="text-sm font-extrabold">${selectedClientForHistory.ltv.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-100 block">Open Deals</span>
                  <span className="text-sm font-extrabold">{selectedClientForHistory.openDealsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-100 block">Invoices Billed</span>
                  <span className="text-sm font-extrabold">{selectedClientForHistory.invoicesCount}</span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Billing & Contact Profile
              </span>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Primary Contact:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedClientForHistory.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Work Email:</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">{selectedClientForHistory.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Phone:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedClientForHistory.phone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Address:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedClientForHistory.address}, {selectedClientForHistory.city}, {selectedClientForHistory.country}
                </span>
              </div>
            </div>

            {/* Historical Timeline of Transactions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audit Trail & Historical Events
              </h4>

              <div className="space-y-3">
                {[
                  {
                    title: 'Enterprise Subscription Invoiced',
                    date: 'Feb 28, 2025',
                    desc: 'Generated and processed annual recurring contract',
                    amount: '$64,000',
                  },
                  {
                    title: 'Account Executive QBR Completed',
                    date: 'Jan 15, 2025',
                    desc: 'Reviewed seat utilization and API integration metrics',
                    amount: null,
                  },
                  {
                    title: 'Initial Tenant Onboarding Executed',
                    date: 'Oct 10, 2024',
                    desc: 'Master Agreement executed and database instance provisioned',
                    amount: '$42,000',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">{item.desc}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">{item.date}</span>
                    </div>
                    {item.amount && (
                      <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {item.amount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => handleGenerateInvoiceShortcut(selectedClientForHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20"
              >
                <Receipt className="w-4 h-4" />
                <span>Issue New Invoice</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client Information"
        subtitle={clientToEdit ? `Updating profile for ${clientToEdit.company}` : ''}
        maxWidth="max-w-lg"
      >
        {clientToEdit && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                required
                value={clientToEdit.name}
                onChange={(e) => setClientToEdit({ ...clientToEdit, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={clientToEdit.company}
                onChange={(e) => setClientToEdit({ ...clientToEdit, company: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={clientToEdit.email}
                  onChange={(e) => setClientToEdit({ ...clientToEdit, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  required
                  value={clientToEdit.phone}
                  onChange={(e) => setClientToEdit({ ...clientToEdit, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lifetime Value ($ USD)
                </label>
                <input
                  type="number"
                  required
                  value={clientToEdit.ltv}
                  onChange={(e) => setClientToEdit({ ...clientToEdit, ltv: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={clientToEdit.status}
                  onChange={(e) => setClientToEdit({ ...clientToEdit, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20"
              >
                Save Client Record
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
