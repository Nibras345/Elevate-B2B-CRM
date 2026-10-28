import { Router } from 'express';
import {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from '../controllers/invoiceController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

// Strict multi-tenant protection on all invoice endpoints
router.use(protect);
router.use(tenantGuard);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .delete(deleteInvoice);

// Route 2: PUT /api/invoices/:id/status
router.route('/:id/status')
  .put(updateInvoiceStatus)
  .patch(updateInvoiceStatus);

export default router;
