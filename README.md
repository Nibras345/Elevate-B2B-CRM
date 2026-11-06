# Elevate B2B CRM — Multi-Tenant Enterprise SaaS Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v8-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

An enterprise-grade, multi-tenant B2B SaaS Customer Relationship Management (CRM) platform engineered with the MERN stack and TypeScript. Elevate B2B CRM delivers robust workspace data isolation, granular Role-Based Access Control (RBAC), strict 5-seat capacity governance with manual local payment upgrades (JazzCash & Easypaisa), transactional email-driven member onboarding, automated Won/Closed lead-to-client conversions, universal deletion confirmation modals, pipeline revenue forecasting, client relationship databases, a fully database-driven invoicing ledger, and real-time Super Admin platform telemetry.

---

## 🌟 Key Highlights & Architectural Features

### 🏢 1. True Multi-Tenant Workspace Architecture
- **Tenant Isolation**: Every lead, client, deal, invoice, and user relationship is strictly partitioned by `tenantId` (ObjectId referencing `Tenant`), guarded by middleware (`protect` and `tenantGuard`).
- **Zero Cross-Tenant Leakage**: All read, write, update, and delete operations filter by the authenticated session's tenant context. Cross-tenant access attempts return `404 Not Found`.
- **Multi-Workspace Membership**: Users can belong to multiple distinct tenant organizations simultaneously using a unified corporate account.
- **Per-Workspace Roles**: A single user can act as `Company Admin` in one workspace and `Sales Agent` or `Employee` in another, with seamless contextual switching.
- **Safe Member Detachment**: Removing a member uses MongoDB `$pull` on the user's `workspaces` array, leaving their accounts and relationships in other workspaces intact.
- **Interactive Confirmation Dialog**: Trash icon triggers a custom confirmation modal ("Remove Team Member") ensuring no accidental member removal, complete with loading spinners and state cleanup.
- **Strict Role & Self-Deletion Guards**: Prevents Company Admins from deleting their own active accounts (`400 Bad Request`), restricts removal rights exclusively to admins, ensures strict `tenantId` isolation, and fully supports all system roles including `Support`.

### 👥 2. Strict 5-Seat Management & Capacity Governance
- **Strict Default 5-Seat Capacity**: Every tenant workspace enforces a default limit of **5 seats** (1 Admin + 4 Employees).
- **Dynamic Capacity Limit**: Workspaces that purchase seat upgrades have their `tenant.maxSeats` dynamically increased, allowing the system to scale beyond 5 seats while preserving strict limit enforcement.
- **Backend API Limit Enforcement**: `POST /api/team/invite` and `POST /api/team/accept-invite/:token` query MongoDB in real time to count existing active members plus pending invitations:
  ```typescript
  const currentSeatCount = await User.countDocuments({
    $or: [
      { tenantId: currentTenantId },
      { tenantIds: currentTenantId },
      { 'workspaces.tenantId': currentTenantId },
    ],
    isActive: { $ne: false },
  });
  if (currentSeatCount >= maxAllowedSeats || (currentSeatCount + pendingInvitesCount) >= maxAllowedSeats) {
    return res.status(403).json({
      success: false,
      message: `Seat limit reached. You cannot add more than ${maxAllowedSeats} members.`,
    });
  }
  ```
- **Frontend "+ Add Member" Button Guard**: Placed next to the refresh icon in Settings. Conditionally rendered only for admins (`Company Admin` or `Super Admin`), and dynamically disabled when `team.length >= seatStats.maxSeats`:
  ```tsx
  disabled={team.length >= seatStats.maxSeats || isSeatLimitReached}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
  ```
  Surfaces a real-time hover tooltip: `"Seat limit reached (5 / 5)"`.
- **Interactive Sidebar Seat Widget**: The "Seats in use" block in the sidebar features interactive hover styles (`cursor-pointer hover:bg-slate-800 rounded-md p-1`) and one-click redirection directly to `/team-members` (which routes to `/settings?tab=team`).
- **Instant Client-Side Sync**: Employs global browser event dispatching (`crm_seat_stats_updated`) to update the Sidebar subscription card and Team settings in real-time.

### 💳 3. Manual Billing & Seat Management System (JazzCash / Easypaisa)
- **Local Mobile Payment Verification**: Manual seat purchases via Pakistani mobile financial services (**JazzCash** and **Easypaisa**) targeting the verified merchant account: **`03224232219`**.
- **3 Transparent Pricing Tiers**:
  - **Default Plan**: 5 Workspace Seats (Forever Free) — Active by default for all workspaces.
  - **Per Seat Plan**: $15 / seat for custom granular scaling.
  - **Bundle Plan**: $55 / 5 seats ($11/seat effective rate, 27% savings).
