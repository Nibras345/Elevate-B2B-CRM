import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Client } from '../models/Client';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * Helper to format invoice with client details and aliases
 */
const formatInvoiceResponse = (inv: any) => {
  const idStr = inv._id?.toString() || inv.id;
  const populatedClient = inv.clientId && typeof inv.clientId === 'object' ? inv.clientId : null;
  const clientName = populatedClient?.contactName || inv.clientName || 'Valued Client';
  const company = populatedClient?.companyName || inv.company || 'Enterprise Client';
  const amount = Number(inv.grandTotal ?? inv.total) || 0;

  return {
    ...inv,
    id: idStr,
    _id: idStr,
    invoiceNumber: inv.invoiceNumber || idStr,
    clientName,
    company,
    grandTotal: amount,
    total: amount,
    status: inv.status || 'Pending',
    issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '2025-05-30',
  };
};

/**
 * @route   GET /api/invoices
 * @desc    Fetch all invoices for the authenticated tenant with populated client details
 * @access  Private (JWT Protected)
 */
export const getInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);

    // Strict multi-tenant query isolation with .populate('clientId', 'contactName companyName')
    const rawInvoices = await Invoice.find({ tenantId: tenantObjectId })
      .populate('clientId', 'contactName companyName email phone')
      .sort({ createdAt: -1 })
      .lean();

    const invoices = rawInvoices.map(formatInvoiceResponse);

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/invoices/:id/status
 * @desc    Update invoice status (e.g. mark as 'Paid', 'Pending', 'Overdue')
 * @access  Private (JWT Protected)
 */
export const updateInvoiceStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['Paid', 'Pending', 'Overdue'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format',
      });
      return;
    }

    // Strict tenant isolation: verify invoice belongs to authenticated tenant
    const invoice = await Invoice.findOne({
      _id: id,
      tenantId: tenantObjectId,
    }).populate('clientId', 'contactName companyName email phone');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found or unauthorized',
      });
      return;
    }

    invoice.status = status;
    await invoice.save();

    const formatted = formatInvoiceResponse(invoice.toObject());

    res.status(200).json({
      success: true,
      message: `Invoice ${formatted.invoiceNumber} status updated to ${status}`,
      invoice: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete specified invoice
 * @access  Private (JWT Protected)
 */
export const deleteInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format',
      });
      return;
    }

    // Strict tenant isolation: delete only if tenantId matches
    const deleted = await Invoice.findOneAndDelete({
      _id: id,
      tenantId: tenantObjectId,
    });

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found or unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Invoice ${deleted.invoiceNumber} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/invoices
 * @desc    Create a new invoice for a client within the authenticated tenant
 * @access  Private (JWT Protected)
 */
export const createInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);
    const {
      clientId,
      clientName,
      company,
      email,
      invoiceNumber,
      issueDate,
      dueDate,
      items,
      subtotal,
      discount,
      tax,
      grandTotal,
      total,
      status,
      paymentTerms,
      notes,
    } = req.body;

    if (!clientId) {
      res.status(400).json({
        success: false,
        message: 'Client ID is required to generate an invoice.',
      });
      return;
    }

    // Resolve client details if not provided
    let finalClientName = clientName;
    let finalCompany = company;
    let finalEmail = email;

    if (mongoose.Types.ObjectId.isValid(clientId)) {
      const clientDoc = await Client.findOne({ _id: clientId, tenantId: tenantObjectId });
      if (clientDoc) {
        finalClientName = clientDoc.contactName || (clientDoc as any).name || finalClientName;
        finalCompany = clientDoc.companyName || (clientDoc as any).company || finalCompany;
        finalEmail = clientDoc.email || finalEmail;
      }
    }

    const count = await Invoice.countDocuments({ tenantId: tenantObjectId });
    const invNum = invoiceNumber || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const calculatedTotal = Number(grandTotal ?? total) || 0;

    const newInvoice = await Invoice.create({
      tenantId: tenantObjectId,
      clientId: mongoose.Types.ObjectId.isValid(clientId) ? new mongoose.Types.ObjectId(clientId) : clientId,
      clientName: finalClientName || '',
      company: finalCompany || '',
      email: finalEmail || '',
      invoiceNumber: invNum,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: items || [],
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      grandTotal: calculatedTotal,
      total: calculatedTotal,
      status: status || 'Pending',
      paymentTerms: paymentTerms || 'Net 30 Days',
      notes: notes || '',
    });

    const populated = await Invoice.findById(newInvoice._id)
      .populate('clientId', 'contactName companyName email phone')
      .lean();

    const formatted = formatInvoiceResponse(populated || newInvoice.toObject());

    res.status(201).json({
      success: true,
      message: `Invoice ${invNum} created successfully`,
      invoice: formatted,
    });
  } catch (error) {
    next(error);
  }
};
