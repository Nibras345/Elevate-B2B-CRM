import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Plus,
  Search,
  Printer,
  Trash2,
  Eye,
  Check,
  Building2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { initialInvoices } from '../data/mockData';
import { Modal } from '../components/common/Modal';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Invoice, InvoiceItem, InvoiceStatus, Client } from '../types';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Dynamic Clients state for Invoice Generator Modal
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);

  // Generator Modal state
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dueDate, setDueDate] = useState('2025-04-15');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [taxPercent, setTaxPercent] = useState(10);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('Thank you for partnering with us. Payment is due within 30 days of issuance.');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Enterprise Platform Subscription (Quarterly)', quantity: 1, unitPrice: 24000, amount: 24000 },
    { id: '2', description: 'Dedicated Solution Architect & Onboarding', quantity: 1, unitPrice: 8500, amount: 8500 },
  ]);

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeInvoiceForPreview, setActiveInvoiceForPreview] = useState<Invoice | null>(null);

  const { notify } = useNotification();
  const { user, tenantSettings } = useAuth();

  // Dynamic fetch clients when Generator Modal opens
  useEffect(() => {
    if (isGeneratorOpen) {
      const fetchClientsForInvoice = async () => {
        try {
          setIsLoadingClients(true);
          const token = localStorage.getItem('nexcrm_jwt_token');
          const response = await axios.get('/api/clients', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.data.success && Array.isArray(response.data.clients)) {
            setClients(response.data.clients);
            // Handle pre-selected client or default selection
            if (preselectedClientId) {
              setSelectedClientId(preselectedClientId);
            } else if (!selectedClientId && response.data.clients.length > 0) {
              const firstClient = response.data.clients[0];
              setSelectedClientId(firstClient._id || firstClient.id || '');
            }
          }
        } catch (error: any) {
          console.error('[Fetch Clients for Invoice Error]:', error);
          notify(error.response?.data?.message || 'Failed to fetch enterprise clients.', 'error');
        } finally {
          setIsLoadingClients(false);
        }
      };

      fetchClientsForInvoice();
    }
  }, [isGeneratorOpen, user?.tenantId, preselectedClientId]);

  // Handle client pre-selection from Client Directory shortcut
  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
      setIsGeneratorOpen(true);
    }
  }, [preselectedClientId]);

  // Summary Metrics calculations
  const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.total, 0);
  const paidTotal = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.total, 0);
  const pendingTotal = invoices.filter(i => i.status === 'Pending').reduce((acc, curr) => acc + curr.total, 0);
  const overdueTotal = invoices.filter(i => i.status === 'Overdue').reduce((acc, curr) => acc + curr.total, 0);

  // Dynamic calculations in Generator
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice) || 0), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
  const grandTotal = taxableAmount + taxAmount;

  // Add Item Row
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: String(Date.now()),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  // Remove Item Row
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      notify('An invoice must have at least one line item', 'warning');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  // Update Item field
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        updated.amount = (qty || 0) * (price || 0);
        return updated;
      }
      return item;
    }));
  };

  // Submit invoice generation
  const handleGenerateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      notify('Please select an enterprise client', 'warning');
      return;
    }

    const client = clients.find(c => (c._id || c.id) === selectedClientId);
    const clientName = client ? (client.contactName || client.name) : 'Valued Client';
    const company = client ? (client.companyName || client.company) : 'Enterprise Client';
    const email = client ? client.email : '';
    const generatedId = `INV-2025-${String(invoices.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: generatedId,
      clientId: selectedClientId,
      clientName,
      company,
      email,
      issueDate: today,
      dueDate: dueDate,
      items: items.map(item => ({
        ...item,
        amount: Number(item.quantity) * Number(item.unitPrice),
      })),
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: grandTotal,
      status: 'Pending',
      paymentTerms,
      notes: invoiceNotes,
    };

    // Persist invoice in backend MongoDB database for accurate client invoiceCount metrics
    try {
      const token = localStorage.getItem('nexcrm_jwt_token');
      await axios.post(
        '/api/invoices',
        {
          clientId: selectedClientId,
          clientName,
          company,
          email,
          invoiceNumber: generatedId,
          dueDate,
          items: newInvoice.items,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total: grandTotal,
          status: 'Pending',
          paymentTerms,
          notes: invoiceNotes,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (apiErr) {
      console.warn('[Invoice Persistence Warning]:', apiErr);
    }

    setInvoices([newInvoice, ...invoices]);
    setIsGeneratorOpen(false);
    setActiveInvoiceForPreview(newInvoice);
    setIsPreviewOpen(true);
    notify(`Invoice ${generatedId} created for ${company}!`, 'success');
  };

  // Mark as paid
  const handleMarkPaid = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'Paid' } : inv));
    if (activeInvoiceForPreview && activeInvoiceForPreview.id === id) {
      setActiveInvoiceForPreview(prev => (prev ? { ...prev, status: 'Paid' } : null));
    }
    notify(`Invoice ${id} marked as Paid`, 'success');
  };

  // Delete invoice
  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setIsPreviewOpen(false);
    notify(`Invoice ${id} deleted`, 'info');
  };

  // Print PDF Trigger
  const handlePrintPDF = () => {
    notify('Preparing PDF export view...', 'info');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Filtered list
  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      inv.id.toLowerCase().includes(query) ||
      inv.company.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Invoicing & Billing Drawer
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {invoices.length} Invoices Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dynamic invoice generation, automated tax calculations, and real-time PDF exports
          </p>
        </div>

        <button
          onClick={() => {
            setIsGeneratorOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}` },
          { label: 'Settled & Paid', value: `$${paidTotal.toLocaleString()}` },
          { label: 'Pending Payment', value: `$${pendingTotal.toLocaleString()}` },
          { label: 'Overdue Balance', value: `$${overdueTotal.toLocaleString()}` },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {stat.label}
            </span>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number, client, company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs w-full md:w-auto">
          {['All', 'Paid', 'Pending', 'Overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
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
      </div>

      {/* Invoice Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Invoice #</th>
                <th className="py-3.5 px-4">Client & Company</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  let statusBadge: BadgeVariant = 'neutral';
                  if (inv.status === 'Paid') statusBadge = 'success';
                  if (inv.status === 'Pending') statusBadge = 'warning';
                  if (inv.status === 'Overdue') statusBadge = 'danger';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setActiveInvoiceForPreview(inv);
                        setIsPreviewOpen(true);
                      }}
                    >
                      {/* Invoice ID */}
                      <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {inv.id}
                      </td>

                      {/* Client & Company */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {inv.company}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Attn: {inv.clientName}
                        </span>
                      </td>

                      {/* Issue Date */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                        {inv.issueDate}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                        {inv.dueDate}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                          ${inv.total.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {inv.items.length} line {inv.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <Badge variant={statusBadge} size="sm">
                          {inv.status}
                        </Badge>
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveInvoiceForPreview(inv);
                              setIsPreviewOpen(true);
                            }}
                            title="Interactive Preview & PDF"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {inv.status !== 'Paid' && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              title="Mark as Paid"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            title="Delete Invoice"
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
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No invoices found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Generator Modal */}
      <Modal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="Dynamic Invoice Generator"
        subtitle="Issue itemized electronic billing with automated discounts, taxes, and tenant branding"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-6">
          {/* Client & Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Select Enterprise Client *
              </label>
              <select
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={isLoadingClients}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="">
                  {isLoadingClients
                    ? 'Loading enterprise clients...'
                    : clients.length === 0
                    ? 'No clients found (convert a lead first)'
                    : 'Choose an enterprise client...'}
                </option>
                {clients.map((client) => {
                  const clientId = client._id || client.id;
                  const companyName = client.companyName || client.company || 'Enterprise Client';
                  const contactName = client.contactName || client.name || 'Primary Contact';
                  return (
                    <option key={clientId} value={client._id || clientId}>
                      {companyName} ({contactName})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option>Net 15 Days</option>
                <option>Net 30 Days</option>
                <option>Net 60 Days</option>
                <option>Due on Receipt</option>
              </select>
            </div>
          </div>

          {/* Line Items Repeater */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Line Items & Services
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Item description or service..."
                      value={item.description}
                      onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center"
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="w-24 text-right font-bold text-slate-800 dark:text-slate-200">
                    ${((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString()}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Automated Calculations: Discount & Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes & Remittance Instructions
              </label>
              <textarea
                rows={3}
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal:</span>
                <span className="font-bold">${subtotal.toLocaleString()}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 gap-2">
                <span className="flex items-center gap-1">
                  <span>Discount (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-14 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs"
                  />
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  -${discountAmount.toLocaleString()}
                </span>
              </div>

              {/* Tax Input */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 gap-2">
                <span className="flex items-center gap-1">
                  <span>Tax Rate (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-14 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs"
                  />
                </span>
                <span className="font-semibold">+${taxAmount.toLocaleString()}</span>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="text-brand-600 dark:text-brand-400">
                  ${grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGeneratorOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 cursor-pointer"
            >
              Issue & Preview Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Interactive Preview & Printable Receipt Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Electronic Invoice Receipt & Preview"
        subtitle={activeInvoiceForPreview ? `${activeInvoiceForPreview.id} · ${activeInvoiceForPreview.company}` : ''}
        maxWidth="max-w-3xl"
      >
        {activeInvoiceForPreview && (
          <div className="space-y-6">
            {/* Action Bar for Preview (Export PDF / Print & Mark as Paid) */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    activeInvoiceForPreview.status === 'Paid'
                      ? 'success'
                      : activeInvoiceForPreview.status === 'Overdue'
                      ? 'danger'
                      : 'warning'
                  }
                  size="md"
                >
                  Status: {activeInvoiceForPreview.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {activeInvoiceForPreview.status !== 'Paid' && (
                  <button
                    onClick={() => handleMarkPaid(activeInvoiceForPreview.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Paid</span>
                  </button>
                )}

                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export PDF / Print</span>
                </button>
              </div>
            </div>

            {/* Pixel-Perfect Printable Invoice Template */}
            <div className="printable-invoice p-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-800 dark:text-slate-200 space-y-6">
              {/* Invoice Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {tenantSettings?.companyName || user.companyName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tenant Partition: {user.tenantId}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tenantSettings?.address || '100 Montgomery St, Suite 1800, San Francisco, CA'}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-2xl font-mono font-black text-brand-600 dark:text-brand-400 tracking-tight block">
                    INVOICE
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {activeInvoiceForPreview.id}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Issue Date: {activeInvoiceForPreview.issueDate}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    Due Date: {activeInvoiceForPreview.dueDate}
                  </span>
                </div>
              </div>

              {/* Bill To & Remittance info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Billed To:
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeInvoiceForPreview.company}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Attn: {activeInvoiceForPreview.clientName}
                  </p>
                  <p className="text-slate-500">{activeInvoiceForPreview.email}</p>
                </div>

                <div className="sm:text-right">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment Terms:
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {activeInvoiceForPreview.paymentTerms || 'Net 30 Days'}
                  </p>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mt-2 mb-0.5">
                    ACH & Wire Remittance:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    Routing: 121000358 · Acc: **** 8492
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right">Unit Price</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeInvoiceForPreview.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.description}
                        </td>
                        <td className="py-3 text-center text-slate-600 dark:text-slate-400">
                          {item.quantity}
                        </td>
                        <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                          ${item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                          ${item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Ledger */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ${activeInvoiceForPreview.subtotal.toLocaleString()}
                    </span>
                  </div>

                  {activeInvoiceForPreview.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-semibold">
                        -${activeInvoiceForPreview.discount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500">
                    <span>Tax:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      +${activeInvoiceForPreview.tax.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-800 flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                    <span>Total Due:</span>
                    <span className="text-brand-600 dark:text-brand-400">
                      ${activeInvoiceForPreview.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Footer */}
              {activeInvoiceForPreview.notes && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="font-bold uppercase tracking-wider block mb-0.5">Notes:</span>
                  <p>{activeInvoiceForPreview.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
