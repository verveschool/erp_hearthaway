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
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseAuthUser,
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
  runTransaction,
} from 'firebase/firestore';

interface AccessCheckResult {
  allowed: boolean;
  requiredRoles: UserRole[];
  reason?: 'unauthenticated' | 'insufficient_role' | 'pending_approval';
}

const MANAGEMENT_EMAILS = new Set(['alisha@hearthaway.com', 'tribeverve@gmail.com']);

const isManagementEmail = (email?: string | null) =>
  MANAGEMENT_EMAILS.has((email || '').trim().toLowerCase());

const isManagementAccount = (user?: Pick<AppUser, 'email' | 'role'> | null) =>
  Boolean(user && (isManagementEmail(user.email) || user.role === 'management' || user.role === 'admin'));

const resolveFirebaseProfile = (
  firebaseUser: FirebaseAuthUser,
  storedProfile?: Partial<AppUser>
): AppUser => {
  const email = (firebaseUser.email || storedProfile?.email || '').trim().toLowerCase();
  const isTrustedManager = isManagementEmail(email);
  const isDisabled = storedProfile?.status === 'deleted' || storedProfile?.status === 'disabled';
  const profile: AppUser = {
    ...(storedProfile as AppUser | undefined),
    uid: firebaseUser.uid,
    email,
    displayName: storedProfile?.displayName?.trim() || firebaseUser.displayName || email.split('@')[0] || 'User',
    role: isTrustedManager ? 'management' : storedProfile?.role || 'portfolio_owner',
    isApproved: isTrustedManager && !isDisabled ? true : storedProfile?.isApproved ?? true,
    status: isTrustedManager && !isDisabled ? 'approved' : storedProfile?.status ?? 'approved',
  };
  const avatarUrl = storedProfile?.avatarUrl || firebaseUser.photoURL;
  if (avatarUrl) profile.avatarUrl = avatarUrl;
  return profile;
};

const ensureFirebaseProfile = async (firebaseUser: FirebaseAuthUser, createIfMissing = true): Promise<AppUser> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const storedProfile = snapshot.exists() ? snapshot.data() as Partial<AppUser> : undefined;
    const profile = resolveFirebaseProfile(firebaseUser, storedProfile);

    if (storedProfile?.status === 'deleted') return profile;
    if (!snapshot.exists() && !createIfMissing) return profile;

    const profileFields: Partial<AppUser> = {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      isApproved: profile.isApproved,
      status: profile.status,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    };
    const storedFields = snapshot.exists() ? snapshot.data() as Record<string, unknown> : {};
    const needsWrite = !snapshot.exists() || Object.entries(profileFields).some(([key, value]) => storedFields[key] !== value);

    if (needsWrite) {
      transaction.set(userRef, profileFields, { merge: true });
    }
    return profile;
  });
};

interface HearthAwayContextType {
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  availableUsers: AppUser[];

