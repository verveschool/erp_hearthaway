'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student,
  Partner,
  Booking,
  Payment,
  PaymentProofAttachment,
  RentFrequency,
  Activity,
  AppUser,
  UserRole,
  LeadStatus,
  AccommodationStatus,
  BookingStatus,
  MoveInStatus,
  CommissionStatus,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_STUDENTS,
  INITIAL_PARTNERS,
  INITIAL_BOOKINGS,
  INITIAL_PAYMENTS,
  INITIAL_ACTIVITIES,
} from './mock-data';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface AccessCheckResult {
  allowed: boolean;
  requiredRoles: UserRole[];
  reason?: 'unauthenticated' | 'insufficient_role';
}

interface HearthAwayContextType {
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  availableUsers: AppUser[];

  // Authentication & Access Control
  isAuthenticated: boolean;
  loginWithUser: (user: AppUser) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  authModalTab: 'signin' | 'signup' | 'manage';
  setAuthModalTab: (tab: 'signin' | 'signup' | 'manage') => void;
  openAuthModal: (tab?: 'signin' | 'signup' | 'manage') => void;
  createAccount: (data: {
    displayName: string;
    email: string;
    role: UserRole;
    partnerName?: string;
    phone?: string;
    university?: string;
  }) => AppUser;
  updateCurrentUserProfile: (updates: Partial<AppUser>) => void;
  canAccessRoute: (pathname?: string | null) => AccessCheckResult;

  // Master Entities
  students: Student[];
  partners: Partner[];
  bookings: Booking[];
  payments: Payment[];
  activities: Activity[];

  // Workflows & Mutations with Audit Logs
  reassignPartnerPortfolioOwner: (partnerId: string, newOwnerId: string, newOwnerName: string) => void;
  reassignLeadSalesOwner: (studentId: string, newSalesOwnerId: string, newSalesOwnerName: string) => void;
  bulkImportPartnerLeads: (
    leads: Array<any>,
    explicitPartnerId?: string,
    explicitPartnerName?: string
  ) => { importedCount: number; duplicatesCount: number; errorsCount: number; importedLeads: Student[] };
  onboardNewPartner: (partnerData: any) => Partner;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => void;
  submitPartnerLead: (lead: {
    fullName: string;
    phone: string;
    email: string;
    university: string;
    destinationCountry: string;
    destinationCity: string;
    intake: string;
    moveInDate: string;
    budget: number;
    currency?: string;
    preferredRoom?: string;
    accommodationPreference?: string;
    notes?: string;
  }) => Student;

  updateStudentDecoupledStatus: (
    studentId: string,
    updates: {
      leadStatus?: LeadStatus;
      accommodationStatus?: AccommodationStatus;
      bookingStatus?: BookingStatus;
      moveInStatus?: MoveInStatus;
      commissionStatus?: CommissionStatus;
      priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
      nextFollowUpAt?: string;
      notes?: string;
    }
  ) => void;

  recordPropertyBooking: (bookingData: {
    studentId: string;
    propertyName: string;
    propertyAddress: string;
    rentAmount: number;
    rentFrequency: RentFrequency;
    rentCurrency: string;
    depositAmount: number;
    depositCurrency: string;
    tenancyStartDate: string;
    tenancyEndDate: string;
    bookingStatus: 'Pending Confirmation' | 'Confirmed' | 'Cancelled';
    bookingReference?: string;
    notes?: string;
    commissionRate: number;
    commissionableAmount: number;
    commissionableCurrency: string;
  }) => Promise<Booking>;

  updatePropertyBooking: (
    bookingId: string,
    updates: Partial<Booking>
  ) => Promise<void>;

  uploadPaymentTransaction: (data: {
    studentId: string;
    bookingId?: string;
    bookingReference?: string;
    amount: number;
    currency: string;
    paymentMethod: 'Bank Transfer' | 'Credit Card' | 'Online Gateway' | 'Direct Debit' | 'UPI';
    attachments?: PaymentProofAttachment[];
    proofBypassReason?: string;
    remarks?: string;
    screenshotUrl?: string;
  }) => Promise<Payment>;

  verifyPaymentTransaction: (
    paymentId: string,
    decision: 'Verified' | 'Rejected',
    remarks?: string
  ) => Promise<void>;

  logStudentActivity: (
    studentId: string,
    activityType: string,
    description: string,
    oldValue?: string,
    newValue?: string
  ) => void;

  // Selected student for drawer
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;

  // Archival & Production Readiness
  hideTestRecords: boolean;
  setHideTestRecords: (hide: boolean) => void;
  flagRecordForArchival: (
    type: 'student' | 'payment' | 'booking' | 'partner',
    id: string,
    tag?: string,
    reason?: string
  ) => Promise<void>;
  unflagRecordForArchival: (
    type: 'student' | 'payment' | 'booking' | 'partner',
    id: string
  ) => Promise<void>;
  flagAllTestRecords: () => Promise<void>;
}

const DEFAULT_EMPTY_USER: AppUser = {
  uid: '',
  email: '',
  displayName: '',
  role: 'portfolio_owner',
};

