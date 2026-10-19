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
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

interface AccessCheckResult {
  allowed: boolean;
  requiredRoles: UserRole[];
  reason?: 'unauthenticated' | 'insufficient_role' | 'pending_approval';
}

interface HearthAwayContextType {
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  availableUsers: AppUser[];

  // Authentication & Access Control
  isAuthenticated: boolean;
  loginWithUser: (user: AppUser) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  approveUser: (uid: string, approve?: boolean) => Promise<void>;
  removeAllAccounts: () => Promise<void>;
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
    avatarUrl?: string;
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
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);

  // Master collections start with zero existing data; synced live from Firestore
  const [students, setStudents] = useState<Student[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [hideTestRecords, setHideTestRecords] = useState<boolean>(false);

  // Real-time Firebase Firestore Sync & Auth state listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const cleanEmail = (fbUser.email || '').toLowerCase().trim();
          const isSuperAdmin = cleanEmail === 'tribeverve@gmail.com' || cleanEmail.includes('admin');
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            const profile = snap.data() as AppUser;
            profile.isApproved = true;
            profile.status = 'approved';
            if (isSuperAdmin) {
              profile.role = 'management';
            }
            setCurrentUser(profile);
            setIsAuthenticated(true);
            try {
              localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
              localStorage.setItem('hearthaway_auth_uid', profile.uid);
            } catch {}
          } else {
            const newUser: AppUser = {
              uid: fbUser.uid,
              email: cleanEmail,
              displayName: fbUser.displayName || cleanEmail.split('@')[0] || 'User',
              role: isSuperAdmin ? 'management' : 'portfolio_owner',
              avatarUrl: fbUser.photoURL || undefined,
              isApproved: true,
              status: 'approved',
            };
            await setDoc(userRef, newUser);
            setCurrentUser(newUser);
            setIsAuthenticated(true);
            try {
              localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(newUser));
              localStorage.setItem('hearthaway_auth_uid', newUser.uid);
            } catch {}
          }
        } catch (err) {
          console.warn('Error fetching Firestore user profile:', err);
        }
      } else {
        try {
          const savedProfile = typeof window !== 'undefined' ? localStorage.getItem('hearthaway_current_user_profile') : null;
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            if (parsed && parsed.uid) {
              setCurrentUser(parsed);
              setIsAuthenticated(true);
            }
          }
        } catch {}
      }
    });

    // Real-time Firestore snapshot listeners across all connected users & devices
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Student);
        setStudents(list);
      },
      (err) => {
        console.warn('Students listener status:', err.message);
      }
    );

    const unsubPartners = onSnapshot(
      collection(db, 'partners'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Partner);
        setPartners(list);
      },
      (err) => {
        console.warn('Partners listener status:', err.message);
      }
    );

    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Booking);
        setBookings(list);
      },
      (err) => {
        console.warn('Bookings listener status:', err.message);
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Payment);
        setPayments(list);
      },
      (err) => {
        console.warn('Payments listener status:', err.message);
      }
    );

    const unsubActivities = onSnapshot(
      collection(db, 'activities'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Activity);
        setActivities(list);
      },
      (err) => {
        console.warn('Activities listener status:', err.message);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => docSnap.data() as AppUser);
        setAvailableUsers(list);
      },
      (err) => {
        console.warn('Users listener status:', err.message);
      }
    );

    return () => {
      unsubAuth();
      unsubStudents();
      unsubPartners();
      unsubBookings();
      unsubPayments();
      unsubActivities();
      unsubUsers();
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
    // Use the Firebase Auth UID so Firestore ownership rules can authorize the write.
    const uid = auth.currentUser?.uid || `user-${Date.now()}`;
    const cleanEmail = data.email.toLowerCase().trim();
    const isSuperAdmin = cleanEmail === 'tribeverve@gmail.com' || data.role === 'management' || data.role === 'admin';
    const isApproved = isSuperAdmin;

    const newUser: AppUser = {
      uid,
      email: cleanEmail,
      displayName: data.displayName,
      role: data.role,
      isApproved: true,
      status: 'approved',
      ...(isPartner ? {
        partnerId,
        partnerName: data.partnerName || 'Independent Partner',
      } : {}),
      ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
    };

    setCurrentUser(newUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('hearthaway_auth_uid', newUser.uid);
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(newUser));
    } catch (e) {}

    setDoc(doc(db, 'users', uid), newUser).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    });

    setIsLoginModalOpen(false);
    return newUser;
  };

  const approveUser = async (uid: string, approve: boolean = true) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { isApproved: approve, status: approve ? 'approved' : 'pending' }, { merge: true });
      setAvailableUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, isApproved: approve, status: approve ? 'approved' : 'pending' } : u))
      );
      if (currentUser?.uid === uid) {
        const newStatus = (approve ? 'approved' : 'pending') as 'approved' | 'pending';
        const updated: AppUser = { ...currentUser, isApproved: approve, status: newStatus };
        setCurrentUser(updated);
        try {
          localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(updated));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to update user approval:', err);
    }
  };

  const removeAllAccounts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      for (const dSnap of querySnapshot.docs) {
        const uData = dSnap.data() as AppUser;
        if (uData.email !== 'tribeverve@gmail.com') {
          await deleteDoc(doc(db, 'users', dSnap.id));
        }
      }
      setAvailableUsers((prev) => prev.filter((u) => u.email === 'tribeverve@gmail.com'));
      if (currentUser?.email !== 'tribeverve@gmail.com') {
        signOut(auth);
        const adminUser: AppUser = {
          uid: 'usr-admin-default',
          email: 'tribeverve@gmail.com',
          displayName: 'Super Admin',
          role: 'management',
          isApproved: true,
          status: 'approved',
        };
        setCurrentUser(adminUser);
        setIsAuthenticated(false);
        try {
          localStorage.removeItem('hearthaway_auth_uid');
          localStorage.removeItem('hearthaway_current_user_profile');
        } catch {}
      }
    } catch (err) {
      console.error('Failed to remove accounts:', err);
    }
  };

  const updateCurrentUserProfile = (updates: Partial<AppUser>) => {
    if (!currentUser?.uid) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    try {
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(updated));
      if (updated.uid) {
        localStorage.setItem('hearthaway_auth_uid', updated.uid);
      }
    } catch (e) {}

    setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    });
  };

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
      const userEmail = (user.email || '').toLowerCase().trim();
      const userRef = doc(db, 'users', user.uid);

      let profile: AppUser;
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          profile = snap.data() as AppUser;
        } else {
          const isSuperAdmin = userEmail === 'tribeverve@gmail.com';
          profile = {
            uid: user.uid,
            email: userEmail,
            displayName: user.displayName || 'Authenticated User',
            role: isSuperAdmin ? 'management' : 'portfolio_owner',
            avatarUrl: user.photoURL || undefined,
          };
          await setDoc(userRef, profile);
        }
      } catch {
        const isSuperAdmin = userEmail === 'tribeverve@gmail.com';
        profile = {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || 'Authenticated User',
          role: isSuperAdmin ? 'management' : 'portfolio_owner',
          avatarUrl: user.photoURL || undefined,
        };
      }

      setCurrentUser(profile);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('hearthaway_auth_uid', profile.uid);
        localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
      } catch (e) {}

      setIsLoginModalOpen(false);
    } catch (err) {
      console.warn('Google sign-in error:', err);
    }
  };

  const loginWithEmailPassword = async (email: string, password?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return;

    if (password && password.length >= 6) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCredential.user;
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        let profile: AppUser;
        if (snap.exists()) {
          profile = snap.data() as AppUser;
        } else {
          const isSuperAdmin = cleanEmail === 'tribeverve@gmail.com';
          profile = {
            uid: fbUser.uid,
            email: cleanEmail,
            displayName: fbUser.displayName || cleanEmail.split('@')[0],
            role: isSuperAdmin ? 'management' : 'portfolio_owner',
          };
          await setDoc(userRef, profile);
        }
        setCurrentUser(profile);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('hearthaway_auth_uid', profile.uid);
          localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
        } catch (e) {}
        setIsLoginModalOpen(false);
        return;
      } catch (err) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;
          const userRef = doc(db, 'users', fbUser.uid);
          const isSuperAdmin = cleanEmail === 'tribeverve@gmail.com';
          const profile: AppUser = {
            uid: fbUser.uid,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0],
            role: isSuperAdmin ? 'management' : 'portfolio_owner',
          };
          await setDoc(userRef, profile);
          setCurrentUser(profile);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('hearthaway_auth_uid', profile.uid);
            localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
          } catch (e) {}
          setIsLoginModalOpen(false);
          return;
        } catch (signUpErr) {
          console.warn('Firebase email auth fallback:', signUpErr);
        }
      }
    }

    const match = availableUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (match) {
      loginWithUser(match);
    } else {
      const newUser = createAccount({
        displayName: cleanEmail.split('@')[0] || 'Operations Specialist',
        email: cleanEmail,
        role: cleanEmail === 'tribeverve@gmail.com' ? 'management' : 'portfolio_owner',
      });
      loginWithUser(newUser);
    }
    setIsLoginModalOpen(false);
  };

  const resetPassword = async (email: string): Promise<void> => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error('Please enter a valid email address.');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
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

  const canAccessRoute = (pathname?: string | null): AccessCheckResult => {
    const path = pathname || '/';
    if (path === '/' || path === '' || path === '/sign-up') {
      return { allowed: true, requiredRoles: [] };
    }

    if (!isAuthenticated || !currentUser?.uid) {
      return { allowed: false, requiredRoles: [], reason: 'unauthenticated' };
    }

    const cleanEmail = (currentUser.email || '').toLowerCase().trim();
    const isSuperAdmin = cleanEmail === 'tribeverve@gmail.com' || currentUser.role === 'admin' || currentUser.role === 'management';

    // Enforce admin approval for user accounts
    if (!isSuperAdmin && currentUser.isApproved === false) {
      return { allowed: false, requiredRoles: [], reason: 'pending_approval' };
    }

    const role = currentUser.role;

    if (role === 'admin' || role === 'management') {
      return { allowed: true, requiredRoles: [] };
    }

    if (path.startsWith('/portfolio') || path.startsWith('/internal/management')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'portfolio_owner'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    if (path.startsWith('/partners') || path.startsWith('/partner')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'partner'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    if (path.startsWith('/sales') || path.startsWith('/internal/sales')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'sales'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    if (path.startsWith('/finance') || path.startsWith('/internal/finance')) {
      const requiredRoles: UserRole[] = ['admin', 'management', 'finance'];
      const allowed = requiredRoles.includes(role);
      return { allowed, requiredRoles, reason: allowed ? undefined : 'insufficient_role' };
    }

    return { allowed: true, requiredRoles: [] };
  };

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

    const actId = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newActivity: Activity = {
      id: actId,
      activityId: `ACT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId,
      timestamp: formattedTimestamp,
      performedBy: {
        userId: currentUser.uid || 'system',
        name: currentUser.displayName || 'System User',
        role: currentUser.role || 'management',
      },
      activityType,
      description,
      oldValue,
      newValue,
    };

    setDoc(doc(db, 'activities', actId), newActivity).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `activities/${actId}`);
    });
  };

  const reassignPartnerPortfolioOwner = (partnerId: string, newOwnerId: string, newOwnerName: string) => {
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (partner) {
      const docId = partner.id || `part-${partner.partnerId.toLowerCase()}`;
      logStudentActivity(
        partner.partnerId,
        'Partner Portfolio Owner Reassigned',
        `Partner "${partner.companyName}" (${partner.partnerId}) reassigned from ${partner.portfolioOwnerName || 'Unassigned'} to ${newOwnerName} by ${currentUser.displayName}.`,
        partner.portfolioOwnerName || 'Unassigned',
        newOwnerName
      );
      updateDoc(doc(db, 'partners', docId), {
        portfolioOwnerId: newOwnerId,
        portfolioOwnerName: newOwnerName,
        assignedManagerId: newOwnerId,
        assignedManagerName: newOwnerName,
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `partners/${docId}`));
    }
  };

  const reassignLeadSalesOwner = (studentId: string, newSalesOwnerId: string, newSalesOwnerName: string) => {
    const student = students.find((s) => s.studentId === studentId || s.id === studentId);
    if (student) {
      const docId = student.id || `std-${student.studentId.toLowerCase()}`;
      logStudentActivity(
        student.studentId,
        'Sales Owner Reassigned',
        `Sales owner changed from ${student.assignedSalesExecutiveName} to ${newSalesOwnerName}`
      );
      updateDoc(doc(db, 'students', docId), {
        assignedSalesExecutiveId: newSalesOwnerId,
        assignedSalesExecutiveName: newSalesOwnerName,
        updatedAt: new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `students/${docId}`));
    }
  };

  const onboardNewPartner = (partnerData: any): Partner => {
    const partnerIdStr = partnerData.partnerId || `PART-${Math.floor(10000 + Math.random() * 90000)}`;
    const docId = `part-${partnerIdStr.toLowerCase()}`;
    const newPartner: Partner = {
      id: docId,
      partnerId: partnerIdStr,
      companyName: partnerData.companyName || 'New Partner',
      type: partnerData.type || 'Study Abroad Consultant',
      contactPerson: partnerData.contactPerson || 'Contact Person',
      email: partnerData.email || 'partner@example.com',
      phone: partnerData.phone || '+91 98765 43210',
      city: partnerData.city || 'Mumbai',
      state: partnerData.state || 'Maharashtra',
      country: partnerData.country || 'India',
      countries: partnerData.countries || [],
      cities: partnerData.cities || [],
      portfolioOwnerId: partnerData.portfolioOwnerId || currentUser.uid || 'usr-admin-primary',
      portfolioOwnerName: partnerData.portfolioOwnerName || currentUser.displayName || 'Primary Administrator',
      agreementStatus: partnerData.agreementStatus || 'Active',
      agreementType: partnerData.agreementType || 'Master Services Agreement (MSA)',
      agreementTerms: partnerData.agreementTerms || '20% Net Revenue Commission, 30-day payout window',
      agreementSignedDate: partnerData.agreementSignedDate || new Date().toISOString().split('T')[0],
      agreementExpiryDate: partnerData.agreementExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      agreementDocumentUrl: partnerData.agreementDocumentUrl || '',
      status: partnerData.status || 'Active',
      onboardingDate: partnerData.onboardingDate || new Date().toISOString().split('T')[0],
      commissionRate: partnerData.commissionRate || 20,
      ...partnerData,
    };

    setDoc(doc(db, 'partners', docId), newPartner).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `partners/${docId}`);
    });

    logStudentActivity(
      partnerIdStr,
      'Partner Onboarded',
      `New partner "${newPartner.companyName}" (${partnerIdStr}) onboarded under Portfolio Owner ${newPartner.portfolioOwnerName} with ${newPartner.agreementType}.`
    );

    return newPartner;
  };

  const updatePartner = (partnerId: string, updates: Partial<Partner>) => {
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (partner) {
      const docId = partner.id || `part-${partner.partnerId.toLowerCase()}`;
      logStudentActivity(
        partner.partnerId,
        'Partner Updated',
        `Partner "${partner.companyName}" (${partner.partnerId}) profile / agreement terms updated by ${currentUser.displayName}.`
      );
      updateDoc(doc(db, 'partners', docId), updates).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `partners/${docId}`);
      });
    }
  };

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

      if (!lead.fullName || !cleanEmail || !lead.university) {
        errorsCount++;
        return;
      }

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

      const docId = `std-${generatedId.toLowerCase()}`;
      const record: Student = {
        id: docId,
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
        isTestRecord: false,
        archivalStatus: 'Active',
      };

      newRecords.push(record);
      setDoc(doc(db, 'students', docId), record).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `students/${docId}`);
      });
    });

    return {
      importedCount: newRecords.length,
      duplicatesCount,
      errorsCount,
      importedLeads: newRecords,
    };
  };

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

    const docId = `std-${generatedId.toLowerCase()}`;
    const newStudent: Student = {
      id: docId,
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
      createdAt: formattedTimestamp,
      updatedAt: formattedTimestamp,
      notes: lead.notes || 'Submitted via Partners module.',
    };

    setDoc(doc(db, 'students', docId), newStudent).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `students/${docId}`);
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
    const student = students.find((s) => s.studentId === studentId || s.id === studentId);
    if (!student) return;

    const docId = student.id || `std-${student.studentId.toLowerCase()}`;
    const now = new Date();
    const updatedTime = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (updates.leadStatus && updates.leadStatus !== student.leadStatus) {
      logStudentActivity(
        student.studentId,
        'Lead Stage Change',
        `Changed Lead Status from "${student.leadStatus}" to "${updates.leadStatus}"`,
        student.leadStatus,
        updates.leadStatus
      );
    }
    if (updates.accommodationStatus && updates.accommodationStatus !== student.accommodationStatus) {
      logStudentActivity(
        student.studentId,
        'Accommodation Status Change',
        `Changed Accommodation Status from "${student.accommodationStatus}" to "${updates.accommodationStatus}"`,
        student.accommodationStatus,
        updates.accommodationStatus
      );
    }
    if (updates.bookingStatus && updates.bookingStatus !== student.bookingStatus) {
      logStudentActivity(
        student.studentId,
        'Booking Status Change',
        `Changed Booking Status from "${student.bookingStatus}" to "${updates.bookingStatus}"`,
        student.bookingStatus,
        updates.bookingStatus
      );
    }
    if (updates.moveInStatus && updates.moveInStatus !== student.moveInStatus) {
      logStudentActivity(
        student.studentId,
        'Move-in Status Change',
        `Changed Move-in Status from "${student.moveInStatus}" to "${updates.moveInStatus}"`,
        student.moveInStatus,
        updates.moveInStatus
      );
    }
    if (updates.commissionStatus && updates.commissionStatus !== student.commissionStatus) {
      logStudentActivity(
        student.studentId,
        'Commission Status Change',
        `Changed Commission Status from "${student.commissionStatus}" to "${updates.commissionStatus}"`,
        student.commissionStatus,
        updates.commissionStatus
      );
    }

    updateDoc(doc(db, 'students', docId), {
      ...updates,
      updatedAt: updatedTime,
    }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `students/${docId}`);
    });
  };

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

    const docId = `bk-${Date.now()}`;
    const newBooking: Booking = {
      id: docId,
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

    setDoc(doc(db, 'bookings', docId), newBooking).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `bookings/${docId}`);
    });

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
    const booking = bookings.find((b) => b.bookingId === bookingId || b.id === bookingId);
    if (!booking) return;

    const docId = booking.id || `bk-${booking.bookingId.toLowerCase()}`;
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const commissionRate = updates.commissionRate !== undefined ? updates.commissionRate : booking.commissionRate;
    const commissionableAmount = updates.commissionableAmount !== undefined ? updates.commissionableAmount : booking.commissionableAmount;
    const expectedRevenue = Number(((commissionableAmount * commissionRate) / 100).toFixed(2));

    const fieldsToUpdate = {
      ...updates,
      commissionRate,
      commissionableAmount,
      expectedRevenue,
      updatedBy: `${currentUser.displayName} (${currentUser.role})`,
      updatedAt: formattedTimestamp,
    };

    updateDoc(doc(db, 'bookings', docId), fieldsToUpdate).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `bookings/${docId}`);
    });

    logStudentActivity(
      booking.studentId,
      'Property Booking Updated',
      `Property booking ${bookingId} (${updates.propertyName || booking.propertyName}) updated by ${currentUser.displayName}. Status: ${updates.bookingStatus || booking.bookingStatus}. Expected Revenue: ${updates.commissionableCurrency || booking.commissionableCurrency} ${expectedRevenue.toFixed(2)}.`
    );
  };

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

    const docId = `pay-${Date.now()}`;
    const newPayment: Payment = {
      id: docId,
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

    setDoc(doc(db, 'payments', docId), newPayment).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `payments/${docId}`);
    });

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

  const verifyPaymentTransaction = async (
    paymentId: string,
    decision: 'Verified' | 'Rejected',
    remarks?: string
  ): Promise<void> => {
    const payment = payments.find((p) => p.paymentId === paymentId || p.id === paymentId);
    if (!payment) return;

    const docId = payment.id || `pay-${payment.paymentId.toLowerCase()}`;
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    logStudentActivity(
      payment.studentId,
      decision === 'Verified' ? 'Payment Verified' : 'Payment Rejected',
      `Payment ${payment.paymentId} (${payment.currency} ${payment.amount}) was ${decision.toLowerCase()} by ${currentUser.displayName} (${currentUser.role}). ${remarks ? `Note: ${remarks}` : ''}`,
      payment.paymentStatus,
      decision
    );

    if (decision === 'Verified') {
      updateStudentDecoupledStatus(payment.studentId, {
        bookingStatus: 'Booked',
        commissionStatus: 'Due',
      });
    }

    updateDoc(doc(db, 'payments', docId), {
      paymentStatus: decision,
      verifiedBy: `${currentUser.displayName} (${currentUser.role})`,
      verificationTimestamp: formattedTimestamp,
      remarks: remarks ? `${payment.remarks || ''} | ${remarks}` : payment.remarks,
    }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `payments/${docId}`);
    });
  };

  const flagRecordForArchival = async (
    type: 'student' | 'payment' | 'booking' | 'partner',
    id: string,
    tag: string = 'Manual Archival Flag',
    reason: string = 'Flagged for archival by user'
  ) => {
    const timestamp = new Date().toISOString();
    const flaggedBy = currentUser.displayName;

    const targetCollection =
      type === 'student' ? 'students' : type === 'payment' ? 'payments' : type === 'booking' ? 'bookings' : 'partners';

    const updates = {
      isTestRecord: true,
      archivalStatus: 'Flagged For Archival',
      archivalTag: tag,
      archivalReason: reason,
      flaggedAt: timestamp,
      flaggedBy,
    };

    updateDoc(doc(db, targetCollection, id), updates).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `${targetCollection}/${id}`);
    });
  };

  const unflagRecordForArchival = async (
    type: 'student' | 'payment' | 'booking' | 'partner',
    id: string
  ) => {
    const targetCollection =
      type === 'student' ? 'students' : type === 'payment' ? 'payments' : type === 'booking' ? 'bookings' : 'partners';

    const updates = {
      isTestRecord: false,
      archivalStatus: 'Active',
    };

    updateDoc(doc(db, targetCollection, id), updates).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `${targetCollection}/${id}`);
    });
  };

  const flagAllTestRecords = async () => {
    // Flag students with test tags
    students.forEach((s) => {
      if (s.isTestRecord) {
        flagRecordForArchival('student', s.id);
      }
    });
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
        loginWithEmailPassword,
        resetPassword,
        logout,
        approveUser,
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