- **Multipart Payment Proof Upload**: Multer disk-storage upload middleware (`/uploads/billing/`) with 10MB file limit, image mime validation, and static asset serving via Express (`app.use('/uploads', express.static(...))`).
- **Company Admin Billing Hub (`/billing`)**: Dedicated billing interface for Company Admins displaying current seat utilization, plan cards, interactive calculation modal, JazzCash/Easypaisa payment details, screenshot uploader, and request status history.
- **Super Admin Seat Assignment Console**: Dedicated `Seat Assignments` tab on `/super-admin` with pending request counters, clickable full-size screenshot verification modals, and 1-click `Approve` (dynamically increments `tenant.maxSeats`) and `Reject` actions.
- **Dynamic Capacity Unlock**: Approving a request immediately increments `tenant.maxSeats` and notifies the tenant via `Notification`, allowing the Company Admin to invite new teammates up to their expanded capacity limit without breaking strict seat boundaries.

### 🛡️ 4. Settings RBAC & Role Separation
- **Hidden "Company Settings" Tab**: Regular employees cannot see or access the "Company Settings" tab. The tab navigation conditionally renders it only for `Company Admin` or `Super Admin`:
  ```tsx
  const isAdmin = currentUser?.role === 'Company Admin' || currentUser?.role === 'Super Admin';
  // Company tab only included when isAdmin === true
  ```
- **URL Navigation Interceptor**: If an unauthorized user attempts to navigate directly to `?tab=company`, an active route guard redirects them immediately to `?tab=profile`. The tab content panel also checks `activeTab === 'company' && isAdmin`.
- **Admin-Only Team Management**: Inviting, adding, and removing team members is strictly guarded for admin roles on both client and server.

### ✉️ 5. Transactional Email Invitation Onboarding & Login Redirection
- **Cryptographic Token Verification**: Generates secure 32-byte hexadecimal tokens stored in an `Invitation` model with a 7-day expiration policy.
- **Nodemailer SMTP Integration**: Automated branded invitation emails containing the recipient's assigned role, department, workspace company, and an activation link.
- **Post-Acceptance Redirection Flow**:
  - After an invited user successfully submits the account setup form on `/invite/accept/:token`, their session is safely initialized.
  - The system dispatches a success toast message: `"Account setup complete. Please log in to continue."`.
  - The application strictly redirects the user to `/login` (`navigate('/login', { state: { email: invitation?.email } })`).
  - The `/login` page automatically detects the forwarded router state and pre-fills the invited user's email address for immediate sign-in.

### 📈 6. Leads Pipeline & Automated Won/Closed Lead-to-Client Conversion
- **Visual Kanban Board**: Interactive stages (`New Lead`, `Contacted`, `Proposal Sent`, `Negotiation`, `Won / Closed`) with real-time stage transitions.
- **Automated Lead-to-Client Conversion (`PUT /api/leads/:id`)**:
  - When a lead's stage is updated to `"Won / Closed"`, the backend automatically provisions or updates a corresponding `Client` record in the database.
  - Checks if a client with the lead's email already exists in the workspace to avoid duplication.
  - Maps `contactName`, `companyName`, `email`, `phoneNumber`, `country`, `city`, and aggregates `estimatedValue` into the Client's `lifetimeValue`.
  - Maps tenant IDs securely (resolving tenant codes like `TNT-TOKY-8511` to Mongoose ObjectIds) preventing any casting exceptions.
  - Isolated within a resilient `try...catch` block to ensure lead stage transitions succeed smoothly even if client schema constraints encounter warnings.
- **Dynamic Sales Reps & Locations**: Eliminates hardcoded reps; dynamic dropdowns query active members from `/api/users`. Full country tracking stored in `Lead.country` with zero dummy defaults.

### 💼 7. Client Directory & Dynamic Metrics
- **Dynamic Client Aggregation**: `GET /api/clients` dynamically aggregates each client's open `dealCount` and issued `invoiceCount` via MongoDB count queries.
- **Lifetime Value Tracking**: Accurately tracks accumulated client revenue and historical conversion timestamps.
- **Dynamic Country & Location Profiles**: "Add Client" and "Edit Client" modals support dynamic Country fields, pre-filling existing data on edit and persisting to MongoDB without hardcoded location fallbacks.
- **Real-Time Client Ledger & Audit Trail**: The "Client Ledger & Account History" drawer fetches live historical transactions (`GET /api/clients/:id/history`), displaying actual invoice generation and settlement dates alongside deal conversion milestones.

