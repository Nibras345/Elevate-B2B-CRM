# Elevate B2B CRM — Multi-Tenant Enterprise SaaS Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v8-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

An enterprise-grade, multi-tenant B2B SaaS Customer Relationship Management (CRM) platform engineered with the MERN stack and TypeScript. Elevate B2B CRM delivers robust workspace data isolation, granular Role-Based Access Control (RBAC), dynamic seat allocation, transactional email-driven member onboarding, pipeline revenue forecasting, client relationship databases, and invoicing pipelines.

---

## 🌟 Key Highlights & Architectural Features

### 🏢 1. True Multi-Tenant Workspace Architecture
- **Tenant Isolation**: Every lead, client, deal, invoice, and user relationship is partitioned by a unique `tenantId` and MongoDB ObjectId reference (`tenant`), guarded by strict middleware (`tenantGuard`).
- **Multi-Workspace Membership**: Users can belong to multiple distinct tenant organizations simultaneously using a unified corporate account.
- **Per-Workspace Roles**: A single user can act as `Company Admin` in one tenant and `Sales Agent` in another, with contextual role switching.
- **Safe Member Detachment**: Removing a member uses MongoDB `$pull` on the user's `workspaces` array, leaving their accounts and relationships in other workspaces completely intact.

### 👥 2. Dynamic Seat Management & Governance
- **Configurable Seat Limits**: Tenant workspaces feature dynamic seat thresholds (`maxSeats`, default: 25).
- **Real-Time Seat Aggregation**: The `GET /api/tenant/stats` endpoint calculates `usedSeats` as `(Active Users Count) + (Pending Invites Count)` in real time.
- **Seat Guard Enforcement**: Both frontend and backend reject invitation requests when the tenant capacity is met (`400 Bad Request: "Seat limit reached"`).
- **Instant Client-Side Sync**: Employs global browser event dispatching (`crm_seat_stats_updated`) to update the Sidebar subscription card and Team settings in real-time.

### ✉️ 3. Transactional Email Invitation Onboarding
- **Cryptographic Token Verification**: Generates secure 32-byte hexadecimal tokens stored in an `Invitation` model with a 7-day expiration policy.
- **Dual Onboarding Paths**:
  - **New Users**: Land on `/invite/accept/:token`, set their full name and secure password, and instantly join the workspace.
  - **Existing Users**: Authenticated users who already belong to another tenant can join new workspaces with a single click without setting redundant passwords.
- **Nodemailer SMTP Integration**: Automated branded invitation emails with direct activation links.

### 📊 4. Core CRM Business Modules
- **Interactive Dashboard**: High-level executive KPIs, monthly recurring revenue (MRR), pipeline stage summaries, conversion rate metrics, and recent activity feeds.
- **Leads & Deals Pipeline**: Visual Kanban board with stage progressions (New Lead, Qualified, In Discussion, Negotiation, Closed Won).
- **Client Management Directory**: Customer accounts, company domains, deal values, contact registries, and communication histories.
- **Invoices & Billing Hub**: Invoice generator, tax calculators, payment terms (Net 30/60 Days), and payment settlement statuses.
- **Security & Tenant Settings**: Two-factor authentication (2FA) toggles, profile image uploads via Cloudinary, company address settings, and password update utilities.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Built with TypeScript and React Router v7 |
| **Bundler & Build Tool** | **Vite 8** | High-speed ESM development and optimized bundling |
| **Styling & UI** | **Tailwind CSS 3** | Utility-first CSS with dark/light mode and custom theme tokens |
| **Icons & Assets** | **Lucide React** | Modern, lightweight SVG iconography |
| **HTTP Client** | **Axios** | Interceptors, Bearer token injection, and error handling |
| **Backend Runtime** | **Node.js (v20+)** | ES Module runtime executed with TypeScript `tsx` |
| **API Framework** | **Express.js 4** | Modular routing, typed request handlers, and middleware |
| **Database & ODM** | **MongoDB / Mongoose 8** | Scalable NoSQL schema modeling with indexing and `$pull` |
| **Authentication** | **JWT & Bcrypt.js** | Stateless Bearer token auth with salted password hashing |
| **File Storage** | **Cloudinary & Multer** | Cloud-based media storage for user and organization logos |
| **Email Service** | **Nodemailer** | SMTP transporter for invitations and recovery codes |

---

## 📂 Repository Directory Structure

