# Elevate B2B CRM — Multi-Tenant Enterprise SaaS Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v8-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Render](https://img.shields.io/badge/Render-Live%20Backend-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://elevate-b2b-crm.onrender.com)
[![Vercel](https://img.shields.io/badge/Vercel-Live%20Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://elevate-b2-b-crm.vercel.app)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Security](https://img.shields.io/badge/Security-Hardened%20(Helmet%20%2B%20RateLimit%20%2B%20NoSQL%20Sanitized)-blueviolet?style=for-the-badge)](https://expressjs.com/)
[![JWT Auth](https://img.shields.io/badge/JWT-Short%20Access%20(15m)%20%2B%20Long%20Refresh%20(7d)-crimson?style=for-the-badge)](https://jwt.io/)
[![Cookies](https://img.shields.io/badge/Cookies-HttpOnly%20%2B%20SameSite%20Protected-brightgreen?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

An enterprise-grade, multi-tenant B2B SaaS Customer Relationship Management (CRM) platform engineered with the MERN stack and TypeScript. Elevate B2B CRM delivers robust workspace data isolation, granular Role-Based Access Control (RBAC), strict 5-seat capacity governance with manual local payment upgrades (JazzCash & Easypaisa), short-lived access token (15m) & long-lived refresh token (7d) security with HttpOnly cookies and silent Axios refresh interceptors, transactional email-driven member onboarding, automated Won/Closed lead-to-client conversions, universal deletion confirmation modals, pipeline revenue forecasting, client relationship databases, a fully database-driven invoicing ledger, Cloudinary media storage, enterprise security hardening (Helmet, express-rate-limit, express-mongo-sanitize), and real-time Super Admin platform telemetry.

> ### 🌐 Live Production Deployments
> - **Web Application (Vercel Frontend)**: [https://elevate-b2-b-crm.vercel.app](https://elevate-b2-b-crm.vercel.app)
> - **API Service (Render Backend)**: [https://elevate-b2b-crm.onrender.com](https://elevate-b2b-crm.onrender.com)
> - **Health & Uptime Monitoring**: [https://elevate-b2b-crm.onrender.com/api/health](https://elevate-b2b-crm.onrender.com/api/health)

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
- **Local Mobile Payment Verification**: Manual seat purchases via Pakistani mobile financial services (**JazzCash** and **Easypaisa**) targeting the verified merchant account.
- **3 Transparent Pricing Tiers**:
  - **Default Plan**: 5 Workspace Seats (Forever Free) — Active by default for all workspaces.
  - **Per Seat Plan**: $15 / seat for custom granular scaling.
  - **Bundle Plan**: $55 / 5 seats ($11/seat effective rate, 27% savings).
- **Multipart Payment Proof Cloud Upload (Cloudinary + Multer)**: Robust dual-storage upload pipeline (`backend/src/middleware/billingUpload.ts`). Directly routes payment proof receipts to Cloudinary cloud storage under the dedicated `crm_billing` folder with a 10MB limit, image MIME type validation (`JPG`, `PNG`, `WEBP`), and auto-transformation (`1600x1600`, quality auto).
- **Ephemeral Storage Immunity & CDN Acceleration**: Offloading receipts directly to Cloudinary eliminates payment screenshot loss across Render container deployments and server restarts, while serving verification screenshots instantly to the Super Admin via Cloudinary's high-speed global CDN. Features resilient automatic fallback to local disk storage (`/uploads/billing/`) for offline development environments.
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
- **Dual-Resolution Workspace Deletion**: `DELETE /api/super-admin/tenants/:id` seamlessly resolves workspaces passed either as custom string codes (e.g., `"TNT-DIGI-1393"`) or MongoDB `ObjectId`s (`Tenant.findOne({ tenantId })` with fallback to `Tenant.findById()`).
- **Strict Schema-Typed Cascading Deletes**: When a tenant is deleted, all associated resources are purged matching their exact schema types to prevent Mongoose `CastError` failures:
  - `SeatRequest`, `Invoice`: strictly cleared via `tenantId: tenant._id` (ObjectId).
  - `Lead`, `Notification`: cleared via `$or: [{ tenantId: tenant._id }, { tenantCode }]`.
  - `Client`: cleared via `$or: [{ tenantId: tenant._id }, { tenantCode }]`.
  - `User`: cleans up matching `tenantId`, `tenant`, `tenantIds`, `tenants`, and nested `workspaces` arrays.
  - Finally, deletes the `Tenant` document itself cleanly within an isolated `try...catch` block.

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

### 🛡️ 17. Production Security Hardening & Zero-Trust Defense
- **HTTP Security Headers (`helmet`)**: Configured at the top of Express middleware pipeline with Cross-Origin Resource Policy (`cross-origin`), hardening the API against clickjacking, cross-site scripting (XSS), MIME type sniffing, and insecure transport vulnerabilities.
- **Reverse Proxy IP Trust (`app.set('trust proxy', 1)`)**: Configured globally in `server.ts` to accurately resolve genuine client IP addresses through Render, AWS, or Nginx load balancers and reverse proxies, ensuring rate limiters identify individual bad actors without penalizing shared proxy IPs.
- **Dual-Tier Dynamic Rate Limiting (`express-rate-limit`)**:
  - **Auth Rate Limiter (`authLimiter`)**: Strictly limits failed login attempts to **5 attempts per 15 minutes** per IP address in production, responding with `429 Too Many Requests` (`"Too many login attempts from this IP, please try again after 15 minutes."`) with standard RFC headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`). Employs `skipSuccessfulRequests: true` so valid authentications never consume the limit, completely neutralizing brute-force credential stuffing.
  - **General API Limiter (`generalLimiter`)**: Enforces a threshold of **100 requests per 15 minutes** per IP across all `/api/*` endpoints (relaxed in development), preventing Distributed Denial of Service (DDoS) and API spam. The `/api/health` heartbeat route and CORS preflight `OPTIONS` requests are explicitly exempt.
- **NoSQL Query Injection Sanitization (`express-mongo-sanitize`)**: Mounted immediately after `express.json()` and `express.urlencoded()` body parsers. Proactively sanitizes `req.body`, `req.query`, and `req.params` by stripping any prohibited characters (such as `$` and `.`), preventing MongoDB operator injection attacks like `{"$gt": ""}`.
- **Strict Cross-Origin Resource Sharing (CORS)**: Dynamically verifies origins across production (`https://elevate-b2-b-crm.vercel.app`), local development ports (`http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`, and `127.0.0.1`), and Vercel preview deployments, configuring `credentials: true` for secure cookies and headers (`Authorization`, `Content-Type`, `X-Requested-With`, `Accept`, `Origin`).
- **Real-Time Visual Terminal Logger**: Custom development and production telemetry middleware in `server.ts` logging every incoming API request with method, endpoint, ANSI color-coded status codes (Green for 2xx, Cyan for 3xx, Yellow for 4xx, Red for 5xx), and execution duration in milliseconds.

### 🔐 18. Short Access Token (15m) & Long Refresh Token (7d) Architecture
- **Short-Lived Access Token (15m)**: Generated upon login and registration, signed with `JWT_SECRET`, and carrying user identity, active role, and tenant context. Short lifespan limits exposure in the event of client-side leakage.
- **Long-Lived Refresh Token (7d)**: Generated and signed with `JWT_REFRESH_SECRET` (or `JWT_SECRET`). Securely persisted to the database on `User.refreshToken` to track active sessions.
- **Instant Server-Side RBAC Revocation**: Because refresh tokens are verified against MongoDB on every rotation, administrators or users can immediately revoke active sessions by nullifying the user's `refreshToken` in the database, blocking unauthorized access within 15 minutes or instantly upon token refresh.
- **Cross-Domain HttpOnly Cookies**: Both tokens are dispatched in secure HttpOnly cookies (`accessToken` with 15m `maxAge` and `refreshToken` with 7d `maxAge`). Uses environment-aware security flags:
  - **Production (Render <-> Vercel)**: `secure: true`, `sameSite: 'none'`, `httpOnly: true`.
  - **Development (Localhost)**: `secure: false`, `sameSite: 'lax'`, `httpOnly: true` (preventing browser cookie drop on plain HTTP).
- **Dual-Layer Authentication Resilience**: To guarantee 100% reliability in browsers blocking third-party cross-site cookies (e.g. Chrome 120+ third-party cookie restrictions between `localhost` and `onrender.com`), the backend also returns tokens in the response JSON, and the frontend automatically attaches an `Authorization: Bearer <token>` fallback header via Axios. The `protect` middleware checks both cookies and headers seamlessly:
  ```typescript
  let token = req.cookies?.accessToken || req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  ```
- **Silent Refresh Interceptor with Concurrency Queue (`frontend/src/api/axios.ts`)**:
  - Automatically intercepts any `401 Unauthorized` API response caused by access token expiration.
  - Pauses failed requests in a concurrency-safe promise queue (`failedQueue`) to prevent token refresh race conditions when multiple API calls fail simultaneously.
  - Silently dispatches a single POST request to `/api/auth/refresh` using the HttpOnly refresh cookie (with fallback request body).
  - On success, updates `localStorage`, `axios.defaults.headers.common['Authorization']`, and replays all queued requests seamlessly without user awareness or page reload.
  - If the refresh token is also expired or revoked, clears session storage and safely redirects the user to `/login`.
- **Session Termination (`POST /api/auth/logout`)**: Clears both `accessToken` and `refreshToken` cookies from the browser with matching domain and security flags, removes the `refreshToken` from the user's MongoDB record, and deletes local client tokens.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Modern functional components with TypeScript and React Router v7 |
| **Bundler & Build Tool** | **Vite 8** | High-speed ESM development and production bundle optimization |
| **Styling & UI** | **Tailwind CSS 3** | Utility-first styling with dark/light mode and custom theme tokens |
| **Data Visualization** | **Recharts 3** | Interactive responsive line charts, tooltips, and Cartesian analytics |
| **Iconography** | **Lucide React** | Consistent, modern SVG icon system |
| **HTTP Client** | **Axios 1.7+** | Centralized client (`src/api/axios.ts`) with concurrency-safe 401 silent refresh interceptors |
| **Backend Runtime** | **Node.js (v20+)** | ES Module runtime executed with TypeScript `tsx` |
| **API Framework** | **Express.js 4** | Modular routing, typed request handlers, and middleware |
| **Database & ODM** | **MongoDB / Mongoose 8** | NoSQL schema modeling, population, compound indexing, and aggregation |
| **Authentication** | **JWT & Bcrypt.js** | Short 15m Access Token + 7d Refresh Token, DB-level revocation, and salted password hashing |
| **Cookie Management**| **cookie-parser** | HttpOnly, Secure, SameSite cross-domain cookie parsing and delivery |
| **Input Validation** | **Zod 4** | Strict type-safe schema validation middleware for API requests (`body`, `query`, `params`) |
| **Security & Hardening** | **Helmet & Mongo-Sanitize** | HTTP security headers, NoSQL query sanitizer, and reverse proxy trust |
| **Rate Limiting** | **express-rate-limit** | Brute-force auth limiter (5 req/15m) and general API limiter (100 req/15m) |
| **Telemetry & Logs** | **Custom Terminal Logger** | Real-time ANSI colored HTTP request, status code, and latency telemetry |
| **File Storage** | **Multer & Cloudinary** | Cloud CDN media for avatars (`crm_avatars`) and billing proofs (`crm_billing`) |
| **Email Service** | **Nodemailer** | SMTP transporter for invitations and recovery codes |
| **Production Hosting** | **Vercel & Render** | Frontend on Vercel Edge; Backend on Render Web Service; DB on MongoDB Atlas |

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
│   │   │   ├── billingUpload.ts    # Multer Cloudinary storage for payment verification screenshots (crm_billing)
│   │   │   ├── errorMiddleware.ts  # Centralized error handler
│   │   │   ├── rateLimiter.ts      # Dual-tier rate limiting (authLimiter & generalLimiter)
│   │   │   ├── uploadMiddleware.ts # Multer Cloudinary storage for profile pictures (crm_avatars)
│   │   │   └── validateResource.ts # Generic Zod request schema validation middleware
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
│   │   │   ├── authRoutes.ts       # /api/auth endpoints (rate-limited login & Zod validated)
│   │   │   ├── billingRoutes.ts    # /api/billing endpoints (seat requests & my requests)
│   │   │   ├── clientRoutes.ts     # /api/clients endpoints
│   │   │   ├── dashboardRoutes.ts  # /api/dashboard endpoints (stats aggregation)
│   │   │   ├── invoiceRoutes.ts    # /api/invoices endpoints
│   │   │   ├── leadRoutes.ts       # /api/leads endpoints (Zod validated create & update)
│   │   │   ├── notificationRoutes.ts # /api/notifications endpoints
│   │   │   ├── superAdminRoutes.ts # /api/super-admin endpoints (stats, tenants & seat approvals)
│   │   │   ├── teamRoutes.ts       # /api/team endpoints
│   │   │   ├── tenantRoutes.ts     # /api/tenant endpoints
│   │   │   └── userRoutes.ts       # /api/users endpoints
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts      # Zod validation schemas for User registration & login
│   │   │   ├── index.ts            # Central barrel exports for Zod schemas
│   │   │   ├── lead.schema.ts      # Zod validation schemas for Lead creation & updates
│   │   │   └── user.schema.ts      # User validation schema aliases
│   │   ├── types/
│   │   │   └── index.ts            # Global backend TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── emailService.ts     # Nodemailer HTML template and email dispatch
│   │   │   └── tenantHelper.ts     # Tenant context resolution & validation helper
│   │   └── server.ts               # Express application entrypoint with Helmet, RateLimiter & NoSQL sanitize
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/                       # React 19 & Tailwind CSS Client
    ├── src/
    │   ├── api/
    │   │   ├── axios.ts            # Configured Axios instance (Vercel -> Render proxy withCredentials)
    │   │   └── index.ts            # Central API barrel export
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

   # JWT Security & Refresh Token Rotation
   JWT_SECRET=super_secret_jwt_access_cryptographic_key_here
   JWT_REFRESH_SECRET=super_secret_jwt_refresh_cryptographic_key_here
   JWT_EXPIRES_IN=15m

   # Cloudinary Media Upload (For user profile avatars & manual billing payment receipts)
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

2. (Optional) Configure environment variables in `frontend/.env` if pointing to local backend:
   ```env
   # Defaults automatically to live Render backend if omitted:
   VITE_API_URL=http://localhost:5000
   ```

3. Launch the Vite development server:
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

### 🏥 Health & System Telemetry (`/api/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Real-time server health and service uptime heartbeat (exempt from rate limit) |

### 🔐 Authentication & Session Security (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Role-based registration (`Company Admin` provisions Tenant; `Employee` creates user), sets HttpOnly tokens |
| `POST` | `/api/auth/login` | Public (Rate Limited) | Authenticate credentials; issues 15m Access Token & 7d Refresh Token in HttpOnly cookies + JSON (max 5 failed attempts / 15m) |
| `POST` | `/api/auth/refresh` | Public | Generate fresh 15m Access Token using verified 7d Refresh Token (from HttpOnly cookie or body fallback) |
| `POST` | `/api/auth/logout` | Public | End session, clear HttpOnly cookies, and revoke refresh token in MongoDB |
| `GET` | `/api/auth/me` | Private | Verify authentication and fetch current user profile and workspace tenant context |
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
| `POST` | `/api/billing/request-seats` | Admin (`Company Admin`) | Submit payment screenshot (JazzCash/Easypaisa) and request seats |
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
| `DELETE` | `/api/super-admin/tenants/:id` | Super Admin (`requireSuperAdmin`) | Delete tenant with dual ID resolution (custom code or ObjectId) and typed cascading cleanup |
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
10. **HTTP Security Header Protection (`helmet`)**: Express requests are guarded by Helmet, setting secure HTTP headers with Cross-Origin Resource Policy (`cross-origin`) to mitigate clickjacking, MIME sniffing, and cross-site scripting (XSS).
11. **NoSQL Query Injection Prevention (`express-mongo-sanitize`)**: Body and query inputs (`req.body`, `req.query`, `req.params`) are strictly sanitized to strip forbidden MongoDB query operators (`$` and `.`), preventing unauthenticated database manipulation.
12. **Dual-Tier Dynamic Rate Limiting (`express-rate-limit`)**:
    - **Authentication Guard**: Max 5 attempts per 15 minutes on `POST /api/auth/login` to prevent credential stuffing and brute-force attacks.
    - **General API Defense**: Max 100 requests per 15 minutes across all `/api/*` endpoints to eliminate API abuse and denial-of-service threats.
13. **Reverse Proxy Trust Verification**: Configured `app.set('trust proxy', 1)` enables accurate client IP identification through Render, AWS, and Nginx reverse proxies.
14. **Persistent Cloudinary Audit Storage**: Financial receipts and payment verification screenshots are streamed directly to Cloudinary (`crm_billing`), guaranteeing zero data loss across ephemeral cloud container lifecycles.
15. **Short-Lived Access & Long Refresh Token Lifecycle**: Issues 15-minute Access Tokens and 7-day Refresh Tokens. Refresh tokens are persisted to MongoDB (`User.refreshToken`), enabling instant server-side session revocation on logout or role updates.
16. **HttpOnly & SameSite Cookie Transport**: Transports authentication tokens via secure HttpOnly cookies (`accessToken` and `refreshToken`), shielding credentials from malicious client-side JavaScript (XSS) extraction.
17. **Dual-Layer Authentication Resilience**: Backend `protect` middleware accepts either HttpOnly cookies or `Authorization: Bearer <token>` fallback headers, guaranteeing 100% operational resilience across cross-domain environments and restrictive browser third-party cookie policies.
18. **Concurrency-Safe Silent Token Refresh**: Axios response interceptors catch 401s, queue outbound requests, silently request new tokens via `/api/auth/refresh`, and transparently replay failed requests without interrupting user workflow.
19. **Real-Time Request & Status Telemetry**: High-visibility terminal logger in `server.ts` outputs ANSI color-coded HTTP methods, routes, status codes, and latency in milliseconds for every API invocation.
20. **Strict Schema-Based Request Validation (`Zod` + `validateResource`)**: Inbound payload contracts are strictly validated at the routing perimeter before hitting controller logic. Rejects malformed bodies, missing required parameters, or invalid email/password formats with `400 Bad Request` and structured error responses.

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