### 🧾 8. Invoices & Billing Hub (Dynamic & Persistent)
- **Zero Mock Data**: Fully database-driven invoicing system with MongoDB persistence.
- **Client Population**: Invoices populate client metadata (`contactName`, `companyName`, `email`, `phone`) using `.populate('clientId', 'contactName companyName email phone')`.
- **Dynamic KPI Widgets**: Top 4 summary cards compute live from the billing ledger:
  - **TOTAL INVOICED**: Total value of all issued invoices.
  - **SETTLED & PAID**: Total value of invoices with `Paid` status.
  - **PENDING PAYMENT**: Outstanding balance for invoices with `Pending` status.
  - **OVERDUE BALANCE**: Arrears balance for invoices past due (`Overdue` status).
- **Itemized Invoice Generator**: Dynamic line items, automatic subtotal calculation, configurable discount and tax rates, auto-generated sequential invoice numbers (`INV-YYYY-XXX`), and dynamic 30-day default due date calculation.
- **Instant Status Progression**: One-click checkmark action marks invoices as `Paid` via `PUT /api/invoices/:id/status`, immediately updating local state and recalculating KPI widgets without a page reload.
- **Printable Template**: Pixel-perfect invoice modal ready for browser print and PDF export.

### 🛡️ 9. Universal Deletion Confirmation Modals (`ConfirmDeleteModal`)
- **Zero Accidental Data Loss**: Completely eliminated browser-native `window.confirm()` popups in favor of accessible, responsive Tailwind CSS confirmation modals across all primary data tables and cards:
  - **Leads Pipeline**: Deleting a sales opportunity from Kanban cards or the Lead Drawer prompts a confirmation modal specifying the lead's contact/company name.
  - **Client Directory**: Deleting an enterprise client requires confirmation indicating the client company name.
  - **Invoices Ledger**: Removing an invoice requires explicit modal confirmation displaying the target invoice number.
- **Accessible & Clean UX**: Features dark backdrop blur (`bg-slate-950/80`), keyboard `Escape` dismissal, focus isolation, and asynchronous loading spinners (`isDeleting`) during Axios execution.

### 👑 10. Super Admin Command Center & 100% Real-Time Platform Telemetry
- **Dedicated Root Governance Interface**: A dedicated `/super-admin` master command console featuring a distinctive deep indigo/violet cyber-console theme to differentiate it from standard tenant CRM workspaces.
- **Strict Super Admin Protection (`requireSuperAdmin`)**: Frontend route guarded by `SuperAdminRoute` checking for `user.role === 'Super Admin'`. Backend endpoints strictly enforce `requireSuperAdmin` middleware, returning `403 Forbidden` for non-super-admin users.
- **Top 3 100% Real-Time Aggregated Platform KPIs**:
  - **TOTAL REGISTERED COMPANIES**: Live count of all unique registered tenant organizations across MongoDB via aggregation.
  - **TOTAL ACTIVE COMPANIES**: Real-time count of active, operational tenant organizations platform-wide (excludes suspended/deleted workspaces).
  - **GLOBAL PLATFORM REVENUE**: Real-time cross-tenant MongoDB aggregation dynamically summing all 'Won / Closed' deals and settled 'Paid' invoices (e.g., `$619,213`) with zero static, mock, or duplicated data.
- **Tab Navigation**:
  - **Registered Companies**: Directory of workspaces, seat progress indicator (`seatsUsed / maxSeats`), live company revenue, and operational toggles (Suspend / Delete).
  - **Seat Assignments**: Data table of customer seat upgrade requests with receipt verification modals and 1-click Approve / Reject actions.

### 🧭 11. Dynamic Sidebar Notification Badges & Live Metrics
- **Real-Time Tenant Metrics**: The sidebar notification badges dynamically query the backend (`GET /api/app/sidebar-stats`) to display real-time counts of actionable items isolated to the authenticated tenant.
- **Active Leads Counter**: Displays the total count of ongoing sales opportunities in the pipeline, automatically filtering out won or closed deals (`stage !== 'Won / Closed'`).
- **Pending Invoices Counter**: Tracks unpaid and pending billing balances (`status === 'Pending'`) requiring follow-up.
- **Zero-Count Conditional Hiding**: If a metric count is `0`, the notification badge is cleanly omitted from the UI to avoid visual clutter.
- **Event-Driven Synchronization**: Dispatches custom browser events (`crm_sidebar_stats_updated`) across invoice generation, status progressions (marking paid), lead stage changes, and deletions, instantly keeping the navigation badges in sync without requiring a page refresh.