const HearthAwayContext = createContext<HearthAwayContextType | undefined>(undefined);

export function HearthAwayProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser>(DEFAULT_EMPTY_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'manage'>('signin');
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>(INITIAL_USERS);

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [hideTestRecords, setHideTestRecords] = useState<boolean>(false);

  // Restore authenticated session from localStorage if present
  useEffect(() => {
    try {
      const savedProfile = typeof window !== 'undefined' ? localStorage.getItem('hearthaway_current_user_profile') : null;
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed && parsed.uid) {
            queueMicrotask(() => {
              setCurrentUser(parsed);
              setIsAuthenticated(true);
            });
          }
        } catch {}
      }

      const savedUid = typeof window !== 'undefined' ? localStorage.getItem('hearthaway_auth_uid') : null;
      if (savedUid && availableUsers.length > 0) {
        const found = availableUsers.find((u) => u.uid === savedUid);
        if (found) {
          queueMicrotask(() => {
            setCurrentUser(found);
            setIsAuthenticated(true);
          });
        }
      }
    } catch {}
  }, [availableUsers]);

  // Hydrate from persistent store & local backup on mount
  useEffect(() => {
    let isMounted = true;
    async function loadStore() {
      // 1. Instant hydration from client local storage if available
      try {
        const localStudents = localStorage.getItem('hearthaway_backup_students');
        if (localStudents && isMounted) {
          const parsed = JSON.parse(localStudents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            queueMicrotask(() => setStudents(parsed));
          }
        }
        const localPartners = localStorage.getItem('hearthaway_backup_partners');
        if (localPartners && isMounted) {
          const parsed = JSON.parse(localPartners);
          if (Array.isArray(parsed) && parsed.length > 0) {
            queueMicrotask(() => setPartners(parsed));
          }
        }
        const localUsers = localStorage.getItem('hearthaway_backup_users');
        if (localUsers && isMounted) {
          const parsed = JSON.parse(localUsers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            queueMicrotask(() => setAvailableUsers(parsed));
          }
        }
      } catch {}

      // 2. Fetch authoritative data from server API store
      try {
        const res = await fetch('/api/store');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data.bookings) && data.bookings.length > 0) {
              setBookings(data.bookings);
            }
            if (Array.isArray(data.payments) && data.payments.length > 0) {
              setPayments(data.payments);
            }
            if (Array.isArray(data.activities) && data.activities.length > 0) {
              setActivities(data.activities);
            }
            if (Array.isArray(data.students) && data.students.length > 0) {
              setStudents(data.students);
              try {
                localStorage.setItem('hearthaway_backup_students', JSON.stringify(data.students));
              } catch {}
            }
            if (Array.isArray(data.partners) && data.partners.length > 0) {
              setPartners(data.partners);
              try {
                localStorage.setItem('hearthaway_backup_partners', JSON.stringify(data.partners));
              } catch {}
            }
            if (Array.isArray(data.users) && data.users.length > 0) {
              setAvailableUsers(data.users);
              try {
                localStorage.setItem('hearthaway_backup_users', JSON.stringify(data.users));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('Could not load persistent store:', err);
      }
    }
    loadStore();
    return () => {
      isMounted = false;
    };
  }, []);

  const openAuthModal = (tab: 'signin' | 'signup' | 'manage' = 'signin') => {
    setAuthModalTab(tab);
    setIsLoginModalOpen(true);
  };

  const createAccount = (data: {
    displayName: string;
    email: string;
    role: UserRole;
    partnerName?: string;
    phone?: string;
    university?: string;
    avatarUrl?: string;
  }): AppUser => {
    const isPartner = data.role === 'partner';
    const partnerId = isPartner ? `PART-${Math.floor(10000 + Math.random() * 90000)}` : undefined;
    
    const newUser: AppUser = {
      uid: `user-${Date.now()}`,
      email: data.email.toLowerCase().trim(),
      displayName: data.displayName,
      role: data.role,
      partnerId,
      partnerName: isPartner ? (data.partnerName || 'Independent Partner') : undefined,
      avatarUrl: data.avatarUrl || undefined, // Clean initials badge by default until custom photo upload
    };

    setAvailableUsers((prev) => {
      const filtered = prev.filter((u) => u.email.toLowerCase() !== newUser.email);
      const updated = [newUser, ...filtered];
      try {
        localStorage.setItem('hearthaway_backup_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('hearthaway_auth_uid', newUser.uid);
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(newUser));
    } catch (e) {}

    // Persist new user in store
    fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_user', payload: newUser }),
    }).catch((err) => console.warn('Could not persist user to store:', err));

    setIsLoginModalOpen(false);
    return newUser;
  };

  const updateCurrentUserProfile = (updates: Partial<AppUser>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      setAvailableUsers((list) => {
        const index = list.findIndex((u) => u.uid === updated.uid);
        let next: AppUser[];
        if (index >= 0) {
          next = [...list];
          next[index] = updated;
        } else {
          next = [...list, updated];
        }
        try {
          localStorage.setItem('hearthaway_backup_users', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Persist to store API
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_user', payload: updated }),
      }).catch((err) => console.warn('Could not persist user update to store:', err));

      try {
        localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(updated));
        if (updated.uid) {
          localStorage.setItem('hearthaway_auth_uid', updated.uid);
        }
      } catch (e) {}

      return updated;
    });
  };

  // Login handler
  const loginWithUser = (user: AppUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('hearthaway_auth_uid', user.uid);
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(user));
    } catch (e) {}
    setIsLoginModalOpen(false);
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userEmail = (user.email || '').toLowerCase();
      
      const matched = availableUsers.find(
        (u) => u.email.toLowerCase() === userEmail
      );

      if (matched) {
        loginWithUser(matched);
      } else {
        const isSuperAdmin = userEmail === 'tribeverve@gmail.com';
        const newAppUser: AppUser = {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || 'Authenticated User',
          role: isSuperAdmin ? 'management' : 'portfolio_owner',
          avatarUrl: user.photoURL || undefined,
        };
        createAccount(newAppUser);
        loginWithUser(newAppUser);
      }
    } catch (err) {
      console.warn('Google sign-in completed or cancelled:', err);
    }
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    try {
      localStorage.removeItem('hearthaway_auth_uid');
      localStorage.removeItem('hearthaway_current_user_profile');
    } catch (e) {}
    setCurrentUser(DEFAULT_EMPTY_USER);
    setIsAuthenticated(false);
  };

  // Route-level permission evaluator
  const canAccessRoute = (pathname?: string | null): AccessCheckResult => {
    const path = pathname || '/';
    // Public routes: / and /sign-up
    if (path === '/' || path === '' || path === '/sign-up') {
      return { allowed: true, requiredRoles: [] };
    }

    if (!isAuthenticated || !currentUser?.uid) {
      return { allowed: false, requiredRoles: [], reason: 'unauthenticated' };
    }

    const role = currentUser.role;

    // Management & Admin have full management access across all modules
    if (role === 'admin' || role === 'management') {
      return { allowed: true, requiredRoles: [] };
    }

    // Module 1: Portfolio (management, admin, portfolio_owner)
    if (path.startsWith('/portfolio') || path.startsWith('/internal/management')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'portfolio_owner'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    // Module 2: Partners (management, admin, partner)
    if (path.startsWith('/partners') || path.startsWith('/partner')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'partner'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    // Module 3: Sales (management, admin, sales)
    if (path.startsWith('/sales') || path.startsWith('/internal/sales')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'sales'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    // Module 4: Finance (management, admin, finance)
    if (path.startsWith('/finance') || path.startsWith('/internal/finance')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'finance'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    return { allowed: true, requiredRoles: [] };
  };

  // Helper to append real-time audit log
  const logStudentActivity = (
    studentId: string,
    activityType: string,
    description: string,
    oldValue?: string,
    newValue?: string
  ) => {
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      activityId: `ACT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId,
      timestamp: formattedTimestamp,
      performedBy: {
        userId: currentUser.uid,
        name: currentUser.displayName,
        role: currentUser.role,
      },
      activityType,
      description,
      oldValue,
      newValue,
    };

    setActivities((prev) => [newActivity, ...prev]);
  };

  // Reassign a Partner's Portfolio Owner (Relational update automatically rolls up across all that partner's leads!)
  const reassignPartnerPortfolioOwner = (partnerId: string, newOwnerId: string, newOwnerName: string) => {
    setPartners((prev) => {
      const updated = prev.map((p) => {
        if (p.partnerId === partnerId || p.id === partnerId) {
          return {
            ...p,
            portfolioOwnerId: newOwnerId,
            portfolioOwnerName: newOwnerName,
            assignedManagerId: newOwnerId,
            assignedManagerName: newOwnerName,
          };
        }
        return p;
      });

      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { partners: updated } }),
      }).catch((err) => console.error('Failed to persist partner reassignment:', err));

      try {
        localStorage.setItem('hearthaway_backup_partners', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  };

  // Reassign Sales Owner on a lead (independent of partner & portfolio owner)
  const reassignLeadSalesOwner = (studentId: string, newSalesOwnerId: string, newSalesOwnerName: string) => {
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.studentId === studentId || s.id === studentId) {
          logStudentActivity(
            s.studentId,
            'Sales Owner Reassigned',
            `Sales owner changed from ${s.assignedSalesExecutiveName} to ${newSalesOwnerName}`
          );
          return {
            ...s,
            assignedSalesExecutiveId: newSalesOwnerId,
            assignedSalesExecutiveName: newSalesOwnerName,
            updatedAt: new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return s;
      });

      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { students: updated } }),
      }).catch((err) => console.error('Failed to persist sales owner reassignment:', err));

      try {
        localStorage.setItem('hearthaway_backup_students', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  };

  // Onboard New Partner with required Portfolio Owner, City, State and Agreement
  const onboardNewPartner = (partnerData: any): Partner => {
    const newPartner: Partner = {
      id: `part-${partnerData.partnerId.toLowerCase()}`,
      city: partnerData.city || 'Mumbai',
      state: partnerData.state || 'Maharashtra',
      country: partnerData.country || 'India',
      agreementStatus: partnerData.agreementStatus || 'Active',
      agreementType: partnerData.agreementType || 'Master Services Agreement (MSA)',
      agreementTerms: partnerData.agreementTerms || '20% Net Revenue Commission, 30-day payout window',
      agreementSignedDate: partnerData.agreementSignedDate || new Date().toISOString().split('T')[0],
      agreementExpiryDate: partnerData.agreementExpiryDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      agreementDocumentUrl: partnerData.agreementDocumentUrl || '',
      ...partnerData,
    };

    setPartners((prev) => {
      const updated = [newPartner, ...prev];
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { partners: updated } }),
      }).catch((err) => console.error('Failed to persist partner:', err));

      try {
        localStorage.setItem('hearthaway_backup_partners', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    return newPartner;
  };

  // Update Partner (including Agreement Details, City, State, Status)
  const updatePartner = (partnerId: string, updates: Partial<Partner>) => {
    setPartners((prev) => {
      const updated = prev.map((p) => {
        if (p.partnerId === partnerId || p.id === partnerId) {
          return { ...p, ...updates };
        }
        return p;
      });

      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { partners: updated } }),
      }).catch((err) => console.error('Failed to persist partner update:', err));

      try {
        localStorage.setItem('hearthaway_backup_partners', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  };

  // CSV Bulk Lead Import
  const bulkImportPartnerLeads = (
    incomingLeads: Array<any>,
    explicitPartnerId?: string,
    explicitPartnerName?: string
  ) => {
    const partnerId =
      explicitPartnerId ||
      (currentUser.role === 'partner' && currentUser.partnerId ? currentUser.partnerId : 'PART-00482');
    const matchedPartner = partners.find((p) => p.partnerId === partnerId);
    const partnerName =
      explicitPartnerName ||
      matchedPartner?.companyName ||
      currentUser.partnerName ||
      'Education Partner';

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRecords: Student[] = [];
    let duplicatesCount = 0;
    let errorsCount = 0;

    const existingEmails = new Set(students.map((s) => s.email.toLowerCase().trim()));
    const existingPhones = new Set(students.map((s) => s.phone.replace(/\D/g, '')));

    incomingLeads.forEach((lead, index) => {
      const cleanEmail = (lead.email || '').toLowerCase().trim();
      const cleanPhone = (lead.phone || '').replace(/\D/g, '');

      // Validation check
      if (!lead.fullName || !cleanEmail || !lead.university) {
        errorsCount++;
        return;
      }

      // Duplicate check
      if (existingEmails.has(cleanEmail) || (cleanPhone && existingPhones.has(cleanPhone))) {
        duplicatesCount++;
        return;
      }

      existingEmails.add(cleanEmail);
      if (cleanPhone) existingPhones.add(cleanPhone);

      const year = new Date().getFullYear();
      const randomSeq = String(Math.floor(100000 + Math.random() * 900000));
      const generatedId = `HA-${year}-${randomSeq}`;
      const [firstName, ...rest] = lead.fullName.trim().split(' ');
      const lastName = rest.join(' ') || 'Lead';

      const salesReps = availableUsers.filter((u) => u.role === 'sales');
      const assignedRep =
        salesReps.length > 0
          ? salesReps[index % salesReps.length]
          : { uid: 'user-emp-001', displayName: 'Harshul Mehta' };

      const record: Student = {
        id: `std-${generatedId.toLowerCase()}`,
        studentId: generatedId,
        firstName,
        lastName,
        fullName: lead.fullName.trim(),
        email: cleanEmail,
        phone: lead.phone || '+44 7700 900000',
        whatsApp: lead.phone || '+44 7700 900000',
        nationality: lead.nationality || 'International',
        currentCountry: lead.currentCountry || 'International',
        university: lead.university.trim(),
        course: lead.course || 'Degree Program',
        intake: lead.intake || 'Sep 2026',
        destinationCountry: lead.destinationCountry || 'United Kingdom',
        destinationCity: lead.destinationCity || 'London',
        moveInDate: lead.moveInDate || '2026-09-15',
        moveOutDate: '2027-08-31',
        budget: Number(lead.budget) || 350,
        currency: lead.currency || 'GBP',
        preferredRoom: lead.preferredRoom || 'En-suite',
        accommodationPreference: lead.accommodationPreference || 'Bills included, walking distance',
        occupants: 1,
        passportStatus: 'Pending Verification',
        leadSource: 'Study Abroad Consultants',
        partnerId,
        partnerName,
        assignedSalesExecutiveId: assignedRep.uid,
        assignedSalesExecutiveName: assignedRep.displayName,
        leadStatus: 'New',
        accommodationStatus: 'Requirement Pending',
        bookingStatus: 'Not Started',
        moveInStatus: 'Upcoming',
        commissionStatus: 'Pending',
        priority: 'Medium',
        nextFollowUpAt: 'Within 2 hours',
        lastContactAt: 'Never',
        createdAt: formattedTimestamp,
        updatedAt: formattedTimestamp,
        notes: lead.notes || 'Imported via CSV Bulk Upload.',
        // Production Record Identification
        isTestRecord: false,
        archivalStatus: 'Active',
      };

      newRecords.push(record);
    });

    if (newRecords.length > 0) {
      setStudents((prev) => {
        const updated = [...newRecords, ...prev];
        fetch('/api/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync_all', payload: { students: updated } }),
        }).catch((err) => console.error('Failed to persist imported leads:', err));

        try {
          localStorage.setItem('hearthaway_backup_students', JSON.stringify(updated));
        } catch (e) {}

        return updated;
      });
    }

    return {
      importedCount: newRecords.length,
      duplicatesCount,
      errorsCount,
      importedLeads: newRecords,
    };
  };

  // Partner Lead Submission Form Action
  const submitPartnerLead = (lead: {
    fullName: string;
    phone: string;
    email: string;
    university: string;
    destinationCountry: string;
    destinationCity: string;
    intake: string;
    moveInDate: string;
    budget: number;
    currency?: string;
    preferredRoom?: string;
    accommodationPreference?: string;
    notes?: string;
  }): Student => {
    const year = new Date().getFullYear();
    const randomSeq = String(Math.floor(100000 + Math.random() * 900000));
    const generatedId = `HA-${year}-${randomSeq}`;
    const [firstName, ...rest] = lead.fullName.split(' ');
    const lastName = rest.join(' ') || 'Student';

    const partnerId = currentUser.role === 'partner' && currentUser.partnerId ? currentUser.partnerId : 'PART-00482';
    const partnerName = currentUser.partnerName || 'Global Edu Pathways';

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newStudent: Student = {
      id: `std-${generatedId.toLowerCase()}`,
      studentId: generatedId,
      firstName,
      lastName,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      whatsApp: lead.phone,
      nationality: 'India',
      currentCountry: 'India',
      university: lead.university,
      course: 'Higher Education Program',
      intake: lead.intake || 'Sep 2026',
      destinationCountry: lead.destinationCountry,
      destinationCity: lead.destinationCity,
      moveInDate: lead.moveInDate,
      moveOutDate: '2027-08-31',
      budget: lead.budget,
      currency: lead.currency || 'GBP',
      preferredRoom: lead.preferredRoom || 'En-suite',
      accommodationPreference: lead.accommodationPreference || 'Standard PBSA, bills included',
      occupants: 1,
      passportStatus: 'Pending Verification',
      leadSource: 'Study Abroad Consultants',
      partnerId,
      partnerName,
      assignedSalesExecutiveId: 'EMP-001',
      assignedSalesExecutiveName: 'Harshul Mehta',

      leadStatus: 'New',
      accommodationStatus: 'Requirement Pending',
      bookingStatus: 'Not Started',
      moveInStatus: 'Upcoming',
      commissionStatus: 'Pending',

      priority: 'High',
      nextFollowUpAt: 'Within 2 hours (SLA)',
      lastContactAt: 'Never',
      firstContactAt: undefined,
      createdAt: formattedTimestamp,
      updatedAt: formattedTimestamp,
      notes: lead.notes || 'Submitted via Partners module.',
    };

    setStudents((prev) => {
      const updated = [newStudent, ...prev];
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { students: updated } }),
      }).catch((err) => console.error('Failed to persist lead:', err));
      return updated;
    });

    logStudentActivity(
      generatedId,
      'Lead Submitted',
      `Lead ${generatedId} submitted by partner ${partnerName} (${partnerId}). Assigned to internal workflow pool.`,
      undefined,
      'New'
    );

    return newStudent;
  };

  // Decoupled Status Updates
  const updateStudentDecoupledStatus = (
    studentId: string,
    updates: {
      leadStatus?: LeadStatus;
      accommodationStatus?: AccommodationStatus;
      bookingStatus?: BookingStatus;
      moveInStatus?: MoveInStatus;
      commissionStatus?: CommissionStatus;
      priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
      nextFollowUpAt?: string;
      notes?: string;
    }
  ) => {
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.studentId !== studentId && s.id !== studentId) return s;

        const now = new Date();
        const updatedTime = now.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        if (updates.leadStatus && updates.leadStatus !== s.leadStatus) {
          logStudentActivity(
            s.studentId,
            'Lead Stage Change',
            `Changed Lead Status from "${s.leadStatus}" to "${updates.leadStatus}"`,
            s.leadStatus,
            updates.leadStatus
          );
        }
        if (updates.accommodationStatus && updates.accommodationStatus !== s.accommodationStatus) {
          logStudentActivity(
            s.studentId,
            'Accommodation Status Change',
            `Changed Accommodation Status from "${s.accommodationStatus}" to "${updates.accommodationStatus}"`,
            s.accommodationStatus,
            updates.accommodationStatus
          );
        }
        if (updates.bookingStatus && updates.bookingStatus !== s.bookingStatus) {
          logStudentActivity(
            s.studentId,
            'Booking Status Change',
            `Changed Booking Status from "${s.bookingStatus}" to "${updates.bookingStatus}"`,
            s.bookingStatus,
            updates.bookingStatus
          );
        }
        if (updates.moveInStatus && updates.moveInStatus !== s.moveInStatus) {
          logStudentActivity(
            s.studentId,
            'Move-in Status Change',
            `Changed Move-in Status from "${s.moveInStatus}" to "${updates.moveInStatus}"`,
            s.moveInStatus,
            updates.moveInStatus
          );
        }
        if (updates.commissionStatus && updates.commissionStatus !== s.commissionStatus) {
          logStudentActivity(
            s.studentId,
            'Commission Status Change',
            `Changed Commission Status from "${s.commissionStatus}" to "${updates.commissionStatus}"`,
            s.commissionStatus,
            updates.commissionStatus
          );
        }

        return {
          ...s,
          ...updates,
          updatedAt: updatedTime,
        };
      });

      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { students: updated } }),
      }).catch((err) => console.error('Failed to persist student status updates:', err));

      try {
        localStorage.setItem('hearthaway_backup_students', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  };

  // Record Property Booking (Student 1 -> Many Property Bookings)
  const recordPropertyBooking = async (bookingData: {
    studentId: string;
    propertyName: string;
    propertyAddress: string;
    rentAmount: number;
    rentFrequency: RentFrequency;
    rentCurrency: string;
    depositAmount: number;
    depositCurrency: string;
    tenancyStartDate: string;
    tenancyEndDate: string;
    bookingStatus: 'Pending Confirmation' | 'Confirmed' | 'Cancelled';
    bookingReference?: string;
    notes?: string;
    commissionRate: number;
    commissionableAmount: number;
    commissionableCurrency: string;
  }): Promise<Booking> => {
    const student = students.find((s) => s.studentId === bookingData.studentId || s.id === bookingData.studentId);
    const bookingSeq = String(Math.floor(1000 + Math.random() * 9000));
    const bookingId = `BK-2026-${bookingSeq}`;

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const expectedRevenue = Number(
      ((bookingData.commissionableAmount * bookingData.commissionRate) / 100).toFixed(2)
    );

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingId,
      bookingReference: bookingData.bookingReference || `REF-${bookingSeq}`,
      studentId: bookingData.studentId,
      studentName: student?.fullName || 'Student',
      partnerId: student?.partnerId || '',
      partnerName: student?.partnerName || '',
      propertyName: bookingData.propertyName,
      propertyAddress: bookingData.propertyAddress,
      rentAmount: bookingData.rentAmount,
      rentFrequency: bookingData.rentFrequency,
      rentCurrency: bookingData.rentCurrency,
      depositAmount: bookingData.depositAmount,
      depositCurrency: bookingData.depositCurrency,
      tenancyStartDate: bookingData.tenancyStartDate,
      tenancyEndDate: bookingData.tenancyEndDate,
      bookingStatus: bookingData.bookingStatus,
      notes: bookingData.notes || '',
      commissionRate: bookingData.commissionRate,
      commissionableAmount: bookingData.commissionableAmount,
      commissionableCurrency: bookingData.commissionableCurrency,
      expectedRevenue,
      createdBy: `${currentUser.displayName} (${currentUser.role})`,
      createdAt: formattedTimestamp,
      propertyId: '',
      roomType: 'Standard Room',
      assignedEmployeeId: student?.assignedSalesExecutiveId || '',
      assignedEmployeeName: student?.assignedSalesExecutiveName || '',
      bookingValue: bookingData.commissionableAmount,
      currency: bookingData.rentCurrency,
      bookingDate: now.toISOString().split('T')[0],
      moveInDate: bookingData.tenancyStartDate,
      moveOutDate: bookingData.tenancyEndDate,
      providerCommissionPercent: bookingData.commissionRate,
      providerCommissionExpected: expectedRevenue,
      partnerPayoutPercent: 20,
      partnerPayoutAmount: Number((expectedRevenue * 0.2).toFixed(2)),
      totalPaid: 0,
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Persist to server store
    fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_booking', payload: newBooking }),
    }).catch((err) => console.error('Failed to persist booking:', err));

    if (bookingData.bookingStatus === 'Confirmed') {
      updateStudentDecoupledStatus(bookingData.studentId, {
        bookingStatus: 'Booked',
        commissionStatus: 'Due',
      });
    } else if (bookingData.bookingStatus === 'Pending Confirmation') {
      updateStudentDecoupledStatus(bookingData.studentId, {
        bookingStatus: 'Processing',
      });
    }

    logStudentActivity(
      bookingData.studentId,
      'Property Booking Recorded',
      `Property booking ${bookingId} (${bookingData.propertyName}) recorded by ${currentUser.displayName}. Rent: ${bookingData.rentCurrency} ${bookingData.rentAmount} / ${bookingData.rentFrequency}, Deposit: ${bookingData.depositCurrency} ${bookingData.depositAmount}, Expected Revenue: ${bookingData.commissionableCurrency} ${expectedRevenue.toFixed(2)} (${bookingData.commissionRate}%). Status: ${bookingData.bookingStatus}.`
    );

    return newBooking;
  };

  const updatePropertyBooking = async (
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<void> => {
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let updatedTarget: Booking | null = null;

    setBookings((prev) =>
      prev.map((b) => {
        if (b.bookingId !== bookingId && b.id !== bookingId) return b;

        const commissionRate = updates.commissionRate !== undefined ? updates.commissionRate : b.commissionRate;
        const commissionableAmount = updates.commissionableAmount !== undefined ? updates.commissionableAmount : b.commissionableAmount;
        const expectedRevenue = Number(((commissionableAmount * commissionRate) / 100).toFixed(2));

        const updated: Booking = {
          ...b,
          ...updates,
          commissionRate,
          commissionableAmount,
          expectedRevenue,
          updatedBy: `${currentUser.displayName} (${currentUser.role})`,
          updatedAt: formattedTimestamp,
        };
        updatedTarget = updated;
        return updated;
      })
    );

    if (updatedTarget) {
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_booking', payload: updatedTarget }),
      }).catch((err) => console.error('Failed to persist booking update:', err));

      logStudentActivity(
        (updatedTarget as Booking).studentId,
        'Property Booking Updated',
        `Property booking ${bookingId} (${(updatedTarget as Booking).propertyName}) updated by ${currentUser.displayName}. Status: ${(updatedTarget as Booking).bookingStatus}. Expected Revenue: ${(updatedTarget as Booking).commissionableCurrency} ${(updatedTarget as Booking).expectedRevenue.toFixed(2)}.`
      );
    }
  };

  // Upload Payment Event (Booking 1 -> Many Payments) with Payment Proofs
  const uploadPaymentTransaction = async (data: {
    studentId: string;
    bookingId?: string;
    bookingReference?: string;
    amount: number;
    currency: string;
    paymentMethod: 'Bank Transfer' | 'Credit Card' | 'Online Gateway' | 'Direct Debit' | 'UPI';
    attachments?: PaymentProofAttachment[];
    proofBypassReason?: string;
    remarks?: string;
    screenshotUrl?: string;
  }): Promise<Payment> => {
    const student = students.find((s) => s.studentId === data.studentId || s.id === data.studentId);
    const bookingId = data.bookingId || `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentId = `PAY-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const primaryAttachmentUrl = data.attachments?.[0]?.fileUrl || data.screenshotUrl || '';

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      paymentId,
      studentId: data.studentId,
      studentName: student?.fullName || 'Student',
      bookingId,
      bookingReference: data.bookingReference || '',
      amount: data.amount,
      currency: (data.currency?.toUpperCase() || 'GBP') as any,
      paymentDate: now.toISOString().split('T')[0],
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Pending Verification',
      screenshotUrl: primaryAttachmentUrl,
      attachments: data.attachments || [],
      proofBypassReason: data.proofBypassReason,
      proofBypassedBy: data.proofBypassReason ? `${currentUser.displayName} (${currentUser.role})` : undefined,
      uploadedBy: currentUser.displayName,
      uploadedRole: currentUser.role,
      uploadedTimestamp: formattedTimestamp,
      remarks: data.remarks || 'Payment proof submitted for booking reservation.',
      partnerId: student?.partnerId,
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Persist to server store
    fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_payment', payload: newPayment }),
    }).catch((err) => console.error('Failed to persist payment:', err));

    updateStudentDecoupledStatus(data.studentId, {
      bookingStatus: 'Payment Pending',
    });

    if (data.proofBypassReason) {
      logStudentActivity(
        data.studentId,
        'Payment Proof Bypassed',
        `Management proof requirement bypassed for payment ${paymentId} (${data.currency} ${data.amount}) by ${currentUser.displayName} (${currentUser.role}). Recorded Exception Reason: "${data.proofBypassReason}".`
      );
    }

    logStudentActivity(
      data.studentId,
      'Payment Uploaded',
      `Payment proof ${paymentId} of ${data.currency} ${data.amount} recorded by ${currentUser.displayName} with ${data.attachments?.length || 0} file attachment(s). Status: Pending Verification.`
    );

    return newPayment;
  };

  // Verify Payment by Finance/Management
  const verifyPaymentTransaction = async (
    paymentId: string,
    decision: 'Verified' | 'Rejected',
    remarks?: string
  ): Promise<void> => {
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let updatedPmt: Payment | null = null;

    setPayments((prev) =>
      prev.map((p) => {
        if (p.paymentId !== paymentId && p.id !== paymentId) return p;

        logStudentActivity(
          p.studentId,
          decision === 'Verified' ? 'Payment Verified' : 'Payment Rejected',
          `Payment ${p.paymentId} (${p.currency} ${p.amount}) was ${decision.toLowerCase()} by ${currentUser.displayName} (${currentUser.role}). ${remarks ? `Note: ${remarks}` : ''}`,
          p.paymentStatus,
          decision
        );

        if (decision === 'Verified') {
          updateStudentDecoupledStatus(p.studentId, {
            bookingStatus: 'Booked',
            commissionStatus: 'Due',
          });
        }

        const updated: Payment = {
          ...p,
          paymentStatus: decision,
          verifiedBy: `${currentUser.displayName} (${currentUser.role})`,
          verificationTimestamp: formattedTimestamp,
          remarks: remarks ? `${p.remarks || ''} | ${remarks}` : p.remarks,
        };
        updatedPmt = updated;
        return updated;
      })
    );

    if (updatedPmt) {
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_payment', payload: updatedPmt }),
      }).catch((err) => console.error('Failed to persist payment verification:', err));
    }
  };

  const flagRecordForArchival = async (
    type: 'student' | 'payment' | 'booking' | 'partner',
    id: string,
    tag: string = 'Manual Archival Flag',
    reason: string = 'Flagged for archival by user'
  ) => {
    const timestamp = new Date().toISOString();
    const flaggedBy = currentUser.displayName;

    if (type === 'student') {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id || s.studentId === id
            ? {
                ...s,
                isTestRecord: true,
                archivalStatus: 'Flagged For Archival',
                archivalTag: tag,
                archivalReason: reason,
                flaggedAt: timestamp,
                flaggedBy,
              }
            : s
        )
      );
    } else if (type === 'payment') {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id || p.paymentId === id
            ? {
                ...p,
                isTestRecord: true,
                archivalStatus: 'Flagged For Archival',
                archivalTag: tag,
                archivalReason: reason,
                flaggedAt: timestamp,
                flaggedBy,
              }
            : p
        )
      );
    } else if (type === 'booking') {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id || b.bookingId === id
            ? {
                ...b,
                isTestRecord: true,
                archivalStatus: 'Flagged For Archival',
                archivalTag: tag,
                archivalReason: reason,
                flaggedAt: timestamp,
                flaggedBy,
              }
            : b
        )
      );
    }

    try {
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'flag_record',
          payload: {
            type,
            id,
            isTestRecord: true,
            archivalStatus: 'Flagged For Archival',
            archivalTag: tag,
            archivalReason: reason,
            flaggedBy,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to flag record for archival:', err);
    }
  };

  const unflagRecordForArchival = async (
    type: 'student' | 'payment' | 'booking' | 'partner',
    id: string
  ) => {
    if (type === 'student') {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id || s.studentId === id
            ? {
                ...s,
                isTestRecord: false,
                archivalStatus: 'Active',
                archivalTag: undefined,
                archivalReason: undefined,
              }
            : s
        )
      );
    } else if (type === 'payment') {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id || p.paymentId === id
            ? {
                ...p,
                isTestRecord: false,
                archivalStatus: 'Active',
                archivalTag: undefined,
                archivalReason: undefined,
              }
            : p
        )
      );
    } else if (type === 'booking') {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id || b.bookingId === id
            ? {
                ...b,
                isTestRecord: false,
                archivalStatus: 'Active',
                archivalTag: undefined,
                archivalReason: undefined,
              }
            : b
        )
      );
    }

    try {
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'flag_record',
          payload: { type, id, isTestRecord: false, archivalStatus: 'Active' },
        }),
      });
    } catch (err) {
      console.error('Failed to unflag record:', err);
    }
  };

  const flagAllTestRecords = async () => {
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'flag_test_records',
          payload: { flaggedBy: currentUser.displayName },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.store) {
          if (data.store.students) setStudents(data.store.students);
          if (data.store.payments) setPayments(data.store.payments);
          if (data.store.bookings) setBookings(data.store.bookings);
        }
      }
    } catch (err) {
      console.error('Failed to flag test records:', err);
    }
  };

  return (
    <HearthAwayContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers,
        isAuthenticated,
        loginWithUser,
        loginWithGoogle,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        createAccount,
        updateCurrentUserProfile,
        canAccessRoute,
        students,
        partners,
        bookings,
        payments,
        activities,
        reassignPartnerPortfolioOwner,
        reassignLeadSalesOwner,
        bulkImportPartnerLeads,
        onboardNewPartner,
        updatePartner,
        submitPartnerLead,
        updateStudentDecoupledStatus,
        recordPropertyBooking,
        updatePropertyBooking,
        uploadPaymentTransaction,
        verifyPaymentTransaction,
        logStudentActivity,
        selectedStudentId,
        setSelectedStudentId,
        hideTestRecords,
        setHideTestRecords,
        flagRecordForArchival,
        unflagRecordForArchival,
        flagAllTestRecords,
      }}
    >
      {children}
    </HearthAwayContext.Provider>
  );
}

export function useHearthAway() {
  const context = useContext(HearthAwayContext);
  if (!context) {
    throw new Error('useHearthAway must be used within a HearthAwayProvider');
  }
  return context;
}