```plaintext
CRM/
├── backend/                        # Express.js & TypeScript Server
│   ├── src/
│   │   ├── config/
│   │   │   ├── cloudinary.ts       # Cloudinary media configuration
│   │   │   └── db.ts               # MongoDB Mongoose connection handler
│   │   ├── controllers/
│   │   │   ├── authController.ts   # Sign in, registration, forgot password
│   │   │   ├── teamController.ts   # Member invites, listing, removal, acceptance
│   │   │   ├── tenantController.ts # Tenant stats, seat usage, workspace details
│   │   │   └── userController.ts   # Profile updates, password modification, avatars
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts   # JWT verification, tenant isolation guard, RBAC
│   │   │   └── errorMiddleware.ts  # Centralized error handler
│   │   ├── models/
│   │   │   ├── Invitation.ts       # Tokenized workspace invitation schema
│   │   │   ├── Tenant.ts           # Company profile, branding, maxSeats schema
│   │   │   └── User.ts             # User credentials, roles, workspace memberships
│   │   ├── routes/
│   │   │   ├── authRoutes.ts       # /api/auth endpoints
│   │   │   ├── teamRoutes.ts       # /api/team endpoints
│   │   │   ├── tenantRoutes.ts     # /api/tenant endpoints
│   │   │   └── userRoutes.ts       # /api/users endpoints
│   │   ├── types/
│   │   │   └── index.ts            # Global backend TypeScript interfaces
│   │   ├── utils/
│   │   │   └── emailService.ts     # Nodemailer HTML template and email dispatch
│   │   └── server.ts               # Express application entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/                       # React 19 & Tailwind CSS Client
    ├── src/
    │   ├── components/
    │   │   ├── common/             # Modals, badges, buttons, spinners
    │   │   ├── layout/
    │   │   │   ├── Header.tsx      # Top bar with user dropdown and notifications
    │   │   │   ├── ShellLayout.tsx # Main authenticated dashboard shell
    │   │   │   └── Sidebar.tsx     # Navigation & dynamic "Seats in use" widget
    │   │   └── profile/
    │   │       └── ProfileSettings.tsx # Security, avatar, and password controls
    │   ├── context/
    │   │   ├── AuthContext.tsx     # Authentication state, JWT tokens, tenant storage
    │   │   └── NotificationContext.tsx # Toast notification messaging system
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── AcceptInvite.tsx # Onboarding page for invited teammates
    │   │   │   ├── ForgotPassword.tsx
    │   │   │   ├── Register.tsx
    │   │   │   └── SignIn.tsx
    │   │   ├── Clients.tsx         # Customer accounts and directory
    │   │   ├── Dashboard.tsx       # Analytics, KPI metrics, and pipeline highlights
    │   │   ├── Invoices.tsx        # Invoices, billing, and payment tracking
    │   │   ├── LeadsPipeline.tsx   # Kanban deals and opportunities
    │   │   └── Settings.tsx        # Tenant governance, team table & seat management
    │   ├── routes/
    │   │   ├── AppRoutes.tsx       # Application routing tree
    │   │   └── PrivateRoute.tsx    # Protected route navigation guards
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

## 📡 Core API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new company organization & admin account |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and return JWT |
| `POST` | `/api/auth/forgot-password` | Public | Request password recovery reset OTP via email |
| `POST` | `/api/auth/reset-password` | Public | Reset password using verified recovery OTP |

### 👥 Team & Invitations (`/api/team`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/team` | Private | Retrieve all active members and pending invitations |
| `POST` | `/api/team/invite` | Admin | Send email invitation with seat limit verification |
| `DELETE` | `/api/team/remove/:id` | Admin | Detach member (`$pull`) or cancel pending invite |
| `GET` | `/api/team/invitation/:token` | Public | Validate invite token and retrieve tenant metadata |
| `POST` | `/api/team/accept-invite/:token` | Public | Accept invite (onboards new user or attaches workspace) |

### 🏢 Workspace & Seats (`/api/tenant`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tenant/stats` | Private | Fetch real-time `usedSeats`, `maxSeats`, and active counts |

### 👤 User Profile (`/api/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Private | Retrieve authenticated user's profile |
| `PUT` | `/api/users/profile` | Private | Update user details, phone, and department |
| `PUT` | `/api/users/change-password` | Private | Update account password with old password verification |
| `POST` | `/api/users/avatar` | Private | Upload user profile picture to Cloudinary |

---

## 🛡️ Multi-Tenant Security & Isolation Standards

1. **Context Injection via Middleware**: Every private request passes through `protect`, which decodes the JWT and binds `req.user` and `req.tenantId`.
2. **Tenant Boundary Enforcement (`tenantGuard`)**: Queries are restricted to the calling tenant's workspace using compound filters (`$or: [{ tenantId }, { tenantIds }, { 'workspaces.tenantId' }]`).
3. **Role Validation (`authorizeRoles`)**: Critical operations (inviting colleagues, cancelling invites, modifying organization settings) are strictly restricted to `Company Admin` and `Super Admin`.
4. **Self-Deletion Prevention**: Administrators cannot delete or detach their own active workspace account from the team governance interface.

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