### 🔔 12. Dynamic Notification Bell System
- **Database-Driven Alerts**: Notifications dropdown is completely free of static mock data and backed by a MongoDB `Notification` model with strict tenant isolation.
- **Automated Workflow Triggers**: Automatically records notifications on critical team events:
  - When invitations are dispatched (`POST /api/team/invite` -> "Invite Sent: Invitation sent to [email]").
  - When candidates accept and join (`POST /api/team/accept-invite/:token` -> "New Member Joined: [Name] has accepted the invitation").
  - When seat upgrades are approved (`PUT /api/super-admin/assign-seats/:id` -> "Seats Approved: +X seats added").
- **Dynamic Unread Badge**: Displays a vibrant red indicator badge with the exact unread count on the bell icon whenever `unreadCount > 0`.
- **One-Click Read Status**: "Mark all as read" button sends a `PUT /api/notifications/mark-all-read` request, instantly switching unread cards from blue to white and clearing the bell badge without page reload.

### 📊 13. Real-Time Executive Dashboard & Performance Analytics
- **Zero Static Mock Data**: Fully replaced mock metrics with dynamic aggregations fetched via `GET /api/dashboard/stats` and strictly isolated by `req.user.tenantId`.
- **Top Executive KPI Cards**:
  - **TOTAL REVENUE**: Real-time sum of `grandTotal` from paid invoices.
  - **ACTIVE LEADS**: Dynamic count of leads not yet in `Won / Closed` stage.
  - **DEALS CLOSED**: Count of successfully converted deals in `Won / Closed` stage.
  - **CONVERSION RATE**: Calculated on the backend as `(Deals Closed / Total Leads) * 100`.
- **Revenue Performance & Targets (Recharts)**: Interactive responsive `<LineChart>` comparing monthly billed actual revenue against quota targets with custom currency tooltips.
- **Leads by Pipeline Stage**: Aggregates active deals by stage with deal counts, estimated values, percentage yields, and total pipeline valuation (`totalPipelineValue`).
- **Recent Activities Feed**: Aggregates the latest cross-entity records across Leads, Invoices, and Clients, sorted chronologically with category filtering (`all`, `deal`, `invoice`, `lead`, `client`).
- **Dynamic Timeframe CSV Data Export**: "Export" button triggers `GET /api/dashboard/export?timeframe=...`, streaming a structured CSV report containing settled Invoices and converted Leads filtered dynamically by selected timeframes ("Last 7 Days", "This Month", "This Quarter", "Year to Date") with strict tenant isolation.

### 🏢 14. Role-Based Registration & Tenant Provisioning
- **Strict Role Separation**:
  - **Company Admin**: Requires `companyName` on registration. Automatically provisions a new, isolated `Tenant` record with customized currency, fiscal year, tax settings, and a default `maxSeats: 5`, generating a unique `tenantId` (e.g., `TNT-CORP-9402`).
  - **Employee**: Does not create a new tenant partition. Provisions an `Employee` user record ready to be linked to an existing workspace via invitation tokens or administrator assignment.
- **Zero-Error Waiting Room (`PendingInviteScreen`)**: When an employee logs in without an assigned `tenantId`, `ShellLayout` conditionally intercepts rendering before child components mount (`if (user && !user.tenantId) return <PendingInviteScreen />`). This prevents dashboard API calls from firing with missing tenant context, guiding the employee to await their administrator's invite.

### ⚡ 15. Scalable Server-Side Pagination
- **MongoDB Skip/Limit Execution**: High-volume data models (`Leads`, `Clients`, and `Invoices`) utilize server-side `.skip((page - 1) * limit).limit(limit)` queries and `countDocuments()` rather than dumping entire datasets into memory.
- **Standardized Pagination Payload**: The GET endpoints return metadata alongside records: `{ success: true, data: [...], pagination: { total, page, pages } }` with backward-compatible aliases.
- **Frontend Pagination Controls**: Fully integrated Previous/Next pagination bars with "Page X of Y" displays across the Leads Pipeline Kanban, Client Directory, and Invoices billing ledger.

