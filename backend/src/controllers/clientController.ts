import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Client } from '../models/Client';
import { Invoice } from '../models/Invoice';
import { Lead } from '../models/Lead';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * Format client document for consistent API response
 */
const formatClientResponse = (client: any) => ({
  id: client._id.toString(),
  _id: client._id.toString(),
  tenantId: client.tenantId,
  tenantCode: client.tenantCode,
  // Standard Backend Schema Properties
  contactName: client.contactName,
  companyName: client.companyName,
  email: client.email,
  createdBy: client.createdBy,
  phone: client.phone || '',
  lifetimeValue: client.lifetimeValue || 0,
  convertedAt: client.convertedAt || client.createdAt,
  // Dynamic Stats Counts (Requirement 2)
  invoiceCount: client.invoiceCount ?? client.invoicesCount ?? 0,
  dealCount: client.dealCount ?? client.openDealsCount ?? 1,
  invoicesCount: client.invoiceCount ?? client.invoicesCount ?? 0,
  openDealsCount: client.dealCount ?? client.openDealsCount ?? 1,
  // Frontend Compatibility Aliases
  name: client.contactName,
  company: client.companyName,
  ltv: client.lifetimeValue || 0,
  status: client.status || 'Active',
  industry: client.industry || '',
  city: client.city || '',
  country: client.country || '',
  lastContacted: client.lastContacted || 'Active Relationship',
  createdAt: client.createdAt,
  updatedAt: client.updatedAt,
});

/**
 * @route   GET /api/clients
 * @desc    Fetch all clients isolated to the authenticated tenant with dynamic stats
 * @access  Private (JWT Protected)
 */
export const getClients = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId, tenantCode } = await getTenantContext(req);

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { tenantId: tenantObjectId },
        ...(tenantCode ? [{ tenantCode }] : []),
        ...(req.user?.tenantId ? [{ tenantId: req.user.tenantId }, { tenantCode: req.user.tenantId }] : []),
      ],
    };
    const total = await Client.countDocuments(query);

    // Strict multi-tenant query isolation using lean() for performance
    const clients = await Client.find(query)
      .sort({ convertedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map each client with dynamic counts using Promise.all
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        // 1. Count invoices for this client within this tenant
        let invoiceCount = 0;
        try {
          invoiceCount = await Invoice.countDocuments({
            tenantId: tenantObjectId,
            $or: [
              { clientId: client._id },
              { clientId: client._id.toString() },
            ],
          });
        } catch (invErr) {
          invoiceCount = 0;
        }

        // 2. Count deals (from Lead collection if matching, otherwise 1 since converted from a won lead)
        let dealCount = 1;
        try {
          const leadCount = await Lead.countDocuments({
            tenantId: tenantObjectId,
            $or: [
              { email: client.email },
              { companyName: client.companyName },
            ],
          });
          if (leadCount > 0) {
            dealCount = leadCount;
          }
        } catch (leadErr) {
          dealCount = 1;
        }

        return formatClientResponse({
          ...client,
          invoiceCount,
          dealCount,
        });
      })
    );

    res.status(200).json({
      success: true,
      data: clientsWithStats,
      clients: clientsWithStats,
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
 * @route   POST /api/clients
 * @desc    Directly create a client record for this tenant
 * @access  Private (JWT Protected)
 */
export const createClient = async (
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
      email,
      phone,
      lifetimeValue,
      ltv,
      industry,
      city,
      country,
      status,
    } = req.body;

    const chosenContact = (contactName || name || '').trim();
    const chosenCompany = (companyName || company || '').trim();
    const chosenEmail = (email || '').toLowerCase().trim();
    const chosenLtv = Number(lifetimeValue ?? ltv) || 0;

    if (!chosenContact || !chosenCompany || !chosenEmail) {
      res.status(400).json({
        success: false,
        message: 'Contact name, company name, and email are required.',
      });
      return;
    }

    const newClient = await Client.create({
      tenantId: tenantObjectId,
      tenantCode,
      createdBy: req.body.createdBy || req.user?._id,
      contactName: chosenContact,
      companyName: chosenCompany,
      email: chosenEmail,
      phone: phone?.trim() || '',
      lifetimeValue: chosenLtv,
      convertedAt: new Date(),
      status: status || 'Active',
      industry: industry || 'Enterprise Software',
      city: city || '',
      country: country?.trim() || '',
    });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: formatClientResponse(newClient),
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client details
 * @access  Private (JWT Protected)
 */
export const updateClient = async (
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
        message: 'Invalid client ID format.',
      });
      return;
    }

    const client = await Client.findOne({ _id: id, tenantId: tenantObjectId });
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found in this tenant workspace.',
      });
      return;
    }

    // Record-Level Ownership check: Company Admin can edit ANY; Employee can only edit own
    if (
      req.user?.role !== 'Company Admin' &&
      req.user?.role !== 'Super Admin' &&
      client.createdBy?.toString() !== req.user?._id?.toString()
    ) {
      res.status(403).json({ success: false, message: "Unauthorized. You can only modify your own records." });
      return;
    }

    const {
      contactName,
      name,
      companyName,
      company,
      email,
      phone,
      lifetimeValue,
      ltv,
      status,
      industry,
      city,
      country,
    } = req.body;

    if (contactName || name) client.contactName = (contactName || name).trim();
    if (companyName || company) client.companyName = (companyName || company).trim();
    if (email) client.email = email.toLowerCase().trim();
    if (phone !== undefined) client.phone = phone.trim();
    if (lifetimeValue !== undefined || ltv !== undefined) {
      client.lifetimeValue = Number(lifetimeValue ?? ltv) || 0;
    }
    if (status) client.status = status;
    if (industry) client.industry = industry;
    if (city !== undefined) client.city = city?.trim?.() ?? city;
    if (country !== undefined) client.country = country?.trim?.() ?? country;

    await client.save();

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      client: formatClientResponse(client),
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete client record
 * @access  Private (JWT Protected)
 */