  // Authentication & Access Control
  isAuthenticated: boolean;
  authInitialized: boolean;
  loginWithUser: (user: AppUser) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  approveUser: (uid: string, approve?: boolean) => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
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
  }) => Promise<AppUser>;
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
  ) => Promise<{ importedCount: number; duplicatesCount: number; errorsCount: number; importedLeads: Student[] }>;
  onboardNewPartner: (partnerData: any) => Promise<Partner>;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => Promise<void>;
  deletePartner: (partnerId: string) => Promise<void>;
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
    partnerId?: string;
    partnerName?: string;
  }) => Promise<Student>;

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
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
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

  // Start data listeners only after Firebase restores a signed-in user.
  useEffect(() => {
    console.log('[v0] Auth listener effect started');
    let isMounted = true;
    let authEvent = 0;
    let dataSubscriptions: Array<() => void> = [];

    const clearSyncedData = () => {
      setStudents([]);
      setPartners([]);
      setBookings([]);
      setPayments([]);
      setActivities([]);
      setAvailableUsers([]);
      setSelectedStudentId(null);
    };

    const stopDataSubscriptions = () => {
      dataSubscriptions.forEach((unsubscribe) => unsubscribe());
      dataSubscriptions = [];
    };

    const cacheProfile = (profile: AppUser) => {
      try {
        localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
        localStorage.setItem('hearthaway_auth_uid', profile.uid);
      } catch {}
    };

    const subscribeToData = () => {
      stopDataSubscriptions();
      dataSubscriptions = [
        onSnapshot(
          collection(db, 'students'),
          (snapshot) => {
            if (isMounted) setStudents(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Student)));
          },
          (error) => {
            console.warn('[v0] Students listener failed:', error.message);
            if (isMounted) setStudents([]);
          }
        ),
        onSnapshot(
          collection(db, 'partners'),
          (snapshot) => {
            if (isMounted) setPartners(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Partner)));
          },
          (error) => {
            console.warn('[v0] Partners listener failed:', error.message);
            if (isMounted) setPartners([]);
          }
        ),
        onSnapshot(
          collection(db, 'bookings'),
          (snapshot) => {
            if (isMounted) setBookings(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Booking)));
          },
          (error) => {
            console.warn('[v0] Bookings listener failed:', error.message);
            if (isMounted) setBookings([]);
          }
        ),
        onSnapshot(
          collection(db, 'payments'),
          (snapshot) => {
            if (isMounted) setPayments(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Payment)));
          },
          (error) => {
            console.warn('[v0] Payments listener failed:', error.message);
            if (isMounted) setPayments([]);
          }
        ),
        onSnapshot(
          collection(db, 'activities'),
          (snapshot) => {
            if (isMounted) setActivities(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Activity)));
          },
          (error) => {
            console.warn('[v0] Activities listener failed:', error.message);
            if (isMounted) setActivities([]);
          }
        ),
        onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            if (!isMounted) return;
            const users = snapshot.docs
              .map((item) => ({ ...item.data(), uid: item.id } as AppUser))
              .filter((user) => user.status !== 'deleted' && user.status !== 'disabled' && !user.deletedAt);
            setAvailableUsers(users);
          },
          (error) => {
            console.warn('[v0] Users listener failed:', error.message);
            if (isMounted) setAvailableUsers([]);
          }
        ),
      ];
    };

    void setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('[v0] Firebase auth persistence setup failed:', error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[v0] Auth state callback received', Boolean(firebaseUser));
      const eventId = ++authEvent;
      stopDataSubscriptions();
      clearSyncedData();
      setCurrentUser(DEFAULT_EMPTY_USER);
      setIsAuthenticated(false);

      if (!firebaseUser) {
        try {
          localStorage.removeItem('hearthaway_auth_uid');
          localStorage.removeItem('hearthaway_current_user_profile');
        } catch {}
        if (isMounted) setAuthInitialized(true);
        return;
      }

      setAuthInitialized(false);
      try {
        await firebaseUser.getIdToken();
        const profile = await ensureFirebaseProfile(firebaseUser, isManagementEmail(firebaseUser.email));
        if (!isMounted || eventId !== authEvent) return;

        if (profile.status === 'deleted' || profile.status === 'disabled') {
          await signOut(auth);
          return;
        }

        setCurrentUser(profile);
        setIsAuthenticated(true);
        cacheProfile(profile);
        subscribeToData();
      } catch (error) {
        console.warn('[v0] Failed to load Firebase user profile:', error);
        if (!isMounted || eventId !== authEvent) return;
        const fallbackProfile = resolveFirebaseProfile(firebaseUser);
        setCurrentUser(fallbackProfile);
        setIsAuthenticated(true);
        cacheProfile(fallbackProfile);
        subscribeToData();
      } finally {
        if (isMounted && eventId === authEvent) setAuthInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      authEvent += 1;
      unsubscribeAuth();
      stopDataSubscriptions();
    };
  }, []);

  const openAuthModal = (tab: 'signin' | 'signup' | 'manage' = 'signin') => {
    setAuthModalTab(tab);
    setIsLoginModalOpen(true);
  };

  const assertFirebaseSession = () => {
    if (!auth.currentUser || auth.currentUser.uid !== currentUser.uid) {
      throw new Error('Your Firebase session is not ready. Please sign in again and retry.');
    }
  };

  const assertManagementAccess = () => {
    assertFirebaseSession();
    if (!isManagementAccount(currentUser)) {
      throw new Error('Only management accounts can make this change.');
    }
  };

  const createAccount = async (data: {
    displayName: string;
    email: string;
    role: UserRole;
    partnerName?: string;
    phone?: string;
    university?: string;
    avatarUrl?: string;
  }): Promise<AppUser> => {
    const firebaseUser = auth.currentUser;
    const cleanEmail = data.email.trim().toLowerCase();
    if (!firebaseUser || firebaseUser.email?.trim().toLowerCase() !== cleanEmail) {
      throw new Error('Firebase sign-in is not ready for this account. Please sign in again and retry.');
    }

    const uid = firebaseUser.uid;
    const isPartner = data.role === 'partner' && !isManagementEmail(cleanEmail);
    const role: UserRole = isManagementEmail(cleanEmail) ? 'management' : isPartner ? 'partner' : 'portfolio_owner';
    let existingPartner: Partner | undefined;

    if (isPartner) {
      try {
        const partnerSnapshot = await getDocs(collection(db, 'partners'));
        const matchingPartners = partnerSnapshot.docs
          .map((item) => ({ ...item.data(), id: item.id } as Partner))
          .filter((partner) => partner.email?.trim().toLowerCase() === cleanEmail);
        if (matchingPartners.length > 1) {
          throw new Error('More than one partner record uses this email. Ask management to resolve the duplicate before registering.');
        }
        existingPartner = matchingPartners[0];
        if (existingPartner?.accountUid && existingPartner.accountUid !== uid) {
          throw new Error('This partner record is already linked to another account. Ask management for help.');
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('More than one partner')) throw error;
        if (error instanceof Error && error.message.startsWith('This partner record')) throw error;
        handleFirestoreError(error, OperationType.LIST, 'partners');
      }
    }

    const partnerId = isPartner
      ? existingPartner?.partnerId || `PART-${Math.floor(10000 + Math.random() * 90000)}`
      : undefined;
    const newUser: AppUser = {
      uid,
      email: cleanEmail,
      displayName: data.displayName.trim(),
      role,
      isApproved: true,
      status: 'approved',
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.university ? { university: data.university } : {}),
      ...(isPartner
        ? {
            partnerId,
            partnerName: existingPartner?.companyName || data.partnerName || 'Independent Partner',
          }
        : {}),
      ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
    };

    try {
      await setDoc(doc(db, 'users', uid), newUser, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }

    if (isPartner && partnerId) {
      if (existingPartner) {
        try {
          await setDoc(doc(db, 'partners', existingPartner.id), { accountUid: uid }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `partners/${existingPartner.id}`);
        }
      } else {
        const partnerRecord: Partner = {
          id: `part-${partnerId.toLowerCase()}`,
          partnerId,
          accountUid: uid,
          companyName: data.partnerName || data.displayName,
          type: 'Study Abroad Consultant',
          contactPerson: data.displayName,
          email: cleanEmail,
          phone: data.phone || '',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          countries: ['India'],
          cities: ['Mumbai'],
          portfolioOwnerId: '',
          portfolioOwnerName: '',
          assignedManagerId: '',
          assignedManagerName: '',
          agreementStatus: 'Pending Review',
          agreementType: 'Master Services Agreement (MSA)',
          agreementTerms: '40% Commission, 120-day payment window',
          agreementDocumentUrl: '',
          status: 'Onboarding',
          onboardingDate: new Date().toISOString().split('T')[0],
          commissionRate: 40,
        };
        try {
          await setDoc(doc(db, 'partners', partnerRecord.id), partnerRecord, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `partners/${partnerRecord.id}`);
        }
      }
    }

    setCurrentUser(newUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('hearthaway_auth_uid', newUser.uid);
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(newUser));
    } catch {}
    setIsLoginModalOpen(false);
    return newUser;
  };

  const approveUser = async (uid: string, approve: boolean = true) => {
    assertManagementAccess();
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

  const updateUserRole = async (uid: string, role: UserRole) => {
    assertManagementAccess();
    if (uid === currentUser.uid) return;
    await setDoc(doc(db, 'users', uid), { role }, { merge: true });
    setAvailableUsers((previous) => previous.map((user) => user.uid === uid ? { ...user, role } : user));
  };

  const deleteUser = async (uid: string) => {
    assertManagementAccess();
    if (!uid || uid === currentUser.uid) return;
    await setDoc(doc(db, 'users', uid), {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      isApproved: false,
    }, { merge: true });
    setAvailableUsers((previous) => previous.filter((user) => user.uid !== uid));
  };

  const removeAllAccounts = async () => {
    assertManagementAccess();
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      for (const dSnap of querySnapshot.docs) {
        const userData = dSnap.data() as AppUser;
        if (!isManagementEmail(userData.email)) {
          await deleteDoc(doc(db, 'users', dSnap.id));
        }
      }
      setAvailableUsers((previous) => previous.filter((user) => isManagementEmail(user.email)));
    } catch (error) {
      console.error('Failed to remove accounts:', error);
      throw error;
    }
  };

  const updateCurrentUserProfile = (updates: Partial<AppUser>) => {
    if (!currentUser?.uid || auth.currentUser?.uid !== currentUser.uid) return;
    const safeUpdates = { ...updates };
    if (!isManagementAccount(currentUser)) {
      delete safeUpdates.role;
      delete safeUpdates.status;
      delete safeUpdates.isApproved;
      delete safeUpdates.partnerId;
    }
    const updated = { ...currentUser, ...safeUpdates };
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

  const loginWithUser = async (user: AppUser) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.uid) {
      throw new Error('Sign in with Firebase before opening this account.');
    }

    const profile = await ensureFirebaseProfile(firebaseUser);
    setCurrentUser(profile);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('hearthaway_auth_uid', profile.uid);
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
    } catch {}
    setIsLoginModalOpen(false);
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const profile = await ensureFirebaseProfile(result.user);
      if (profile.status === 'deleted' || profile.status === 'disabled') {
        await signOut(auth);
        throw new Error('This account is disabled. Contact HearthAway management.');
      }

      setCurrentUser(profile);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('hearthaway_auth_uid', profile.uid);
        localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
      } catch {}
      setIsLoginModalOpen(false);
    } catch (error) {
      console.warn('[v0] Google sign-in failed:', error);
      throw error;
    }
  };

  const loginWithEmailPassword = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    if (!password || password.length < 6) {
      throw new Error('Enter your Firebase email and password to sign in.');
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const profile = await ensureFirebaseProfile(credential.user);
      if (profile.status === 'deleted' || profile.status === 'disabled') {
        await signOut(auth);
        throw new Error('This account is disabled. Contact HearthAway management.');
      }

      setCurrentUser(profile);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('hearthaway_auth_uid', profile.uid);
        localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(profile));
      } catch {}
      setIsLoginModalOpen(false);
    } catch (error) {
      console.warn('[v0] Firebase sign-in rejected:', error);
      if (error instanceof Error && error.message.startsWith('This account is disabled')) throw error;
      throw new Error('Invalid email or password.');
    }
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

    const role = isManagementEmail(currentUser.email) ? 'management' : currentUser.role;

    if (isManagementAccount({ ...currentUser, role })) {
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
      ...(typeof oldValue === 'string' ? { oldValue } : {}),
      ...(typeof newValue === 'string' ? { newValue } : {}),
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

  const onboardNewPartner = async (partnerData: Partial<Partner>): Promise<Partner> => {
    assertManagementAccess();
    const normalizedEmail = String(partnerData.email || '').trim().toLowerCase();
    const companyName = String(partnerData.companyName || '').trim();
    const contactPerson = String(partnerData.contactPerson || '').trim();
    if (!normalizedEmail || !companyName || !contactPerson) {
      throw new Error('Partner company name, contact person, and email are required.');
    }

    const existingPartner = partners.find((partner) =>
      partner.email?.trim().toLowerCase() === normalizedEmail ||
      partner.companyName?.trim().toLowerCase() === companyName.toLowerCase()
    );
    if (existingPartner) {
      throw new Error(`A partner record already exists for ${existingPartner.companyName} (${existingPartner.partnerId}).`);
    }

    const owner = availableUsers.find(
      (user) =>
        user.uid === partnerData.portfolioOwnerId &&
        ['portfolio_owner', 'management', 'admin'].includes(user.role) &&
        user.status !== 'deleted' &&
        user.status !== 'disabled' &&
        user.isApproved !== false
    );
    if (!owner) throw new Error('Select an active portfolio owner before onboarding this partner.');

    const partnerIdStr = partnerData.partnerId || `PART-${Math.floor(10000 + Math.random() * 90000)}`;
    const docId = `part-${partnerIdStr.toLowerCase()}`;
    const today = new Date().toISOString().split('T')[0];
    const newPartner: Partner = {
      ...partnerData,
      id: docId,
      partnerId: partnerIdStr,
      companyName,
      type: partnerData.type || 'Study Abroad Consultant',
      contactPerson,
      email: normalizedEmail,
      phone: partnerData.phone || '',
      city: partnerData.city || '',
      state: partnerData.state || '',
      country: partnerData.country || '',
      countries: partnerData.countries || [],
      cities: partnerData.cities || [],
      portfolioOwnerId: owner.uid,
      portfolioOwnerName: owner.displayName,
      assignedManagerId: owner.uid,
      assignedManagerName: owner.displayName,
      agreementStatus: partnerData.agreementStatus || 'Pending Review',
      agreementType: partnerData.agreementType || 'Master Services Agreement (MSA)',
      agreementTerms: partnerData.agreementTerms || '40% Commission, 120-day payment window',
      agreementSignedDate: partnerData.agreementSignedDate || '',
      agreementExpiryDate: partnerData.agreementExpiryDate || '',
      agreementDocumentUrl: partnerData.agreementDocumentUrl || '',
      status: partnerData.status || 'Onboarding',
      onboardingDate: partnerData.onboardingDate || today,
      commissionRate: partnerData.commissionRate ?? 40,
    };

    try {
      await setDoc(doc(db, 'partners', docId), newPartner);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `partners/${docId}`);
    }

    logStudentActivity(
      partnerIdStr,
      'Partner Onboarded',
      `New partner "${newPartner.companyName}" (${partnerIdStr}) onboarded under Portfolio Owner ${owner.displayName} with ${newPartner.agreementType}.`
    );
    return newPartner;
  };

  const updatePartner = async (partnerId: string, updates: Partial<Partner>): Promise<void> => {
    assertManagementAccess();
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} was not found. Refresh the partners page and try again.`);
    }

    const normalizedUpdates = updates.email
      ? { ...updates, email: updates.email.trim().toLowerCase() }
      : updates;
    const docId = partner.id || `part-${partner.partnerId.toLowerCase()}`;
    try {
      await setDoc(doc(db, 'partners', docId), normalizedUpdates, { merge: true });
      setPartners((previous) => previous.map((item) => item.partnerId === partner.partnerId ? { ...item, ...normalizedUpdates } : item));
      logStudentActivity(
        partner.partnerId,
        'Partner Updated',
        `Partner "${partner.companyName}" (${partner.partnerId}) profile / agreement terms updated by ${currentUser.displayName}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `partners/${docId}`);
    }
  };

  const deletePartner = async (partnerId: string): Promise<void> => {
    assertManagementAccess();
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (!partner) throw new Error(`Partner ${partnerId} was not found.`);

    const docId = partner.id || `part-${partner.partnerId.toLowerCase()}`;
    await deleteDoc(doc(db, 'partners', docId));
    setPartners((previous) => previous.filter((p) => p.id !== docId && p.partnerId !== partner.partnerId));
  };

  const getCurrentPartnerRecord = () => {
    const byAccount = partners.find((partner) => partner.accountUid === currentUser.uid);
    if (byAccount) return byAccount;

    const emailMatches = partners.filter(
      (partner) => partner.email?.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
    );
    if (emailMatches.length === 1) return emailMatches[0];

    return currentUser.partnerId
      ? partners.find((partner) => partner.partnerId === currentUser.partnerId)
      : undefined;
  };

  const bulkImportPartnerLeads = async (
    incomingLeads: Array<any>,
    explicitPartnerId?: string,
    explicitPartnerName?: string
  ): Promise<{ importedCount: number; duplicatesCount: number; errorsCount: number; importedLeads: Student[] }> => {
    assertFirebaseSession();
    const linkedPartner = currentUser.role === 'partner' ? getCurrentPartnerRecord() : undefined;
    const ownPartnerId = linkedPartner?.partnerId || currentUser.partnerId;
    if (currentUser.role === 'partner' && (!ownPartnerId || !linkedPartner || (explicitPartnerId && explicitPartnerId !== ownPartnerId))) {
      throw new Error('This partner account is not linked to the selected partner record. Ask management to link it before importing leads.');
    }

    const partnerId = currentUser.role === 'partner' ? ownPartnerId : explicitPartnerId;
    if (!partnerId) throw new Error('Select a partner before importing leads.');
    const matchedPartner = partners.find((partner) => partner.partnerId === partnerId) || linkedPartner;
    if (partnerId !== 'direct' && !matchedPartner) {
      throw new Error('The selected partner record is unavailable. Refresh the page or ask management to check the partner mapping.');
    }
    const partnerName = partnerId === 'direct'
      ? 'Direct / HearthAway'
      : matchedPartner?.companyName || explicitPartnerName || currentUser.partnerName || '';
    if (partnerId !== 'direct' && !partnerName) throw new Error('The selected partner has no company name.');

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
    const existingEmails = new Set(students.map((student) => student.email.toLowerCase().trim()));
    const existingPhones = new Set(students.map((student) => student.phone.replace(/\D/g, '')));
    const salesReps = availableUsers.filter(
      (user) => user.role === 'sales' && user.status !== 'deleted' && user.status !== 'disabled'
    );

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
      const generatedId = `HA-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const [firstName, ...rest] = lead.fullName.trim().split(' ');
      const assignedRep = currentUser.role === 'sales'
        ? currentUser
        : salesReps[index % Math.max(salesReps.length, 1)];
      const docId = `std-${generatedId.toLowerCase()}`;
      const record: Student = {
        id: docId,
        studentId: generatedId,
        firstName,
        lastName: rest.join(' ') || 'Lead',
        fullName: lead.fullName.trim(),
        email: cleanEmail,
        phone: lead.phone || '',
        whatsApp: lead.phone || '',
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
        leadSource: partnerId === 'direct' ? 'Internal Sales' : 'Study Abroad Consultants',
        partnerId,
        partnerName,
        assignedSalesExecutiveId: assignedRep?.uid || '',
        assignedSalesExecutiveName: assignedRep?.displayName || 'Unassigned',
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
    });

    try {
      await Promise.all(newRecords.map((record) => setDoc(doc(db, 'students', record.id), record)));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }

    return { importedCount: newRecords.length, duplicatesCount, errorsCount, importedLeads: newRecords };
  };

  const submitPartnerLead = async (lead: {
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
    partnerId?: string;
    partnerName?: string;
  }): Promise<Student> => {
    assertFirebaseSession();
    const isPartnerUser = currentUser.role === 'partner';
    const linkedPartner = isPartnerUser ? getCurrentPartnerRecord() : undefined;
    const partnerId = isPartnerUser
      ? linkedPartner?.partnerId || ''
      : lead.partnerId || 'direct';
    if (isPartnerUser && (!partnerId || !linkedPartner)) {
      throw new Error('This partner account is not linked to a partner record. Ask management to link it before submitting leads.');
    }

    const matchedPartner = partners.find((partner) => partner.partnerId === partnerId) || linkedPartner;
    if (partnerId !== 'direct' && !matchedPartner) {
      throw new Error('The selected partner record is unavailable. Refresh the page or ask management to check the partner mapping.');
    }
    const partnerName = partnerId === 'direct'
      ? 'Direct / HearthAway'
      : matchedPartner?.companyName || currentUser.partnerName || lead.partnerName || '';
    if (partnerId !== 'direct' && !partnerName) throw new Error('The selected partner has no company name.');

    const cleanName = lead.fullName.trim();
    const cleanEmail = lead.email.trim().toLowerCase();
    if (!cleanName || !cleanEmail || !lead.university.trim()) {
      throw new Error('Student name, email, and university are required.');
    }

    const generatedId = `HA-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const [firstName, ...rest] = cleanName.split(' ');
    const formattedTimestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const salesRep = currentUser.role === 'sales'
      ? currentUser
      : availableUsers.find((user) => user.role === 'sales' && user.status !== 'deleted' && user.status !== 'disabled');
    const docId = `std-${generatedId.toLowerCase()}`;
    const newStudent: Student = {
      id: docId,
      studentId: generatedId,
      firstName,
      lastName: rest.join(' ') || 'Student',
      fullName: cleanName,
      email: cleanEmail,
      phone: lead.phone,
      whatsApp: lead.phone,
      nationality: 'India',
      currentCountry: 'India',
      university: lead.university.trim(),
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
      leadSource: partnerId === 'direct' ? 'Internal Sales' : 'Study Abroad Consultants',
      partnerId,
      partnerName,
      assignedSalesExecutiveId: salesRep?.uid || '',
      assignedSalesExecutiveName: salesRep?.displayName || 'Unassigned',
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

    try {
      await setDoc(doc(db, 'students', docId), newStudent);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `students/${docId}`);
    }

    logStudentActivity(
      generatedId,
      'Lead Submitted',
      `Lead ${generatedId} submitted by ${partnerName} (${partnerId}). Assigned to internal workflow pool.`,
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
    authInitialized,
    loginWithUser,
        loginWithGoogle,
        loginWithEmailPassword,
        resetPassword,
        logout,
  approveUser,
  updateUserRole,
  deleteUser,
  removeAllAccounts,
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
  deletePartner,
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