### 🔒 16. Record-Level Ownership & Granular Authorization
- **Granular Document Authorship**: `Lead`, `Client`, and `Invoice` schemas track document authorship via `createdBy` referencing `User`.
- **Automatic Context Attachment**: Creation controllers (`POST /api/leads`, `/api/clients`, `/api/invoices`) automatically bind `req.body.createdBy = req.user._id`.
- **Strict Ownership Mutation Guards**:
  - `Company Admin` can update or delete ANY record across their workspace.
  - `Employee` roles can ONLY update or delete records they personally created.
  - Unauthorized modifications or deletions immediately return `403 Forbidden` (`"Unauthorized. You can only modify your own records."`).

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Modern functional components with TypeScript and React Router v7 |
| **Bundler & Build Tool** | **Vite 8** | High-speed ESM development and production bundle optimization |
| **Styling & UI** | **Tailwind CSS 3** | Utility-first styling with dark/light mode and custom theme tokens |
| **Data Visualization** | **Recharts 3** | Interactive responsive line charts, tooltips, and Cartesian analytics |
| **Iconography** | **Lucide React** | Consistent, modern SVG icon system |
| **HTTP Client** | **Axios** | Interceptors, Bearer token injection, and multipart/form-data upload |
| **Backend Runtime** | **Node.js (v20+)** | ES Module runtime executed with TypeScript `tsx` |
| **API Framework** | **Express.js 4** | Modular routing, typed request handlers, and middleware |
| **Database & ODM** | **MongoDB / Mongoose 8** | NoSQL schema modeling, population, compound indexing, and aggregation |
| **Authentication** | **JWT & Bcrypt.js** | Stateless Bearer token auth with salted password hashing |
| **File Storage** | **Multer & Cloudinary** | Dual storage: Multer disk storage for payment receipts, Cloudinary for profile pictures |
| **Email Service** | **Nodemailer** | SMTP transporter for invitations and recovery codes |

---

## 📂 Repository Directory Structure

