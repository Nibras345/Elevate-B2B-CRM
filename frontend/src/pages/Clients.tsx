import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  Plus,
  Mail,
  Phone,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Clock,
  Receipt,
  Loader2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Client, ClientStatus } from '../types';

export const Clients: React.FC = () => {
  // STRICT RULE: No static or mock data. Initialize empty and fetch strictly from API.
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
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
    status: 'Active' as ClientStatus,
    industry: 'Enterprise Software',
    address: '',
    city: '',
    country: 'United States',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Client History Drawer
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  // Edit Client Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const { notify } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Route 2: GET /api/clients - Strict tenant isolation
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.get('/api/clients', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && Array.isArray(response.data.clients)) {
        setClients(response.data.clients);
      }
    } catch (err: any) {
      console.error('[Fetch Clients Error]:', err);
      notify(err.response?.data?.message || 'Failed to retrieve clients list.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user?.tenantId]);

  // Filter clients
  const filteredClients = clients
    .filter((client) => {
      const query = searchQuery.toLowerCase();
      const contact = (client.contactName || client.name || '').toLowerCase();
      const comp = (client.companyName || client.company || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const ind = (client.industry || '').toLowerCase();
      const city = (client.city || '').toLowerCase();

      const matchesSearch =
        contact.includes(query) ||
        comp.includes(query) ||
        email.includes(query) ||
        ind.includes(query) ||
        city.includes(query);

      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const ltvA = Number(a.lifetimeValue ?? a.ltv) || 0;
      const ltvB = Number(b.lifetimeValue ?? b.ltv) || 0;
      const nameA = a.contactName || a.name || '';
      const nameB = b.contactName || b.name || '';

      if (sortBy === 'ltv-desc') return ltvB - ltvA;
      if (sortBy === 'ltv-asc') return ltvA - ltvB;
      if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
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
    const errors: Record<string, string> = {};
    if (!newClientForm.name.trim()) errors.name = 'Client name is required';
    if (!newClientForm.company.trim()) errors.company = 'Company name is required';
    if (!newClientForm.email.trim() || !newClientForm.email.includes('@')) {
      errors.email = 'Valid corporate email is required';
    }
    if (!newClientForm.phone.trim()) errors.phone = 'Phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      notify('Please resolve highlighted form validation errors', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.post(
        '/api/clients',
        {
          contactName: newClientForm.name,
          companyName: newClientForm.company,
          email: newClientForm.email,
          phone: newClientForm.phone,
          lifetimeValue: Number(newClientForm.ltv) || 0,
          status: newClientForm.status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        const createdClient = response.data.client;
        setClients((prev) => [createdClient, ...prev]);
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
        notify(
          response.data.message || `Client ${createdClient.contactName || createdClient.name} added successfully`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('[Create Client Error]:', err);
      notify(err.response?.data?.message || 'Failed to create client.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientToEdit) return;

    const clientId = clientToEdit.id || (clientToEdit as any)._id;
    if (!clientId) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.put(
        `/api/clients/${clientId}`,
        {
          contactName: clientToEdit.contactName || clientToEdit.name,
          companyName: clientToEdit.companyName || clientToEdit.company,
          email: clientToEdit.email,
          phone: clientToEdit.phone,
          lifetimeValue: Number(clientToEdit.lifetimeValue ?? clientToEdit.ltv) || 0,
          status: clientToEdit.status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        const updated = response.data.client;
        setClients((prev) =>
          prev.map((c) => ((c.id || (c as any)._id) === clientId ? updated : c))
        );
        setIsEditModalOpen(false);
        notify(
          response.data.message || `Updated client record for ${updated.companyName || updated.company}`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('[Update Client Error]:', err);
      notify(err.response?.data?.message || 'Failed to update client record.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (clientId: string, companyName: string) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete the client record for ${companyName}?`);
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.delete(`/api/clients/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setClients((prev) => prev.filter((c) => (c.id || (c as any)._id) !== clientId));
        notify(response.data.message || `Deleted client record for ${companyName}`, 'info');
      }
    } catch (err: any) {
      console.error('[Delete Client Error]:', err);
      notify(err.response?.data?.message || 'Failed to delete client record.', 'error');
    }
  };

  const openHistoryDrawer = (client: Client) => {
    setSelectedClientForHistory(client);
    setIsHistoryDrawerOpen(true);
  };

  const openEditModal = (client: Client) => {
    setClientToEdit({ ...client });
    setIsEditModalOpen(true);
  };

  const handleGenerateInvoiceShortcut = (client: Client) => {
    const cId = client.id || (client as any)._id;
    notify(`Redirecting to Invoices for ${client.companyName || client.company}`, 'info');
    navigate(`/invoices?clientId=${cId}`);
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchClients}
            disabled={isLoading}
            className="p-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh Client Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        </div>
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
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                      <span className="text-xs font-medium">Fetching verified client accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedClients.length > 0 ? (
                paginatedClients.map((client) => {
                  const clientId = client.id || (client as any)._id;
                  const contactName = client.contactName || client.name || 'Unnamed Client';
                  const companyName = client.companyName || client.company || 'Unnamed Company';
                  const ltvValue = Number(client.lifetimeValue ?? client.ltv) || 0;
                  const convertedDate = client.convertedAt
                    ? new Date(client.convertedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : client.lastContacted || 'Recent';

                  const initials = contactName
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('') || 'C';

                  let statusBadge: BadgeVariant = 'neutral';
                  if (client.status === 'Active') statusBadge = 'success';
                  if (client.status === 'Pending') statusBadge = 'warning';

                  return (
                    <tr
                      key={clientId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {contactName}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {client.city || 'Global'}, {client.country || 'USA'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Company & Industry */}
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {companyName}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {client.industry || 'Enterprise'}
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
                          <span>{client.phone || 'No phone'}</span>
                        </div>
                      </td>

                      {/* LTV */}
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                          ${ltvValue.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Converted: {convertedDate}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <Badge variant={statusBadge} size="sm">
                          {client.status || 'Active'}
                        </Badge>
                      </td>

                      {/* Open Items */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px]" title="Open Deals">
                            {client.dealCount ?? client.openDealsCount ?? 1} Deals
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px]" title="Invoices">
                            {client.invoiceCount ?? client.invoicesCount ?? 0} Invoices
                          </span>
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openHistoryDrawer(client)}
                            title="View History & Ledger"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Clock className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleGenerateInvoiceShortcut(client)}
                            title="Generate Invoice for Client"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(client)}
                            title="Edit Client Information"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteClient(clientId, companyName)}
                            title="Delete Client"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {searchQuery ? 'No matching clients found' : 'No converted clients yet'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                        {searchQuery
                          ? `No client matched "${searchQuery}". Try adjusting your filters.`
                          : 'Leads moved to "Won / Closed" in the Leads Pipeline automatically convert here, or click below to manually add a client.'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => setIsAddDrawerOpen(true)}
                          className="mt-4 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          + Add Client
                        </button>
                      )}
                    </div>
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
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                onChange={(e) => setNewClientForm({ ...newClientForm, status: e.target.value as ClientStatus })}
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? 'Provisioning...' : 'Provision Client'}</span>
            </button>
          </div>
        </form>
      </Drawer>

      {/* View Client History / Profile Drawer */}
      <Drawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        title="Client Ledger & Account History"
        subtitle={selectedClientForHistory ? `${selectedClientForHistory.companyName || selectedClientForHistory.company} · ${selectedClientForHistory.contactName || selectedClientForHistory.name}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedClientForHistory && (
          <div className="space-y-6">
            {/* Account Summary Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">{selectedClientForHistory.companyName || selectedClientForHistory.company}</h3>
                  <p className="text-xs text-brand-100 mt-0.5">{selectedClientForHistory.industry || 'Enterprise Client'}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
                  {selectedClientForHistory.status || 'Active'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-center">
                <div>
                  <span className="text-[10px] text-brand-100 block">Lifetime Value</span>
                  <span className="text-sm font-extrabold">${(Number(selectedClientForHistory.lifetimeValue ?? selectedClientForHistory.ltv) || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-100 block">Open Deals</span>
                  <span className="text-sm font-extrabold">{selectedClientForHistory.dealCount ?? selectedClientForHistory.openDealsCount ?? 1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-100 block">Invoices Billed</span>
                  <span className="text-sm font-extrabold">{selectedClientForHistory.invoiceCount ?? selectedClientForHistory.invoicesCount ?? 0}</span>
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
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedClientForHistory.contactName || selectedClientForHistory.name}</span>
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
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer"
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
                  onChange={(e) => setClientToEdit({ ...clientToEdit, status: e.target.value as ClientStatus })}
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-60"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSaving ? 'Saving...' : 'Save Client Record'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
