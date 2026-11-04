import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Lead, LeadStage, LeadPriority } from '../models/Lead';
import { Client } from '../models/Client';
import { User } from '../models/User';
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
  createdBy: lead.createdBy,
  // Frontend Compatibility Aliases
  name: lead.contactName,
  company: lead.companyName,
  value: lead.estimatedValue,
  priority: lead.priority,
  email: lead.email,
  phone: lead.phone || '',
  country: lead.country || '',
  notes: lead.notes || '',
  stage: lead.stage,
  tags: lead.tags || [],
  assignedTo: lead.assignedTo || {
    name: 'Sales Agent',
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

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { tenantId: tenantObjectId };
    const total = await Lead.countDocuments(query);

    // Strict multi-tenant query isolation
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedLeads = leads.map(formatLeadResponse);

    res.status(200).json({
      success: true,
      data: formattedLeads,
      leads: formattedLeads,
      count: total,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      },
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
    req.body.createdBy = req.user?._id;
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
      country,
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

    // Resolve assigned sales rep dynamically from User collection if user ID or object is passed
    let resolvedAssignedTo = {
      id: req.user?._id?.toString() || req.user?.id || '',
      name: req.user?.fullName || req.user?.name || 'Sales Agent',
      avatar: req.user?.avatar || '',
      role: req.user?.role || 'Sales Agent',
    };

    if (assignedTo) {
      if (typeof assignedTo === 'string' && mongoose.isValidObjectId(assignedTo)) {
        const assignedUser = await User.findById(assignedTo).select('_id name role profilePicture avatar');
        if (assignedUser) {
          resolvedAssignedTo = {
            id: assignedUser._id.toString(),
            name: assignedUser.name,
            avatar: assignedUser.profilePicture || assignedUser.avatar || '',
            role: assignedUser.role || 'Sales Agent',
          };
        }
      } else if (typeof assignedTo === 'object' && assignedTo.name) {
        resolvedAssignedTo = {
          id: (assignedTo.id || assignedTo._id)?.toString() || '',
          name: assignedTo.name,
          avatar: assignedTo.avatar || '',
          role: assignedTo.role || 'Sales Agent',
        };
      }
    }

    const newLead = await Lead.create({
      tenantId: tenantObjectId,
      tenantCode,
      createdBy: req.body.createdBy || req.user?._id,
      contactName: chosenContactName,
      companyName: chosenCompanyName,
      estimatedValue: chosenValue,
      priority: (priority as LeadPriority) || 'Medium',
      email: chosenEmail,
      phone: phone?.trim() || '',
      country: country?.trim() || '',
      notes: notes || '',
      stage: normalizedStage,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Enterprise'],
      assignedTo: resolvedAssignedTo,
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
          createdBy: req.body.createdBy || req.user?._id,
          name: chosenContactName,
          contactName: chosenContactName,
          companyName: chosenCompanyName,
          email: chosenEmail,
          phone: phone?.trim() || '',
          country: country?.trim() || '',
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

    // 1. Fetch the lead before updating it to verify tenant isolation and record ownership
    const lead = await Lead.findById(id);

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead opportunity not found in this tenant workspace.',
      });
      return;
    }

    // Record-Level Ownership check: Company Admin can edit ANY; Employee can only edit own / assigned
    const isAssignedToUser = Boolean(
      lead.assignedTo?.id &&
      req.user?._id &&
      lead.assignedTo.id.toString() === req.user._id.toString()
    );

    if (
      req.user?.role !== 'Company Admin' &&
      req.user?.role !== 'Super Admin' &&
      !isAssignedToUser &&
      lead.createdBy?.toString() !== req.user?._id?.toString()
    ) {
      res.status(403).json({ success: false, message: "Unauthorized. You can only modify your own records." });
      return;
    }

    // 2. Normalize and prepare incoming updates for findByIdAndUpdate
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
      phoneNumber,
      country,
      city,
      notes,
      stage,
      tags,
      assignedTo,
      expectedClose,
      lastActivity,
    } = req.body;

    let targetStage: LeadStage = lead.stage;
    if (stage === 'Won' || stage === 'Won / Closed') {
      targetStage = 'Won / Closed';
    } else if (['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation'].includes(stage)) {
      targetStage = stage as LeadStage;
    }

    const updateFields: any = {
      ...req.body,
      stage: targetStage,
    };

    if (contactName || name) updateFields.contactName = (contactName || name).trim();
    if (companyName || company) updateFields.companyName = (companyName || company).trim();
    if (email) updateFields.email = email.toLowerCase().trim();
    if (phone !== undefined || phoneNumber !== undefined) {
      updateFields.phone = (phone || phoneNumber || '').trim();
    }
    if (country !== undefined) updateFields.country = country.trim();
    if (notes !== undefined) updateFields.notes = notes;
    if (priority) updateFields.priority = priority as LeadPriority;
    if (estimatedValue !== undefined || value !== undefined) {
      updateFields.estimatedValue = Number(estimatedValue ?? value) || 0;
    }
    if (tags !== undefined) {
      updateFields.tags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : lead.tags;
    }
    if (assignedTo) updateFields.assignedTo = assignedTo;
    if (expectedClose !== undefined) updateFields.expectedClose = expectedClose;
    if (targetStage !== lead.stage) {
      updateFields.lastActivity = `Moved to ${targetStage} just now`;
    } else if (lastActivity) {
      updateFields.lastActivity = lastActivity;
    }

    // Perform findByIdAndUpdate for the lead
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedLead) {
      res.status(404).json({
        success: false,
        message: 'Failed to update lead record.',
      });
      return;
    }

    // 3. Check the condition: if (req.body.stage === 'Won / Closed')
    let autoConvertedClient = null;
    let conversionMessage = 'Lead updated successfully';

    if (req.body.stage === 'Won / Closed' || targetStage === 'Won / Closed') {
      // 4. Wrap Client creation in try...catch block with console.error
      try {
        const clientTenantId = tenantObjectId || updatedLead.tenantId || req.user?.tenantId;
        const clientEmail = (updatedLead.email || '').toLowerCase().trim() || `temp-${Date.now()}@no-email.com`;
        const clientPhone = (updatedLead as any).phoneNumber || updatedLead.phone || phoneNumber || phone || '';

        // 5. Provide default fallback values for the Client schema to prevent Mongoose validation failures
        const newClient = new Client({
          contactName: updatedLead.contactName || 'Unknown Contact',
          name: updatedLead.contactName || 'Unknown Contact',
          companyName: updatedLead.companyName || 'Unknown Company',
          company: updatedLead.companyName || 'Unknown Company',
          email: clientEmail,
          phoneNumber: clientPhone,
          phone: clientPhone,
          country: updatedLead.country || '',
          city: (updatedLead as any).city || city || '',
          lifetimeValue: updatedLead.estimatedValue || 0,
          tenantId: clientTenantId,
          tenantCode: tenantCode || updatedLead.tenantCode || req.user?.tenantId,
          createdBy: req.user?._id || (updatedLead as any).createdBy,
          status: 'Active',
          convertedAt: new Date(),
          lastContacted: `Converted from Lead on ${new Date().toLocaleDateString()}`,
        });

        await newClient.save();
        autoConvertedClient = newClient;
        conversionMessage = `Deal won! ${updatedLead.companyName} has been automatically converted to your Clients database.`;
        console.log(`[Auto-Convert Success]: New client created with ID ${newClient._id} for lead ${updatedLead._id}`);
      } catch (error) {
        console.error("Client Creation Failed:", error);
      }
    }

    res.status(200).json({
      success: true,
      message: conversionMessage,
      lead: formatLeadResponse(updatedLead),
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

    // Record-Level Ownership check: Company Admin can delete ANY; Employee can only delete own / assigned
    const isAssignedToUser = Boolean(
      lead.assignedTo?.id &&
      req.user?._id &&
      lead.assignedTo.id.toString() === req.user._id.toString()
    );

    if (
      req.user?.role !== 'Company Admin' &&
      req.user?.role !== 'Super Admin' &&
      !isAssignedToUser &&
      lead.createdBy?.toString() !== req.user?._id?.toString()
    ) {
      res.status(403).json({ success: false, message: "Unauthorized. You can only modify your own records." });
      return;
    }

    await Lead.findByIdAndDelete(lead._id);

    res.status(200).json({
      success: true,
      message: `Lead for '${lead.companyName}' has been removed from the pipeline.`,
    });
  } catch (error: any) {
    next(error);
  }
};