```plaintext
CRM/
├── backend/                        # Express.js & TypeScript Server
│   ├── scripts/
│   │   └── setSuperAdmin.js        # CLI utility to promote users to Super Admin
│   ├── src/
│   │   ├── config/
│   │   │   ├── cloudinary.ts       # Cloudinary media configuration
│   │   │   └── db.ts               # MongoDB Mongoose connection handler
│   │   ├── controllers/
│   │   │   ├── appController.ts    # Sidebar notification metrics & app badges
│   │   │   ├── authController.ts   # Sign in, registration, forgot password
│   │   │   ├── billingController.ts# Seat purchase requests & manual payment verification
│   │   │   ├── clientController.ts # Enterprise clients & dynamic deal/invoice counts
│   │   │   ├── dashboardController.ts # Executive analytics, KPIs, pipeline & revenue aggregation
│   │   │   ├── invoiceController.ts# Invoices CRUD, status updates & population
│   │   │   ├── leadController.ts   # Leads pipeline & automated Won/Closed conversion workflow
│   │   │   ├── notificationController.ts # Notification feeds and mark-all-read
│   │   │   ├── superAdminController.ts # Global multi-tenant telemetry & platform governance
│   │   │   ├── teamController.ts   # Member invites, dynamic seat limit, removal, acceptance
│   │   │   ├── tenantController.ts # Tenant stats, seat usage, workspace details
│   │   │   └── userController.ts   # Profile updates, password modification, team members
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts   # JWT verification, tenant isolation guard, requireAdmin, requireSuperAdmin
│   │   │   ├── billingUpload.ts    # Multer disk-storage for payment verification screenshots
│   │   │   ├── errorMiddleware.ts  # Centralized error handler
│   │   │   └── uploadMiddleware.ts # Multer Cloudinary storage for profile pictures
│   │   ├── models/
│   │   │   ├── Client.ts           # Enterprise client schema with lifetime value & createdBy
│   │   │   ├── Invitation.ts       # Tokenized workspace invitation schema
│   │   │   ├── Invoice.ts          # Itemized invoice schema with status, client ref & createdBy
│   │   │   ├── Lead.ts             # Kanban lead schema with stage progression & createdBy
│   │   │   ├── Notification.ts     # Multi-tenant activity notification schema
│   │   │   ├── SeatRequest.ts      # Manual seat purchase request schema with screenshot proof
│   │   │   ├── Tenant.ts           # Company profile, branding, status, maxSeats schema
│   │   │   └── User.ts             # User credentials, roles, workspace memberships
│   │   ├── routes/
│   │   │   ├── appRoutes.ts        # /api/app endpoints (sidebar badge metrics)
│   │   │   ├── authRoutes.ts       # /api/auth endpoints
│   │   │   ├── billingRoutes.ts    # /api/billing endpoints (seat requests & my requests)
│   │   │   ├── clientRoutes.ts     # /api/clients endpoints
│   │   │   ├── dashboardRoutes.ts  # /api/dashboard endpoints (stats aggregation)
│   │   │   ├── invoiceRoutes.ts    # /api/invoices endpoints
│   │   │   ├── leadRoutes.ts       # /api/leads endpoints
│   │   │   ├── notificationRoutes.ts # /api/notifications endpoints
│   │   │   ├── superAdminRoutes.ts # /api/super-admin endpoints (stats, tenants & seat approvals)
│   │   │   ├── teamRoutes.ts       # /api/team endpoints
│   │   │   ├── tenantRoutes.ts     # /api/tenant endpoints
│   │   │   └── userRoutes.ts       # /api/users endpoints
│   │   ├── types/
│   │   │   └── index.ts            # Global backend TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── emailService.ts     # Nodemailer HTML template and email dispatch
│   │   │   └── tenantHelper.ts     # Tenant context resolution & validation helper
│   │   └── server.ts               # Express application entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/                       # React 19 & Tailwind CSS Client
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Badge.tsx               # Status badges
    │   │   │   ├── ConfirmDeleteModal.tsx  # Universal deletion confirmation modal
    │   │   │   ├── Drawer.tsx              # Slide-over detail panel
    │   │   │   └── Modal.tsx               # Reusable dialog modal
    │   │   ├── layout/
    │   │   │   ├── Navbar.tsx      # Top bar with user dropdown and notifications
    │   │   │   ├── ShellLayout.tsx # Main authenticated dashboard shell
    │   │   │   └── Sidebar.tsx     # Navigation, badges & interactive clickable "Seats in use" widget
    │   │   └── profile/
    │   │       └── ProfileSettings.tsx # Security, avatar, and password controls
    │   ├── context/
    │   │   ├── AuthContext.tsx     # Authentication state, JWT tokens, tenant storage
    │   │   └── NotificationContext.tsx # Toast notification messaging system
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── AcceptInvite.tsx # Onboarding page with post-activation /login redirection
    │   │   │   ├── ForgotPassword.tsx
    │   │   │   ├── Register.tsx
    │   │   │   └── SignIn.tsx       # Sign in with email pre-fill support from invite acceptance
    │   │   ├── Billing.tsx         # Manual billing, 3 pricing cards, JazzCash/Easypaisa upload
    │   │   ├── Clients.tsx         # Customer accounts with dynamic metrics & delete confirmation modal
    │   │   ├── Dashboard.tsx       # Executive analytics, KPI metrics, pipeline highlights
    │   │   ├── Invoices.tsx        # Dynamic billing ledger, live KPI widgets, generator & delete modal
    │   │   ├── LeadsPipeline.tsx   # Kanban deals with auto Won/Closed Client conversion & delete modal
    │   │   ├── PendingInviteScreen.tsx # Employee waiting room awaiting workspace invitation
    │   │   ├── Settings.tsx        # Tenant governance, RBAC tab protection, team table & 5-seat management
    │   │   └── SuperAdminDashboard.tsx # Platform master telemetry, tenant directory & seat assignments tab
    │   ├── routes/
    │   │   ├── AppRoutes.tsx       # Application routing tree
    │   │   ├── PrivateRoute.tsx    # Protected route navigation guards
    │   │   └── SuperAdminRoute.tsx # Super Admin role guard (/super-admin)
    │   ├── types/
    │   │   └── index.ts            # Client TypeScript interfaces
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    └── vite.config.ts
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **Package Manager**: `npm` (v10+)
- **Database**: Active MongoDB instance (Local or MongoDB Atlas)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/Nibras345/Elevate-B2B-CRM.git
cd Elevate-B2B-CRM
```

---

### Step 2: Backend Configuration & Startup

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` variables with your credentials:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   # MongoDB Database
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/CRM?retryWrites=true&w=majority

   # JWT Security
   JWT_SECRET=super_secret_jwt_cryptographic_key_here
   JWT_EXPIRES_IN=7d

   # Cloudinary Media Upload (Optional for avatars)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # SMTP Email Service (Nodemailer)
   SMTP_EMAIL=your_email@gmail.com
   SMTP_PASSWORD=your_app_specific_password
   ```

4. Launch the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will boot up at `http://localhost:5000` with hot-reload enabled via `tsx`.*

---

### Step 3: Frontend Configuration & Startup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ../frontend
   npm install
   ```

2. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend client will be available at `http://localhost:5173`.*

---

### Step 4: Super Admin Console Access (Optional)

