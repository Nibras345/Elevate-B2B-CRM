import { Response, NextFunction } from 'express';
import { Invoice } from '../models/Invoice';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * @route   GET /api/invoices
 * @desc    Fetch all invoices for the authenticated tenant
 * @access  Private (JWT Protected)
 */
export const getInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);

    const invoices = await Invoice.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .lean();

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
      dueDate,
      items,
      subtotal,
      discount,
      tax,
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

    const count = await Invoice.countDocuments({ tenantId: tenantObjectId });
    const invNum = invoiceNumber || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newInvoice = await Invoice.create({
      tenantId: tenantObjectId,
      clientId,
      clientName: clientName || '',
      company: company || '',
      email: email || '',
      invoiceNumber: invNum,
      issueDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: items || [],
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      total: Number(total) || 0,
      status: status || 'Pending',
      paymentTerms: paymentTerms || 'Net 30 Days',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${invNum} created successfully`,
      invoice: newInvoice,
    });
  } catch (error) {
    next(error);
  }
};