export const deleteClient = async (
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
        message: 'Invalid client ID format.',
      });
      return;
    }

    const client = await Client.findOne({ _id: id, tenantId: tenantObjectId });
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found in this tenant workspace.',
      });
      return;
    }

    // Record-Level Ownership check: Company Admin can delete ANY; Employee can only delete own
    if (
      req.user?.role !== 'Company Admin' &&
      req.user?.role !== 'Super Admin' &&
      client.createdBy?.toString() !== req.user?._id?.toString()
    ) {
      res.status(403).json({ success: false, message: "Unauthorized. You can only modify your own records." });
      return;
    }

    await Client.findByIdAndDelete(client._id);

    res.status(200).json({
      success: true,
      message: `Client '${client.companyName}' has been removed.`,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   GET /api/clients/:id/history
 * @desc    Fetch real audit trail and historical events (Invoices + Leads) for a specific client
 * @access  Private (JWT Protected)
 */
export const getClientHistory = async (
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
        message: 'Invalid client ID format.',
      });
      return;
    }

    const client = await Client.findOne({ _id: id, tenantId: tenantObjectId }).lean();
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found in this tenant workspace.',
      });
      return;
    }

    const formatUSD = (val: number): string =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(val || 0);

    // Fetch actual Invoices and Leads for this client
    const [clientInvoices, clientLeads] = await Promise.all([
      Invoice.find({
        tenantId: tenantObjectId,
        $or: [
          { clientId: client._id },
          { clientId: client._id.toString() },
          { email: client.email },
        ],
      })
        .sort({ createdAt: -1 })
        .lean(),
      Lead.find({
        tenantId: tenantObjectId,
        $or: [
          { email: client.email },
          { companyName: client.companyName },
        ],
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const invoiceEvents = clientInvoices.map((inv: any) => {
      const dateObj = new Date(inv.issueDate || inv.createdAt);
      return {
        id: `hist-inv-${inv._id}`,
        title: inv.status === 'Paid'
          ? `Invoice ${inv.invoiceNumber || 'INV'} Settled & Paid`
          : `Invoice ${inv.invoiceNumber || 'INV'} Generated`,
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        desc: `Status: ${inv.status} (${inv.paymentTerms || 'Net 30 Days'})`,
        amount: formatUSD(inv.grandTotal ?? inv.total ?? 0),
        timestamp: dateObj.getTime(),
        type: 'invoice',
        status: inv.status,
      };
    });

    const leadEvents = clientLeads.map((lead: any) => {
      const dateObj = new Date(lead.updatedAt || lead.createdAt);
      const isWon = lead.stage === 'Won / Closed' || lead.stage === 'Won';
      return {
        id: `hist-lead-${lead._id}`,
        title: isWon
          ? 'Lead Opportunity Won & Converted'
          : `Pipeline Opportunity: ${lead.stage}`,
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        desc: lead.lastActivity || `Managed by ${lead.assignedTo?.name || 'Sales Agent'} (${lead.priority} priority)`,
        amount: formatUSD(lead.estimatedValue || 0),
        timestamp: dateObj.getTime(),
        type: 'lead',
        stage: lead.stage,
      };
    });

    // Client Onboarding milestone
    const clientCreatedDate = new Date(client.convertedAt || client.createdAt);
    const onboardingEvent = {
      id: `hist-client-${client._id}`,
      title: 'Client Relationship Established',
      date: clientCreatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      desc: `Onboarded into workspace with lifetime value recorded as ${formatUSD(client.lifetimeValue || 0)}`,
      amount: client.lifetimeValue ? formatUSD(client.lifetimeValue) : null,
      timestamp: clientCreatedDate.getTime(),
      type: 'client',
    };

    const combinedHistory = [...invoiceEvents, ...leadEvents, onboardingEvent]
      .sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      success: true,
      clientId: client._id,
      history: combinedHistory,
      invoices: clientInvoices,
      leads: clientLeads,
    });
  } catch (error) {
    next(error);
  }
};

