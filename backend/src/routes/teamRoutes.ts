import { Router } from 'express';
import {
  inviteTeamMember,
  getTeamMembers,
  getInvitationByToken,
  acceptInvite,
  removeTeamMember,
} from '../controllers/teamController';
import { protect, tenantGuard, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

/**
 * Public routes for invited users to check status and accept invitation
 */
router.get('/invitation/:token', getInvitationByToken);
router.post('/accept-invite/:token', acceptInvite);

/**
 * Protected routes for tenant team governance
 */
// Route 1: POST /api/team/invite
router.post('/invite', protect, tenantGuard, authorizeRoles('Company Admin', 'Super Admin'), inviteTeamMember);

// Route 2: GET /api/team
router.get('/', protect, tenantGuard, getTeamMembers);

// Route 4: DELETE /api/team/:id
router.delete('/:id', protect, tenantGuard, authorizeRoles('Company Admin', 'Super Admin'), removeTeamMember);

export default router;
