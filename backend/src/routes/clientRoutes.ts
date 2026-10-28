import { Router } from 'express';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '../controllers/clientController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

/**
 * Multi-Tenant Clients Database Routes
 */
// GET /api/clients - Fetch all clients for authenticated tenant
router.get('/', protect, tenantGuard, getClients);

// POST /api/clients - Create client
router.post('/', protect, tenantGuard, createClient);

// PUT /api/clients/:id - Update client
router.put('/:id', protect, tenantGuard, updateClient);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', protect, tenantGuard, deleteClient);

export default router;
