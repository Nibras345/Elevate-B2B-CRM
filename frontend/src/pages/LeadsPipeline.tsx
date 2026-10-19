import React, { useState, FormEvent } from 'react';
import {
  Plus,
  Search,
  Building,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { initialLeads, initialTeamMembers } from '../data/mockData';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Lead, PipelineStage, Priority } from '../types';

interface StageConfig {
  id: PipelineStage;
  label: string;
  color: string;
}

const PIPELINE_STAGES: StageConfig[] = [
  { id: 'New Lead', label: 'New Lead', color: 'border-t-slate-400 bg-slate-500/10' },
  { id: 'Contacted', label: 'Contacted', color: 'border-t-blue-500 bg-blue-500/10' },
  { id: 'Proposal Sent', label: 'Proposal Sent', color: 'border-t-indigo-500 bg-indigo-500/10' },
  { id: 'Negotiation', label: 'Negotiation', color: 'border-t-amber-500 bg-amber-500/10' },
  { id: 'Won', label: 'Won / Closed', color: 'border-t-emerald-500 bg-emerald-500/10' },
];

export const LeadsPipeline: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Selected lead for View/Edit Drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Add New Lead Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: '',
    priority: 'High' as Priority,
    stage: 'New Lead' as PipelineStage,
    assignedToName: 'Alex Morgan',
    tags: 'Enterprise, Q1',
    notes: '',
  });

  const { notify } = useNotification();
  const { user } = useAuth();

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesOwner = ownerFilter === 'All' || lead.assignedTo.name === ownerFilter;
    const matchesPriority = priorityFilter === 'All' || lead.priority === priorityFilter;

    return matchesSearch && matchesOwner && matchesPriority;
  });

  // Calculate stage summary stats
  const getStageStats = (stageId: PipelineStage) => {
    const stageItems = filteredLeads.filter((l) => l.stage === stageId);
    const count = stageItems.length;
    const totalVal = stageItems.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    return { count, totalVal };
  };

  // Move lead to another stage
  const moveLeadStage = (leadId: string, targetStage: PipelineStage) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            stage: targetStage,
            lastActivity: `Moved to ${targetStage} just now`,
          };
        }
        return l;
      })
    );

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, stage: targetStage } : null));
    }

    notify(`Lead successfully moved to ${targetStage}`, 'success');
  };

  // Open edit drawer
  const handleOpenLead = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setIsDrawerOpen(true);
  };

  // Save drawer edits
  const handleSaveLeadEdits = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setLeads((prev) =>
      prev.map((l) => (l.id === selectedLead.id ? selectedLead : l))
    );
    setIsDrawerOpen(false);
    notify(`Deal terms for ${selectedLead.company} updated`, 'success');
  };

  // Delete lead
  const handleDeleteLead = (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setIsDrawerOpen(false);
    notify('Lead removed from sales pipeline', 'info');
  };

  // Handle Add New Lead
  const handleCreateLead = (e: FormEvent) => {
    e.preventDefault();
    const assignedUser = initialTeamMembers.find(m => m.name === newLeadForm.assignedToName) || {
      name: newLeadForm.assignedToName,
      avatar: user.avatar,
      role: 'Sales Agent',
    };

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: newLeadForm.name,
      company: newLeadForm.company,
      email: newLeadForm.email,
      phone: newLeadForm.phone,
      value: Number(newLeadForm.value) || 25000,
      priority: newLeadForm.priority,
      stage: newLeadForm.stage,
      assignedTo: {
        name: assignedUser.name,
        avatar: assignedUser.avatar || user.avatar,
        role: assignedUser.role || 'Sales Agent',
      },
      tags: newLeadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      source: 'Direct Inbound',
      expectedClose: '2025-04-30',
      lastActivity: 'Lead created in CRM pipeline',
      notes: newLeadForm.notes || 'Initial opportunity qualifications underway.',
    };

    setLeads([newLead, ...leads]);
    setIsAddModalOpen(false);
    setNewLeadForm({
      name: '',
      company: '',
      email: '',
      phone: '',
      value: '',
      priority: 'High',
      stage: 'New Lead',
      assignedToName: 'Alex Morgan',
      tags: 'Enterprise, Q1',
      notes: '',
    });
    notify(`Created lead for ${newLead.company} ($${newLead.value.toLocaleString()})`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Leads Pipeline
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {filteredLeads.length} Deals Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag, prioritize, and progress multi-tenant deal opportunities
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Lead</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads, company, or tags..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Owner Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium hidden sm:inline">Owner:</span>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="All">All Owners</option>
              <option value="Alex Morgan">Alex Morgan</option>
              <option value="David Chen">David Chen</option>
              <option value="Emma Watson">Emma Watson</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium hidden sm:inline">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {(searchQuery || ownerFilter !== 'All' || priorityFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setOwnerFilter('All');
                setPriorityFilter('All');
              }}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {PIPELINE_STAGES.map((col) => {
          const stats = getStageStats(col.id);
          const stageCards = filteredLeads.filter((l) => l.stage === col.id);

          return (
            <div
              key={col.id}
              className="bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 min-h-[580px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {stats.count}
                  </span>
                </div>
              </div>

              {/* Column Value Subtitle */}
              <div className="py-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Stage Value:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ${stats.totalVal.toLocaleString()}
                </span>
              </div>

              {/* Card List in Column */}
              <div className="space-y-3 flex-1 overflow-y-auto pt-1">
                {stageCards.length > 0 ? (
                  stageCards.map((lead) => {
                    let priorityBadge: BadgeVariant = 'warning';
                    if (lead.priority === 'High') priorityBadge = 'danger';
                    if (lead.priority === 'Low') priorityBadge = 'neutral';

                    return (
                      <div
                        key={lead.id}
                        onClick={() => handleOpenLead(lead)}
                        className="bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:shadow-md hover:border-brand-500/50 transition-all cursor-pointer group relative"
                      >
                        {/* Drag Handle & Priority */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors">
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <Badge variant={priorityBadge} size="xs">
                              {lead.priority}
                            </Badge>
                          </div>

                          {/* Quick Stage Mover Selector */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative"
                          >
                            <select
                              value={lead.stage}
                              onChange={(e) => moveLeadStage(lead.id, e.target.value as PipelineStage)}
                              className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 focus:outline-hidden cursor-pointer"
                              title="Move stage"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  → {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Lead & Company Name */}
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {lead.name}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{lead.company}</span>
                        </div>

                        {/* Value & Tags */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            ${Number(lead.value).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <img
                              src={lead.assignedTo.avatar}
                              alt={lead.assignedTo.name}
                              title={`Owner: ${lead.assignedTo.name}`}
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-white dark:ring-slate-900"
                            />
                          </div>
                        </div>

                        {/* Tags list */}
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {lead.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center p-3 text-xs text-slate-400">
                    <span>No leads in this stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Drawer UI: View / Edit Lead */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Lead Intelligence & Deal Terms"
        subtitle={selectedLead ? `${selectedLead.company} · ${selectedLead.name}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedLead && (
          <form onSubmit={handleSaveLeadEdits} className="space-y-5">
            {/* Stage Quick Mover */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Current Pipeline Stage
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PIPELINE_STAGES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedLead({ ...selectedLead, stage: s.id })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                      selectedLead.stage === s.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs: Lead Name & Company */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={selectedLead.name}
                  onChange={(e) => setSelectedLead({ ...selectedLead, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={selectedLead.company}
                  onChange={(e) => setSelectedLead({ ...selectedLead, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Value & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Value ($ USD)
                </label>
                <input
                  type="number"
                  required
                  value={selectedLead.value}
                  onChange={(e) => setSelectedLead({ ...selectedLead, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority Rating
                </label>
                <select
                  value={selectedLead.priority}
                  onChange={(e) => setSelectedLead({ ...selectedLead, priority: e.target.value as Priority })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedLead.email}
                  onChange={(e) => setSelectedLead({ ...selectedLead, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={selectedLead.phone}
                  onChange={(e) => setSelectedLead({ ...selectedLead, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Internal Opportunity Notes
              </label>
              <textarea
                rows={3}
                value={selectedLead.notes}
                onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            {/* Lead Activity Audit */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Last Activity Audit
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300">{selectedLead.lastActivity}</p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Lead</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </Drawer>

      {/* Add New Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Lead Opportunity"
        subtitle="Capture enterprise deal requirements and allocate pipeline owner"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contact Name *
              </label>
              <input
                type="text"
                required
                value={newLeadForm.name}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                placeholder="e.g. Katherine Bell"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={newLeadForm.company}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                placeholder="e.g. Horizon Cloud"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Value ($ USD) *
              </label>
              <input
                type="number"
                required
                value={newLeadForm.value}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, value: e.target.value })}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pipeline Stage
              </label>
              <select
                value={newLeadForm.stage}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, stage: e.target.value as PipelineStage })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={newLeadForm.priority}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assigned Sales Rep
              </label>
              <select
                value={newLeadForm.assignedToName}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedToName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="Alex Morgan">Alex Morgan (Admin)</option>
                <option value="David Chen">David Chen (Sales Agent)</option>
                <option value="Emma Watson">Emma Watson (Sales Agent)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={newLeadForm.email}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                placeholder="client@company.com"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Deal Notes & Qualification Summary
            </label>
            <textarea
              rows={2}
              value={newLeadForm.notes}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
              placeholder="Key requirements, budget, decision makers..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 cursor-pointer"
            >
              Add to Pipeline
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
