import { z } from 'zod';

// ==========================================
// DECOUPLED STATUSES (Strict Separation)
// ==========================================
export const LeadStatusSchema = z.enum(['New', 'Contacted', 'Qualified', 'Lost']);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const AccommodationStatusSchema = z.enum([
  'Requirement Pending',
  'Options Shared',
  'Shortlisted',
  'Property Selected',
]);
export type AccommodationStatus = z.infer<typeof AccommodationStatusSchema>;

export const BookingStatusSchema = z.enum([
  'Not Started',
  'Processing',
  'Documents Pending',
  'Application Submitted',
  'Approved',
  'Payment Pending',
  'Booked',
  'Cancelled',
  'Move-in Confirmed',
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const MoveInStatusSchema = z.enum(['Upcoming', 'Moved In', 'No Show', 'Cancelled']);
export type MoveInStatus = z.infer<typeof MoveInStatusSchema>;

export const CommissionStatusSchema = z.enum([
  'Pending',
  'Due',
  'Received',
  'Partner Payable',
  'Paid',
]);
export type CommissionStatus = z.infer<typeof CommissionStatusSchema>;

export const UserRoleSchema = z.enum([
  'admin',
  'management',
  'portfolio_owner',
  'sales',
  'finance',
  'partner',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const PartnerTypeSchema = z.enum([
  'Study Abroad Consultant',
  'Bank',
  'VAS Company',
  'Education Company',
  'Referral Partner',
  'Strategic Partner',
  'Direct',
]);
export type PartnerType = z.infer<typeof PartnerTypeSchema>;

// ==========================================
// STUDENT SCHEMA (Master Record)
// ==========================================
export const StudentSchema = z.object({
  id: z.string(), // document ID
  studentId: z.string().regex(/^HA-\d{4}-\d{6}$/), // e.g. HA-2026-001245
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  whatsApp: z.string(),
  nationality: z.string().default('India'),
  currentCountry: z.string().default('India'),
  university: z.string(),
  course: z.string(),
  intake: z.string(), // e.g. Sep 2026, Jan 2027
  destinationCountry: z.string(),
  destinationCity: z.string(),
  moveInDate: z.string(),
  moveOutDate: z.string(),
  budget: z.number(),
  currency: z.string().default('GBP'),
  preferredRoom: z.string().default('En-suite'),
  accommodationPreference: z.string().default('Walking distance to campus, bills included'),
  occupants: z.number().default(1),
  passportStatus: z.string().default('Verified'),
  leadSource: z.string(), // e.g. Study Abroad Consultants, Website, etc.
  partnerId: z.string(), // e.g. PART-00482 or 'direct'
  partnerName: z.string().optional(),
  assignedSalesExecutiveId: z.string(), // e.g. EMP-001
  assignedSalesExecutiveName: z.string(),
  
  // Decoupled Status Block
  leadStatus: LeadStatusSchema,
  accommodationStatus: AccommodationStatusSchema,
  bookingStatus: BookingStatusSchema,
  moveInStatus: MoveInStatusSchema,
  commissionStatus: CommissionStatusSchema,

  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  nextFollowUpAt: z.string().optional(),
  lastContactAt: z.string().optional(),
  firstContactAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  notes: z.string().optional(),
  // Archival and Test Record flags
  isTestRecord: z.boolean().optional(),
  archivalStatus: z.enum(['Active', 'Flagged For Archival', 'Archived']).optional(),
  archivalTag: z.string().optional(),
  archivalReason: z.string().optional(),
  flaggedAt: z.string().optional(),
  flaggedBy: z.string().optional(),
});
export type Student = z.infer<typeof StudentSchema>;

export const SupportedCurrencies = ['INR', 'GBP', 'EUR', 'AUD', 'USD'] as const;
export type SupportedCurrency = (typeof SupportedCurrencies)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  GBP: '£',
  EUR: '€',
  AUD: 'A$',
  USD: '$',
};

// ==========================================
// PAYMENT PROOF ATTACHMENT SCHEMA
// ==========================================
export const PaymentProofAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  filePath: z.string(),
  fileType: z.string(), // e.g. 'image/png', 'application/pdf'
  fileSize: z.number(), // in bytes
  fileUrl: z.string(),
  uploadedBy: z.string(),
  uploadedTimestamp: z.string(),
});
export type PaymentProofAttachment = z.infer<typeof PaymentProofAttachmentSchema>;

// ==========================================
// PAYMENT SCHEMA (1 Booking -> Many Payments)
// ==========================================
export const PaymentSchema = z.object({
  id: z.string(),
  paymentId: z.string(), // e.g. PAY-2026-0041
  studentId: z.string(),
  studentName: z.string().optional(),
  bookingId: z.string().optional().default(''),
  bookingReference: z.string().optional(),
  amount: z.number(),
  currency: z.enum(['INR', 'GBP', 'EUR', 'AUD', 'USD', 'inr', 'gbp', 'eur', 'aud', 'usd']).default('GBP'),
  paymentDate: z.string(),
  paymentMethod: z.enum(['Bank Transfer', 'Credit Card', 'Online Gateway', 'Direct Debit', 'UPI']),
  paymentStatus: z.enum(['Pending Verification', 'Verified', 'Rejected']),
  screenshotUrl: z.string().optional().default(''),
  attachments: z.array(PaymentProofAttachmentSchema).default([]),
  proofBypassReason: z.string().optional(),
  proofBypassedBy: z.string().optional(),
  uploadedBy: z.string(),
  uploadedRole: z.string().optional(),
  uploadedTimestamp: z.string(),
  verifiedBy: z.string().optional(),
  verificationTimestamp: z.string().optional(),
  remarks: z.string().optional(),
  partnerId: z.string().optional(),
  // Archival and Test Record flags
  isTestRecord: z.boolean().optional(),
  archivalStatus: z.enum(['Active', 'Flagged For Archival', 'Archived']).optional(),
  archivalTag: z.string().optional(),
  archivalReason: z.string().optional(),
  flaggedAt: z.string().optional(),
  flaggedBy: z.string().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// ==========================================
// PARTNER SCHEMA (B2B)
// ==========================================
export const AgreementStatusSchema = z.enum([
  'Signed',
  'Active',
  'Pending Review',
  'Under Review',
  'Pending Signature',
  'Draft',
  'Expired',
  'Terminated',
]);
export type AgreementStatus = z.infer<typeof AgreementStatusSchema>;

export const PartnerSchema = z.object({
  id: z.string(),
  partnerId: z.string().regex(/^PART-\d{5}$/), // e.g. PART-00482
  companyName: z.string(),
  type: PartnerTypeSchema,
  contactPerson: z.string(),
  email: z.string().email(),
  phone: z.string(),
  website: z.string().optional(),
  city: z.string().default('Mumbai'),
  state: z.string().default('Maharashtra'),
  country: z.string().default('India'),
  countries: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  portfolioOwnerId: z.string(),
  portfolioOwnerName: z.string(),
  assignedManagerId: z.string().optional().default(''),
  assignedManagerName: z.string().optional().default(''),
  agreementStatus: AgreementStatusSchema.default('Active'),
  agreementType: z.string().default('Master Services Agreement (MSA)'),
  agreementSignedDate: z.string().optional(),
  agreementExpiryDate: z.string().optional(),
  agreementTerms: z.string().optional().default('20% Net Revenue Commission, 30-day payout window'),
  agreementDocumentUrl: z.string().optional(),
  status: z.enum(['Active', 'Prospect', 'Contacted', 'Negotiation', 'Onboarding', 'Dormant']).default('Active'),
  onboardingDate: z.string(),
  commissionRate: z.number().default(20), // % of HearthAway revenue
  // Archival and Test Record flags
  isTestRecord: z.boolean().optional(),
  archivalStatus: z.enum(['Active', 'Flagged For Archival', 'Archived']).optional(),
  archivalTag: z.string().optional(),
  archivalReason: z.string().optional(),
  flaggedAt: z.string().optional(),
  flaggedBy: z.string().optional(),
});
export type Partner = z.infer<typeof PartnerSchema>;

// ==========================================
// AUDIT ACTIVITY SCHEMA
// ==========================================
export const ActivitySchema = z.object({
  id: z.string(),
  activityId: z.string(),
  studentId: z.string(),
  leadId: z.string().optional(),
  bookingId: z.string().optional(),
  timestamp: z.string(),
  performedBy: z.object({
    userId: z.string(),
    name: z.string(),
    role: z.string(),
  }),
  activityType: z.string(), // e.g. 'Status Change', 'Payment Upload', 'Property Shared', 'Call Logged'
  description: z.string(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
  attachment: z.string().optional(),
});
export type Activity = z.infer<typeof ActivitySchema>;

// ==========================================
// PROPERTY BOOKING SCHEMA
// ==========================================
export const RentFrequencySchema = z.enum(['weekly', 'monthly', 'yearly', 'entire contract']);
export type RentFrequency = z.infer<typeof RentFrequencySchema>;

export const PropertyBookingStatusSchema = z.enum(['Pending Confirmation', 'Confirmed', 'Cancelled']);
export type PropertyBookingStatus = z.infer<typeof PropertyBookingStatusSchema>;

export const BookingSchema = z.object({
  id: z.string(),
  bookingId: z.string(), // BK-2026-0034
  bookingReference: z.string().optional().default(''),
  studentId: z.string(),
  studentName: z.string(),
  partnerId: z.string().optional().default(''),
  partnerName: z.string().optional().default(''),
  
  // Property details
  propertyName: z.string(),
  propertyAddress: z.string(),
  rentAmount: z.number(),
  rentFrequency: RentFrequencySchema.default('monthly'),
  rentCurrency: z.string().default('GBP'),
  depositAmount: z.number().default(0),
  depositCurrency: z.string().default('GBP'),
  tenancyStartDate: z.string(),
  tenancyEndDate: z.string(),
  bookingStatus: z.string().default('Pending Confirmation'),
  notes: z.string().optional().default(''),

  // Expected Revenue & Commission
  commissionRate: z.number(), // agreed %
  commissionableAmount: z.number(),
  commissionableCurrency: z.string().default('GBP'),
  expectedRevenue: z.number(), // commissionableAmount * commissionRate / 100

  // Audit and Creator metadata
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional(),

  // Compatibility fields for existing finance ledger calculations
  propertyId: z.string().optional().default(''),
  roomType: z.string().optional().default('Standard Room'),
  assignedEmployeeId: z.string().optional().default(''),
  assignedEmployeeName: z.string().optional().default(''),
  bookingValue: z.number().optional().default(0),
  currency: z.string().optional().default('GBP'),
  bookingDate: z.string().optional().default(''),
  moveInDate: z.string().optional().default(''),
  moveOutDate: z.string().optional().default(''),
  totalPaid: z.number().optional().default(0),
  providerCommissionPercent: z.number().optional().default(15),
  providerCommissionExpected: z.number().optional().default(0),
  partnerPayoutPercent: z.number().optional().default(20),
  partnerPayoutAmount: z.number().optional().default(0),
  // Archival and Test Record flags
  isTestRecord: z.boolean().optional(),
  archivalStatus: z.enum(['Active', 'Flagged For Archival', 'Archived']).optional(),
  archivalTag: z.string().optional(),
  archivalReason: z.string().optional(),
  flaggedAt: z.string().optional(),
  flaggedBy: z.string().optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

// ==========================================
// USER & CURRENT CONTEXT
// ==========================================
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  partnerId?: string; // set if role is 'partner'
  partnerName?: string;
  avatarUrl?: string;
}