To access the platform-wide Super Admin Console at `http://localhost:5173/super-admin`:

1. Promote an existing user to the `Super Admin` role via CLI:
   ```bash
   node backend/scripts/setSuperAdmin.js your_email@example.com
   ```
2. Sign in at `http://localhost:5173/login`.
3. Open `http://localhost:5173/super-admin` or click the **"Super Admin"** navigation link with the `CONSOLE` badge in the sidebar.

---

## 📡 Core API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Role-based registration (`Company Admin` provisions Tenant; `Employee` creates user) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and return JWT |
| `POST` | `/api/auth/forgot-password` | Public | Request password recovery reset OTP via email |
| `POST` | `/api/auth/reset-password` | Public | Reset password using verified recovery OTP |

### 👥 Team & Invitations (`/api/team`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/team` | Private | Retrieve all active members and pending invitations with dynamic `closedRevenue` aggregation |
| `POST` | `/api/team/invite` | Admin (`requireAdmin`) | Send email invitation with dynamic workspace capacity check (`currentSeatCount >= maxSeats` -> 403 Forbidden) |
| `DELETE` | `/api/team/:id` | Admin | Detach member (`$pull`) or cancel pending invite (with confirmation modal & self-deletion guard) |
| `DELETE` | `/api/team/remove/:id` | Admin | Alias for member detachment / invite cancellation |
| `GET` | `/api/team/invitation/:token` | Public | Validate invite token and retrieve tenant metadata |
| `POST` | `/api/team/accept-invite/:token` | Public | Accept invite (onboards new user or attaches workspace with capacity guard) |

### 🏢 Workspace & Seats (`/api/tenant`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tenant/stats` | Private | Fetch real-time `usedSeats`, `maxSeats` (dynamic), and active counts |

### 💳 Seat Billing & Manual Payments (`/api/billing`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/billing/request-seats` | Admin (`Company Admin`) | Submit payment screenshot (JazzCash/Easypaisa to 03224232219) and request seats |
| `GET` | `/api/billing/my-requests` | Admin (`Company Admin`) | Retrieve workspace seat purchase requests and status history |

### 🧭 App & Navigation Stats (`/api/app`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/app/sidebar-stats` | Private | Fetch real-time dynamic active leads & pending invoices badge counts |

### 🔔 Notifications & Alerts (`/api/notifications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Private | Fetch recent notifications (limit 20, newest first) for current tenant |
| `PUT` | `/api/notifications/mark-all-read` | Private | Mark all unread notifications as read for current tenant |

### 📊 Executive Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Private | Fetch real-time aggregated executive dashboard metrics (topMetrics, monthlyRevenue, leadsByStage, totalPipelineValue, recentActivities) strictly isolated by tenant |
| `GET` | `/api/dashboard/export` | Private | Export CRM report as CSV containing Invoices and Leads filtered by `timeframe` (Last 7 Days, This Month, This Quarter, Year to Date) with strict tenant isolation |

### 📈 Leads Pipeline (`/api/leads`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leads` | Private | Fetch paginated leads for current tenant (`?page=1&limit=10`) |
| `POST` | `/api/leads` | Private | Create a new lead opportunity with dynamically resolved assigned sales rep and country |
| `PUT` | `/api/leads/:id` | Private | Update lead details, country, or stage (auto-converts to Client upon 'Won / Closed') |
| `DELETE` | `/api/leads/:id` | Private | Delete a lead with strict tenant verification (guarded by `ConfirmDeleteModal`) |

### 💼 Clients (`/api/clients`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clients` | Private | Fetch paginated clients with dynamic `invoiceCount` & `dealCount` (`?page=1&limit=10`) |
| `GET` | `/api/clients/:id/history` | Private | Fetch real transaction history & audit trail for a specific client |
| `POST` | `/api/clients` | Private | Create a new enterprise client with dynamic location tracking |
| `PUT` | `/api/clients/:id` | Private | Update client information, status, and country |
| `DELETE` | `/api/clients/:id` | Private | Delete client record (guarded by `ConfirmDeleteModal`) |

### 🧾 Invoices & Billing (`/api/invoices`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/invoices` | Private | Fetch paginated invoices populated with client details (`?page=1&limit=10`) |
| `POST` | `/api/invoices` | Private | Create a new itemized electronic invoice with dynamic 30-day due date |
| `PUT` | `/api/invoices/:id/status` | Private | Update invoice status (`Paid`, `Pending`, `Overdue`) |
| `DELETE` | `/api/invoices/:id` | Private | Delete invoice with tenant isolation verification (guarded by `ConfirmDeleteModal`) |

