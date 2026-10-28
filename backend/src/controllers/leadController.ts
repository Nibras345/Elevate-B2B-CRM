import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Lead, LeadStage, LeadPriority } from '../models/Lead';
import { Client } from '../models/Client';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * Format lead document to support both backend schema names and frontend property names
 */
const formatLeadResponse = (lead: any) => ({
  id: lead._id.toString(),
  _id: lead._id.toString(),
  tenantId: lead.tenantId,
  tenantCode: lead.tenantCode,
  // Standard Backend Schema Properties
  contactName: lead.contactName,
  companyName: lead.companyName,
  estimatedValue: lead.estimatedValue,
  // Frontend Compatibility Aliases
  name: lead.contactName,
  company: lead.companyName,
  value: lead.estimatedValue,
  priority: lead.priority,
  email: lead.email,
  phone: lead.phone || '',
  notes: lead.notes || '',
  stage: lead.stage,
  tags: lead.tags || [],
  assignedTo: lead.assignedTo || {
    name: 'Alex Morgan',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'Sales Agent',
  },
  lastActivity: lead.lastActivity || 'Opportunity in pipeline',
  expectedClose: lead.expectedClose || '',
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

/**
 * @route   GET /api/leads
 * @desc    Fetch all leads isolated to authenticated user's tenant
 * @access  Private (JWT Protected)
 */
export const getLeads = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);

    // Strict multi-tenant query isolation
    const leads = await Lead.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 });

    const formattedLeads = leads.map(formatLeadResponse);

    res.status(200).json({
      success: true,
      count: formattedLeads.length,
      leads: formattedLeads,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   POST /api/leads
 * @desc    Create a new lead opportunity for the authenticated tenant
 * @access  Private (JWT Protected)
 */
export const createLead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId, tenantCode } = await getTenantContext(req);
    const {
      contactName,
      name,
      companyName,
      company,
      estimatedValue,
      value,
      priority,
      email,
      phone,
      notes,
      stage,
      tags,
      assignedTo,
      expectedClose,
    } = req.body;

    const chosenContactName = (contactName || name || '').trim();
    const chosenCompanyName = (companyName || company || '').trim();
    const chosenEmail = (email || '').toLowerCase().trim();
    const chosenValue = Number(estimatedValue ?? value) || 0;

    if (!chosenContactName || !chosenCompanyName || !chosenEmail) {
      res.status(400).json({
        success: false,
        message: 'Contact name, company name, and email are required.',
      });
      return;
    }

    // Normalize stage
    let normalizedStage: LeadStage = 'New Lead';
    if (stage === 'Won' || stage === 'Won / Closed') {
      normalizedStage = 'Won / Closed';
    } else if (['Contacted', 'Proposal Sent', 'Negotiation'].includes(stage)) {
      normalizedStage = stage as LeadStage;
    }

    const newLead = await Lead.create({
      tenantId: tenantObjectId,
      tenantCode,
      contactName: chosenContactName,
      companyName: chosenCompanyName,
      estimatedValue: chosenValue,
      priority: (priority as LeadPriority) || 'Medium',
      email: chosenEmail,
      phone: phone?.trim() || '',
      notes: notes || '',
      stage: normalizedStage,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Enterprise'],
      assignedTo: assignedTo || {
        name: req.user?.fullName || req.user?.name || 'Sales Agent',
        avatar: req.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: req.user?.role || 'Sales Agent',
      },
      lastActivity: 'Lead created in CRM pipeline',
      expectedClose: expectedClose || '',
    });

    // Check if created directly in Won / Closed stage: Auto-convert to Client
    let autoConvertedClient = null;
    if (normalizedStage === 'Won / Closed') {
      const existingClient = await Client.findOne({
        tenantId: tenantObjectId,
        $or: [{ email: chosenEmail }, { companyName: chosenCompanyName }],
      });

      if (!existingClient) {
        autoConvertedClient = await Client.create({
          tenantId: tenantObjectId,
          tenantCode,
          contactName: chosenContactName,
          companyName: chosenCompanyName,
          email: chosenEmail,
          phone: phone?.trim() || '',
          lifetimeValue: chosenValue,
          convertedAt: new Date(),
          status: 'Active',
          lastContacted: 'Converted on lead creation',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Lead opportunity created successfully',
      lead: formatLeadResponse(newLead),
      autoConvertedClient,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead details and execute auto-conversion to Client when Won / Closed
 * @access  Private (JWT Protected)
 */
export const updateLead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { tenantObjectId, tenantCode } = await getTenantContext(req);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID format.',
      });
      return;
    }

    // 1. Locate the lead verifying tenant isolation
    const lead = await Lead.findOne({
      _id: id,
      tenantId: tenantObjectId,
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead opportunity not found in this tenant workspace.',
      });
      return;
    }

    // Extract incoming updates
    const {
      contactName,
      name,
      companyName,
      company,
      estimatedValue,
      value,
      priority,
      email,
      phone,
      notes,
      stage,
      tags,
      assignedTo,
      expectedClose,
      lastActivity,
    } = req.body;

    if (contactName || name) lead.contactName = (contactName || name).trim();
    if (companyName || company) lead.companyName = (companyName || company).trim();
    if (email) lead.email = email.toLowerCase().trim();
    if (phone !== undefined) lead.phone = phone.trim();
    if (notes !== undefined) lead.notes = notes;
    if (priority) lead.priority = priority as LeadPriority;
    if (estimatedValue !== undefined || value !== undefined) {
      lead.estimatedValue = Number(estimatedValue ?? value) || 0;
    }
    if (tags !== undefined) {
      lead.tags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : lead.tags;
    }
    if (assignedTo) lead.assignedTo = assignedTo;
    if (expectedClose !== undefined) lead.expectedClose = expectedClose;

    // Normalize incoming stage
    let isMovingToWon = false;
    if (stage) {
      let normalizedStage: LeadStage = lead.stage;
      if (stage === 'Won' || stage === 'Won / Closed') {
        normalizedStage = 'Won / Closed';
        isMovingToWon = true;
      } else if (['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation'].includes(stage)) {
        normalizedStage = stage as LeadStage;
      }

      if (lead.stage !== normalizedStage) {
        lead.stage = normalizedStage;
        lead.lastActivity = `Moved to ${normalizedStage} just now`;
      }
    }

    if (lastActivity) {
      lead.lastActivity = lastActivity;
    }

    await lead.save();

    // 2. CRITICAL AUTO-CONVERSION WORKFLOW:
    // If incoming stage is 'Won / Closed', check if Client already exists. If not, auto-convert!
    let autoConvertedClient = null;
    let conversionMessage = 'Lead updated successfully';

    if (isMovingToWon || lead.stage === 'Won / Closed') {
      const existingClient = await Client.findOne({
        tenantId: tenantObjectId,
        $or: [
          { email: lead.email },
          { companyName: lead.companyName },
        ],
      });

      if (!existingClient) {
        autoConvertedClient = await Client.create({
          tenantId: tenantObjectId,
          tenantCode,
          contactName: lead.contactName,
          companyName: lead.companyName,
          email: lead.email,
          phone: lead.phone || '',
          lifetimeValue: lead.estimatedValue || 0,
          convertedAt: new Date(),
          status: 'Active',
          lastContacted: `Converted from Lead on ${new Date().toLocaleDateString()}`,
        });
        conversionMessage = `Deal won! ${lead.companyName} has been automatically converted to your Clients database.`;
      } else {
        // If client already exists, update their lifetime value by adding the new won deal
        existingClient.lifetimeValue = (existingClient.lifetimeValue || 0) + (lead.estimatedValue || 0);
        existingClient.lastContacted = `Deal closed on ${new Date().toLocaleDateString()}`;
        await existingClient.save();
        autoConvertedClient = existingClient;
        conversionMessage = `Deal won! Client ${lead.companyName} lifetime value updated to $${existingClient.lifetimeValue.toLocaleString()}.`;
      }
    }

    res.status(200).json({
      success: true,
      message: conversionMessage,
      lead: formatLeadResponse(lead),
      convertedClient: autoConvertedClient,
      autoConverted: Boolean(autoConvertedClient),
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete a lead opportunity
 * @access  Private (JWT Protected)
 */
export const deleteLead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { tenantObjectId } = await getTenantContext(req);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID format.',
      });
      return;
    }

    const deletedLead = await Lead.findOneAndDelete({
      _id: id,
      tenantId: tenantObjectId,
    });

    if (!deletedLead) {
      res.status(404).json({
        success: false,
        message: 'Lead opportunity not found in this tenant workspace.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Lead for '${deletedLead.companyName}' has been removed from the pipeline.`,
    });
  } catch (error: any) {
    next(error);
  }
};
