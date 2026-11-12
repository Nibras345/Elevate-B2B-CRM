import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { SeatRequest } from '../models/SeatRequest';
import { Tenant } from '../models/Tenant';
import { Notification } from '../models/Notification';

/**
 * @route   POST /api/billing/request-seats
 * @desc    Submit a seat purchase request with payment screenshot
 * @access  Private (Company Admin / Super Admin)
 */
export const requestSeats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (user.role !== 'Company Admin' && user.role !== 'Super Admin') {
      res.status(403).json({
        success: false,
        message: 'Access Denied: Only Company Admins can request seat upgrades.',
      });
      return;
    }

    // Resolve tenant
    const currentTenantId = user.tenantId || req.tenantId;
    if (!currentTenantId) {
      res.status(400).json({
        success: false,
        message: 'No tenant organization associated with this account.',
      });
      return;
    }

    const tenant = await Tenant.findOne({ tenantId: currentTenantId });
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: `Tenant workspace ${currentTenantId} not found.`,
      });
      return;
    }

    const { planName, requestedSeats, totalAmount, notes } = req.body;

    const parsedSeats = Number(requestedSeats);
    const parsedAmount = Number(totalAmount);

    if (!parsedSeats || isNaN(parsedSeats) || parsedSeats < 1) {
      res.status(400).json({
        success: false,
        message: 'Please specify a valid number of seats (at least 1).',
      });
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      res.status(400).json({
        success: false,
        message: 'Please specify a valid total amount.',
      });
      return;
    }

    // Determine screenshot URL from multer file (Cloudinary secure_url/path or local disk)
    let screenshotUrl = '';
    if (req.file) {
      const cloudUrl =
        (req.file as any).path ||
        (req.file as any).secure_url ||
        (req.file as any).url;

      if (cloudUrl && /^https?:\/\//i.test(cloudUrl)) {
        screenshotUrl = cloudUrl;
      } else if (req.file.filename) {
        screenshotUrl = `/uploads/billing/${req.file.filename}`;
      } else if (cloudUrl) {
        screenshotUrl = cloudUrl;
      }
    } else if (req.body.screenshotUrl) {
      screenshotUrl = req.body.screenshotUrl;
    } else if (req.body.screenshot) {
      screenshotUrl = req.body.screenshot;
    }

    if (!screenshotUrl) {
      res.status(400).json({
        success: false,
        message: 'Payment verification screenshot is required. Please upload a receipt or transfer proof.',
      });
      return;
    }

    // Create SeatRequest record
    const seatRequest = await SeatRequest.create({
      tenantId: tenant._id,
      planName: planName || 'Per Seat',
      requestedSeats: parsedSeats,
      totalAmount: parsedAmount,
      screenshotUrl,
      status: 'Pending',
      requestedBy: user._id,
      notes: notes || '',
    });

    // Record internal audit notification for tenant
    try {
      await Notification.create({
        tenantId: tenant.tenantId,
        tenant: tenant._id,
        title: 'Seat Upgrade Requested',
        message: `Seat upgrade request for +${parsedSeats} seats (${planName || 'Per Seat'}) submitted for Super Admin verification.`,
        type: 'system',
        read: false,
      });
    } catch (notifErr) {
      console.warn('Failed to record notification for seat request:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Request sent to Super Admin',
      seatRequest,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   GET /api/billing/my-requests
 * @desc    Fetch seat requests for the authenticated user's tenant
 * @access  Private (Company Admin / Super Admin)
 */
export const getMySeatRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const currentTenantId = user.tenantId || req.tenantId;
    if (!currentTenantId) {
      res.status(400).json({ success: false, message: 'Tenant identifier missing.' });
      return;
    }

    const tenant = await Tenant.findOne({ tenantId: currentTenantId });
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found.' });
      return;
    }

    const requests = await SeatRequest.find({ tenantId: tenant._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: requests.length,
      currentMaxSeats: tenant.maxSeats || 5,
      seatRequests: requests,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   GET /api/super-admin/seat-requests
 * @desc    Fetch pending (or all) seat requests for Super Admin
 * @access  Private (Super Admin strictly)
 */
export const getSuperAdminSeatRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query;

    const filter: Record<string, any> = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    const requests = await SeatRequest.find(filter)
      .populate('tenantId', 'name tenantId maxSeats status currency')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: requests.length,
      seatRequests: requests,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   PUT /api/super-admin/assign-seats/:requestId
 * @desc    Approve a seat request and dynamically increase tenant maxSeats
 * @access  Private (Super Admin strictly)
 */
export const assignSeats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { requestId } = req.params;

    const seatRequest = await SeatRequest.findById(requestId);
    if (!seatRequest) {
      res.status(404).json({
        success: false,
        message: 'Seat request not found.',
      });
      return;
    }

    if (seatRequest.status === 'Approved') {
      res.status(400).json({
        success: false,
        message: 'This seat request has already been approved.',
      });
      return;
    }

    const tenant = await Tenant.findById(seatRequest.tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Associated tenant organization not found.',
      });
      return;
    }

    // Increase tenant maxSeats
    const previousSeats = tenant.maxSeats || 5;
    const additionalSeats = seatRequest.requestedSeats || 0;
    tenant.maxSeats = previousSeats + additionalSeats;
    await tenant.save();

    // Mark request as Approved
    seatRequest.status = 'Approved';
    seatRequest.reviewedAt = new Date();
    seatRequest.reviewedBy = req.user?._id as any;
    await seatRequest.save();

    // Notify company
    try {
      await Notification.create({
        tenantId: tenant.tenantId,
        tenant: tenant._id,
        title: 'Seats Approved! 🎉',
        message: `Your payment was verified. Super Admin added +${additionalSeats} seats to ${tenant.name}. Total workspace capacity is now ${tenant.maxSeats} seats.`,
        type: 'system',
        read: false,
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch notification on seat approval:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: `Successfully approved request. Added ${additionalSeats} seats to ${tenant.name}. New limit: ${tenant.maxSeats}.`,
      tenant: {
        id: tenant._id,
        tenantId: tenant.tenantId,
        name: tenant.name,
        maxSeats: tenant.maxSeats,
      },
      seatRequest,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   PUT /api/super-admin/reject-seats/:requestId
 * @desc    Reject a pending seat request with optional reason
 * @access  Private (Super Admin strictly)
 */
export const rejectSeats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const seatRequest = await SeatRequest.findById(requestId);
    if (!seatRequest) {
      res.status(404).json({
        success: false,
        message: 'Seat request not found.',
      });
      return;
    }

    if (seatRequest.status === 'Approved') {
      res.status(400).json({
        success: false,
        message: 'Cannot reject a request that has already been approved.',
      });
      return;
    }

    seatRequest.status = 'Rejected';
    seatRequest.reviewedAt = new Date();
    seatRequest.reviewedBy = req.user?._id as any;
    if (reason) {
      seatRequest.notes = reason;
    }
    await seatRequest.save();

    const tenant = await Tenant.findById(seatRequest.tenantId);
    if (tenant) {
      try {
        await Notification.create({
          tenantId: tenant.tenantId,
          tenant: tenant._id,
          title: 'Seat Upgrade Request Rejected',
          message: `Your seat request for +${seatRequest.requestedSeats} seats could not be verified.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'system',
          read: false,
        });
      } catch (notifErr) {
        console.warn('Notification failed on seat rejection:', notifErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Seat request marked as Rejected.',
      seatRequest,
    });
  } catch (error: any) {
    next(error);
  }
};