### 👤 User Profile & Workspace Members (`/api/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Private | Fetch workspace team members (`_id`, `name`, `role`) for dropdowns and filters |
| `GET` | `/api/users/profile` | Private | Retrieve authenticated user's profile |
| `PUT` | `/api/users/profile` | Private | Update user details, phone, and department |
| `PUT` | `/api/users/change-password` | Private | Update account password with old password verification |
| `POST` | `/api/users/avatar` | Private | Upload user profile picture to Cloudinary |
| `POST` | `/api/users/forgot-password` | Public | Request 6-digit password recovery OTP via email |
| `POST` | `/api/users/verify-otp` | Public | Verify 6-digit recovery OTP validity and expiration |
| `POST` | `/api/users/reset-password` | Public | Reset password using verified recovery OTP |

### 👑 Super Admin Platform Telemetry (`/api/super-admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/super-admin/dashboard-stats` | Super Admin (`requireSuperAdmin`) | 100% Real-time dynamic metrics (`totalRegisteredCompanies`, `totalActiveCompanies`, `globalPlatformRevenue`) |
| `GET` | `/api/super-admin/tenants` | Super Admin (`requireSuperAdmin`) | List all registered companies with admin emails, seat usage (`seatsUsed/maxSeats`), live calculated revenue, and status |
| `PATCH` | `/api/super-admin/tenants/:id/status` | Super Admin (`requireSuperAdmin`) | Toggle or set company status between `Active` and `Suspended` |
| `DELETE` | `/api/super-admin/tenants/:id` | Super Admin (`requireSuperAdmin`) | Remove a tenant organization from the platform |
| `GET` | `/api/super-admin/seat-requests` | Super Admin (`requireSuperAdmin`) | Fetch pending or all customer seat upgrade requests with payment screenshots |
| `PUT` | `/api/super-admin/assign-seats/:requestId` | Super Admin (`requireSuperAdmin`) | Approve payment proof and dynamically add requested seats to `tenant.maxSeats` |
| `PUT` | `/api/super-admin/reject-seats/:requestId` | Super Admin (`requireSuperAdmin`) | Reject seat upgrade request with reason |

---

## 🛡️ Multi-Tenant Security & Isolation Standards

1. **Context Injection via Middleware**: Every private request passes through `protect`, which decodes the JWT and binds `req.user` and `req.tenantId`.
2. **Tenant Boundary Enforcement (`tenantGuard`)**: Queries are restricted to the calling tenant's workspace using compound filters (`{ tenantId: tenantObjectId }`).
3. **Role-Based Access Control (RBAC)**:
   - Critical governance operations—including member invitations, member removal, and company configuration—are strictly restricted to `Company Admin` and `Super Admin`.
   - Settings navigation completely hides the "Company Settings" tab from regular employees, with route interceptors enforcing the restriction.
4. **Strict Seat Capacity Safeguard**:
   - Backend checks both existing active user counts and pending invitation counts before permitting new invitations or member activations against `tenant.maxSeats` (default: 5).
   - Any attempt to exceed the allocated member limit returns `403 Forbidden: "Seat limit reached. You cannot add more than X members."`.
5. **Manual Payment Verification Security**:
   - All seat expansion requests are recorded in `SeatRequest` with status `'Pending'`.
   - Workspace seats are only increased after the Super Admin inspects the transfer screenshot and calls the approved assignment endpoint.
6. **Platform Super Admin Guard (`requireSuperAdmin`)**: The master console (`/super-admin`) and platform-wide telemetry APIs (`/api/super-admin/*`) are strictly protected by `requireSuperAdmin`, verifying that `req.user.role === 'Super Admin'`. Any unauthorized role receives `403 Forbidden: "Access Denied: Only Super Admins can access this resource."`.
7. **Self-Deletion Prevention**: Administrators cannot delete or detach their own active workspace account from the team governance interface.
8. **Record-Level Ownership Enforcement**: Schemas for `Lead`, `Client`, and `Invoice` require a `createdBy` reference to `User`. Company Admins can edit or delete any record in their workspace, while standard Employees can only modify or delete records they personally created (or are assigned to), returning `403 Forbidden` if unauthorized.
9. **Universal Deletion Confirmation**: Every destructive delete operation across Leads, Clients, and Invoices is protected by a modal confirmation dialog to prevent accidental data loss.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**. Feel free to use and modify it for personal or commercial projects.

All Rights Reserved By Nibras Siddiqi...
