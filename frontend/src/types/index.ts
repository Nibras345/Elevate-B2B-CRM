export type Role = 'Company Admin' | 'Employee' | 'Sales Agent' | 'Support';

export type PipelineStage = 'New Lead' | 'Contacted' | 'Proposal Sent' | 'Negotiation' | 'Won';

export type Priority = 'High' | 'Medium' | 'Low';

export type ClientStatus = 'Active' | 'Inactive' | 'Pending';

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft';

export interface AssignedUser {
  name: string;
  avatar: string;
  role: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  priority: Priority;
  stage: PipelineStage;
  assignedTo: AssignedUser;
  tags: string[];
  source: string;
  expectedClose: string;
  lastActivity: string;
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  ltv: number;
  status: ClientStatus;
  industry: string;
  lastContacted: string;
  address: string;
  city: string;
  country: string;
  openDealsCount: number;
  invoicesCount: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  company: string;
  email: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  paymentTerms: string;
  notes: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'Active' | 'Invited';
  avatar: string;
  phone: string;
  leadsCount: number;
  closedValue: string;
}

export interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  avatar: string;
  profilePicture?: string;
  phone?: string;
  role: Role;
  companyName: string;
  tenantId: string;
  department?: string;
  joinedDate?: string;
}

export interface TenantSettings {
  companyName: string;
  tenantId: string;
  logoUrl?: string;
  currency: string;
  fiscalYear: string;
  defaultTaxRate: number;
  invoiceTerms: string;
  address: string;
  website: string;
}

export interface KPIItem {
  id: string;
  title: string;
  value: string;
  change: string;
  period: string;
  isPositive: boolean;
  color: string;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  target: number;
}

export interface StageFunnelItem {
  stage: PipelineStage;
  count: number;
  value: string;
  percentage: number;
  color: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  avatar: string;
  action: string;
  target: string;
  value: string;
  time: string;
  type: 'deal' | 'invoice' | 'lead' | 'client' | 'payment';
}
