import { Router } from 'express';
import { getInvoices, createInvoice } from '../controllers/invoiceController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

// Strict multi-tenant protection on all invoice endpoints
router.use(protect);
router.use(tenantGuard);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

export default router;
