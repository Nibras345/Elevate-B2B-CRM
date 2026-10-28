import { Router } from 'express';
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
} from '../controllers/leadController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

/**
 * Multi-Tenant Leads Pipeline Routes
 */
// GET /api/leads - Fetch all leads for authenticated tenant
router.get('/', protect, tenantGuard, getLeads);

// POST /api/leads - Create new lead
router.post('/', protect, tenantGuard, createLead);

// PUT /api/leads/:id - Update lead & auto-convert to Client if Won / Closed
router.put('/:id', protect, tenantGuard, updateLead);

// DELETE /api/leads/:id - Remove lead from pipeline
router.delete('/:id', protect, tenantGuard, deleteLead);

export default router;
