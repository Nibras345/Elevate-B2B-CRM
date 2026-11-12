import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import teamRoutes from './routes/teamRoutes';
import tenantRoutes from './routes/tenantRoutes';
import leadRoutes from './routes/leadRoutes';
import clientRoutes from './routes/clientRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import appRoutes from './routes/appRoutes';
import notificationRoutes from './routes/notificationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import billingRoutes from './routes/billingRoutes';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorMiddleware';

// Load environment variables
dotenv.config();

const app: Application = express();

// Trust reverse proxy (Render, AWS, Nginx) for accurate client IP identification in rate limiters
app.set('trust proxy', 1);

// Security Headers: Apply Helmet at the top of the middleware stack
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = (process.env.CLIENT_URL || 'https://elevate-b2-b-crm.vercel.app').replace(/\/+$/, '');

// Allowed origins strictly including local development ports and live Vercel URL
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://elevate-b2-b-crm.vercel.app',
];

if (CLIENT_URL && !allowedOrigins.includes(CLIENT_URL)) {
  allowedOrigins.push(CLIENT_URL);
}

// Connect to MongoDB Database
await connectDB();

// Request logging middleware
app.use(morgan('dev'));

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static uploaded files (e.g., billing payment screenshots) BEFORE API routes
const uploadsDir = fs.existsSync(path.resolve(__dirname, '../uploads'))
  ? path.resolve(__dirname, '../uploads')
  : fs.existsSync(path.resolve(__dirname, 'uploads'))
  ? path.resolve(__dirname, 'uploads')
  : path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

// Also serve cwd/uploads if distinct and exists
const cwdUploads = path.resolve(process.cwd(), 'uploads');
if (cwdUploads !== uploadsDir && fs.existsSync(cwdUploads)) {
  app.use('/uploads', express.static(cwdUploads));
}

// Health Check Endpoint (exempt from general rate limiting)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'NexSphere CRM Enterprise API',
    timestamp: new Date().toISOString(),
  });
});

// Apply General Rate Limiter to all API endpoints
app.use('/api', generalLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/app', appRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/billing', billingRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`[Server Ready]: NexSphere CRM Backend running on http://localhost:${PORT}`);
  console.log(`[CORS Allowed Origin]: ${CLIENT_URL}`);
});

export default app;
