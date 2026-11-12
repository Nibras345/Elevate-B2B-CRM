import { Router } from 'express';
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
} from '../controllers/leadController';
import { protect, tenantGuard } from '../middleware/authMiddleware';
import { validateResource } from '../middleware/validateResource';
import { createLeadSchema, updateLeadSchema } from '../schemas/lead.schema';

const router = Router();

/**
 * Multi-Tenant Leads Pipeline Routes
 */
// GET /api/leads - Fetch all leads for authenticated tenant
router.get('/', protect, tenantGuard, getLeads);

// POST /api/leads - Create new lead with strict Zod validation
router.post('/', protect, tenantGuard, validateResource(createLeadSchema), createLead);

// PUT /api/leads/:id - Update lead with Zod validation & auto-convert to Client if Won / Closed
router.put('/:id', protect, tenantGuard, validateResource(updateLeadSchema), updateLead);

// DELETE /api/leads/:id - Remove lead from pipeline
router.delete('/:id', protect, tenantGuard, deleteLead);

export default router;
