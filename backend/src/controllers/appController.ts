import { Response, NextFunction } from 'express';
import { Lead } from '../models/Lead';
import { Invoice } from '../models/Invoice';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * @route   GET /api/app/sidebar-stats
 * @desc    Fetch dynamic counts for sidebar notification badges (active leads & pending invoices)
 * @access  Private (JWT Protected)
 */
export const getSidebarStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantObjectId } = await getTenantContext(req);

    // Strict tenant isolation: count active leads (not won/closed) and pending invoices
    const [activeLeadsCount, pendingInvoicesCount] = await Promise.all([
      Lead.countDocuments({
        tenantId: tenantObjectId,
        stage: { $ne: 'Won / Closed' },
      }),
      Invoice.countDocuments({
        tenantId: tenantObjectId,
        status: 'Pending',
      }),
    ]);

    res.status(200).json({
      success: true,
      activeLeadsCount,
      pendingInvoicesCount,
    });
  } catch (error) {
    next(error);
  }
};
