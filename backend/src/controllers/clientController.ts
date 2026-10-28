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
  industry: client.industry || 'Enterprise Software',
  city: client.city || 'San Francisco',
  country: client.country || 'United States',
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
    const { tenantObjectId } = await getTenantContext(req);

    // Strict multi-tenant query isolation using lean() for performance
    const clients = await Client.find({ tenantId: tenantObjectId })
      .sort({ convertedAt: -1, createdAt: -1 })
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
      count: clientsWithStats.length,
      clients: clientsWithStats,
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
      contactName: chosenContact,
      companyName: chosenCompany,
      email: chosenEmail,
      phone: phone?.trim() || '',
      lifetimeValue: chosenLtv,
      convertedAt: new Date(),
      status: status || 'Active',
      industry: industry || 'Enterprise Software',
      city: city || '',
      country: country || 'United States',
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
    if (city !== undefined) client.city = city;
    if (country !== undefined) client.country = country;

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

    const deletedClient = await Client.findOneAndDelete({ _id: id, tenantId: tenantObjectId });
    if (!deletedClient) {
      res.status(404).json({
        success: false,
        message: 'Client not found in this tenant workspace.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Client '${deletedClient.companyName}' has been removed.`,
    });
  } catch (error: any) {
    next(error);
  }
};
