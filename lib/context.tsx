'use client';

import { persistLeadActivity, persistNewBooking, persistBookingEdit } from './crm-record-writes';
import { writeActivity } from './operational-activity';

import { conversionText, validateConversion } from './payment-money';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
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
  PipelineStage,
  ExitReason,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_STUDENTS,
  INITIAL_PARTNERS,
  INITIAL_BOOKINGS,
  INITIAL_PAYMENTS,
  INITIAL_ACTIVITIES,
} from './mock-data';
import { normalizeLeadPhone } from './lead-phone';
import { getLeadOwner, intakeKey, leadConflictMessage, leadContactConflicts, leadDetailsSchema, leadEditSchema, type LeadDetails } from './lead-details';
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
  getIdTokenResult,
  onIdTokenChanged,
} from 'firebase/auth';
import {
  Bytes,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

export type BulkLeadImportResult = {
  importedCount: number;
  duplicatesCount: number;
  invalidCount: number;
  retryRows: LeadDetails[];
  failureCodes: string[];
};

const getInitialPipelineStage = (student: Student): PipelineStage => {
  if (student.pipelineStage) return student.pipelineStage;
  if (student.bookingStatus === 'Cancelled' || student.moveInStatus === 'Cancelled') return 'Cancelled';
  if (student.leadStatus === 'Lost') return 'Disqualified';
  if (student.moveInStatus === 'Moved In' || student.bookingStatus === 'Move-in Confirmed' || student.bookingStatus === 'Booked') return 'Closed Won';
  if (['Processing', 'Documents Pending', 'Application Submitted', 'Approved'].includes(student.bookingStatus || '')) return 'Fulfilment';
  if (student.bookingStatus === 'Payment Pending') return 'Payment';
  if (['Options Shared', 'Shortlisted', 'Property Selected'].includes(student.accommodationStatus || '')) return 'Option Shared';
  if (student.leadStatus === 'Qualified') return 'Qualified';
  if (student.leadStatus === 'Contacted') return 'Active';
  return 'New';
};

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
  authInitialized: boolean;
  loginWithUser: (user: AppUser) => void;
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
  }) => AppUser;
  updateCurrentUserProfile: (updates: Partial<AppUser>) => Promise<void>;
  canAccessRoute: (pathname?: string | null) => AccessCheckResult;

  // Master Entities
  students: Student[];
  partners: Partner[];
  bookings: Booking[];
  payments: Payment[];
  activities: Activity[];
  activityError: boolean;

  // Workflows & Mutations with Audit Logs
  reassignPartnerPortfolioOwner: (partnerId: string, newOwnerId: string, newOwnerName: string) => Promise<void>;
  reassignLeadOwner: (studentId: string, ownerId: string, ownerName: string) => Promise<void>;
  assignSalesOwner: (studentId: string, ownerId: string, ownerName: string) => Promise<void>;
  editLeadDetails: (studentId: string, details: LeadDetails) => Promise<void>;
  archiveLead: (studentId: string, reason: string) => Promise<void>;
  leadOperationsRole: string;
  internalRole: 'admin' | 'management' | '';
  leadOwnerOptions: Array<{ uid: string; displayName: string }>;
  portfolioOwnerOptions: Array<{ uid: string; displayName: string }>;
  setPartnerLeadTarget: (partnerId: string, season: string, promised: number) => Promise<void>;
  bulkImportPartnerLeads: (leads: LeadDetails[], partnerId?: string) => Promise<BulkLeadImportResult>;
  onboardNewPartner: (partnerData: any) => Promise<Partner>;
  updatePartner: (partnerId: string, updates: Partial<Partner>, agreementFile?: File) => Promise<void>;
  getPartnerAgreement: (partnerId: string) => Promise<{ name: string; bytes: ArrayBuffer } | null>;
  deletePartner: (partnerId: string) => Promise<void>;
  submitPartnerLead: (lead: LeadDetails, partnerId?: string) => Promise<Student>;

  updateStudentDecoupledStatus: (
    studentId: string,
    updates: {
      pipelineStage?: PipelineStage;
      exitReason?: ExitReason;
      priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
      nextFollowUpAt?: string;
      notes?: string;
      propertyName?: string;
      providerType?: 'PBSA' | 'HMO' | 'Landlord';
      tenancyDuration?: string;
      rentAmount?: number;
      rentPaymentPeriod?: 'Weekly' | 'Monthly' | 'Termly' | 'Annual';
      commissionable?: boolean;
      // Compatibility for non-CRM modules during the rollout.
      leadStatus?: LeadStatus;
      accommodationStatus?: AccommodationStatus;
      bookingStatus?: BookingStatus;
      moveInStatus?: MoveInStatus;
      commissionStatus?: CommissionStatus;
    }
  ) => Promise<void>;

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
    rateToInr: number;
    amountInr: number;
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
  ) => Promise<void>;

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
  const [firebaseSessionUid, setFirebaseSessionUid] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'manage'>('signin');
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);

  // Master collections start with zero existing data; synced live from Firestore
  const [students, setStudents] = useState<Student[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityError, setActivityError] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [hideTestRecords, setHideTestRecords] = useState<boolean>(false);
  const [operationsIdentity, setOperationsIdentity] = useState<{ uid: string; role: string; internalRole: 'admin' | 'management' | '' } | null>(null);
  const internalRole = operationsIdentity?.uid === currentUser.uid ? operationsIdentity.internalRole : '';
  const leadOperationsRole = internalRole ? 'management' : '';
  const [leadOwnerOptions, setLeadOwnerOptions] = useState<Array<{ uid: string; displayName: string }>>([]);
  const [portfolioOwnerOptions, setPortfolioOwnerOptions] = useState<Array<{ uid: string; displayName: string }>>([]);

  useEffect(() => {
    let revision = 0;
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      const currentRevision = ++revision;
      if (!user) {
        setOperationsIdentity(null);
        return;
      }
      void getIdTokenResult(user).then(({ claims }) => {
        if (revision === currentRevision && auth.currentUser?.uid === user.uid) {
          setPayments([]); setAvailableUsers([]); setActivities([]);
          setOperationsIdentity({ uid: user.uid, role: typeof claims.leadOperationsRole === 'string' ? claims.leadOperationsRole : '', internalRole: claims.internalRole === 'admin' || claims.internalRole === 'management' ? claims.internalRole : claims.internalRole === undefined ? (claims.leadOperationsRole === 'management' ? 'admin' : claims.leadOperationsRole === 'sales' || claims.leadOperationsRole === 'portfolio_owner' ? 'management' : '') : '' });
        }
      }).catch(() => {});
    });
    return () => { revision++; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (leadOperationsRole !== 'management') return;
    const directories: Record<string, Array<{ uid: string; displayName: string }>> = {};
    const watch = (directory: string) => onSnapshot(collection(db, directory), (snapshot) => {
      if (auth.currentUser?.uid !== currentUser.uid) return;
      directories[directory] = snapshot.docs.flatMap((entry) => {
        const name = entry.data().displayName;
        return typeof name === 'string' && name.trim() ? [{ uid: entry.id, displayName: name }] : [];
      });
      const combined = Array.from(new Map(Object.values(directories).flat().map(item => [item.uid, item])).values())
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      setLeadOwnerOptions(combined);
      setPortfolioOwnerOptions(combined);
    }, () => { directories[directory] = []; });
    const stopLeadOwners = watch('leadOwnerDirectory');
    const stopPortfolioOwners = watch('portfolioOwnerDirectory');
    return () => { stopLeadOwners(); stopPortfolioOwners(); };

  }, [leadOperationsRole, currentUser.uid]);

  // Resolve the Firebase identity before subscribing to workspace data.
  useEffect(() => {
    let isMounted = true;
    let authRevision = 0;
    let previousUid: string | null = null;
    void setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('[v0] Firebase auth persistence setup failed:', error);
    });

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      const revision = ++authRevision;
      const uid = fbUser?.uid ?? null;
      const isCurrent = () => isMounted && revision === authRevision && (auth.currentUser?.uid ?? null) === uid;

      if (uid !== previousUid) {
        if (previousUid) {
          setIsAuthenticated(false);
          setCurrentUser(DEFAULT_EMPTY_USER);
        }
        previousUid = uid;
        setFirebaseSessionUid(null);
        setStudents([]);
        setPartners([]);
        setBookings([]);
        setPayments([]);
        setActivities([]);
        setAvailableUsers([]);
        setSelectedStudentId(null);
        setLeadOwnerOptions([]);
        setPortfolioOwnerOptions([]);
      }

      if (fbUser) {
        try {
          const cleanEmail = (fbUser.email || '').toLowerCase().trim();
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);
          if (!isCurrent()) return;

          if (snap.exists()) {
            const storedProfile = snap.data() as AppUser;
            if (storedProfile.status === 'deleted' || storedProfile.deletedAt) {
              await signOut(auth);
              return;
            }
            const profile = {
              ...storedProfile,
              isApproved: storedProfile.isApproved ?? true,
              status: storedProfile.status ?? 'approved',
            };
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
              role: 'partner',
              avatarUrl: fbUser.photoURL || undefined,
              isApproved: true,
              status: 'approved',
            };
            await setDoc(userRef, newUser);
            if (!isCurrent()) return;
            setCurrentUser(newUser);
            setIsAuthenticated(true);
            try {
              localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(newUser));
              localStorage.setItem('hearthaway_auth_uid', newUser.uid);
            } catch {}
          }
          setFirebaseSessionUid(fbUser.uid);
        } catch (err) {
          console.warn('Error fetching Firestore user profile:', err);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(DEFAULT_EMPTY_USER);
        try {
          localStorage.removeItem('hearthaway_auth_uid');
          localStorage.removeItem('hearthaway_current_user_profile');
        } catch {}
      }
      if (isCurrent()) setAuthInitialized(true);
    });

    return () => {
      isMounted = false;
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!firebaseSessionUid || auth.currentUser?.uid !== firebaseSessionUid) return;
    let active = true;
    const isCurrent = () => active && auth.currentUser?.uid === firebaseSessionUid;

    // Firestore stops a listener after a permission failure. Start fresh for each authenticated session.
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        if (!isCurrent()) return;
        const list = snapshot.docs.flatMap((docSnap) => {
          const student = { ...docSnap.data(), id: docSnap.id } as Student;
          if (student.archivalStatus === 'Archived') return [];
          const pipelineStage = getInitialPipelineStage(student);
          if (student.pipelineStage !== pipelineStage) {
            setDoc(docSnap.ref, { pipelineStage }, { merge: true }).catch((err) => {
              handleFirestoreError(err, OperationType.WRITE, `students/${docSnap.id}`);
            });
          }
          return [{ ...student, pipelineStage }];
        });
        setStudents(list);
      },
      (err) => {
        console.warn('Students listener status:', err.message);
      }
    );

    const unsubPartners = onSnapshot(
      collection(db, 'partners'),
      (snapshot) => {
        if (!isCurrent()) return;
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          // The Firestore document ID is authoritative; stored IDs can be stale after imports.
          id: docSnap.id,
        } as Partner));
        setPartners(list);
      },
      (err) => {
        console.warn('Partners listener status:', err.message);
      }
    );

    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      (snapshot) => {
        if (!isCurrent()) return;
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Booking);
        setBookings(list);
      },
      (err) => {
        console.warn('Bookings listener status:', err.message);
      }
    );

    const unsubPayments = internalRole === 'admin' ? onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        if (!isCurrent()) return;
        const list = snapshot.docs.map((docSnap) => docSnap.data() as Payment);
        setPayments(list);
      },
      (err) => {
        console.warn('Payments listener status:', err.message);
      }
    ) : () => {};

    // Management receives only the sanitized projection. The mixed audit log is admin-only.
    const unsubActivities = internalRole ? onSnapshot(
      collection(db, internalRole === 'admin' ? 'activities' : 'operationalActivities'),
      (snapshot) => {
        if (!isCurrent()) return;
        setActivityError(false);
        setActivities(snapshot.docs.map((docSnap) => ({ description: '', ...docSnap.data(), id: docSnap.id } as Activity)));
      },
      (err) => { setActivities([]); setActivityError(true); console.warn('Activities listener status:', err.message); }
    ) : () => { setActivities([]); };


    const unsubUsers = internalRole === 'admin' ? onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!isCurrent()) return;
        const list = snapshot.docs
          .map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() } as AppUser))
          .filter((user) => user.status !== 'deleted' && user.status !== 'disabled' && !user.deletedAt);
        setAvailableUsers(list);
      },
      (err) => {
        console.warn('Users listener status:', err.message);
      }
    ) : () => {};

    return () => {
      active = false;
      unsubStudents();
      unsubPartners();
      unsubBookings();
      unsubPayments();
      unsubActivities();
      unsubUsers();
    };
  }, [firebaseSessionUid, internalRole]);

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
    const isPartner = true;
    const partnerId = isPartner ? `PART-${Math.floor(10000 + Math.random() * 90000)}` : undefined;
    // Use the Firebase Auth UID so Firestore ownership rules can authorize the write.
    const uid = auth.currentUser?.uid || `user-${Date.now()}`;
    const cleanEmail = data.email.toLowerCase().trim();
    const newUser: AppUser = {
      uid,
      email: cleanEmail,
      displayName: data.displayName,
      role: 'partner',
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

    if (isPartner) {
      const partnerRecord: Partner = {
        id: `part-${partnerId!.toLowerCase()}`,
        partnerId: partnerId!,
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
      setDoc(doc(db, 'partners', partnerRecord.id), partnerRecord, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `partners/${partnerRecord.id}`);
      });
    }

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

  const updateUserRole = async (_uid: string, _role: UserRole) => {
    throw new Error('Access must be provisioned by an administrator.');
  };

  const deleteUser = async (uid: string) => {
    if (!uid || uid === currentUser.uid || internalRole !== 'admin') return;
    await setDoc(doc(db, 'users', uid), {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      isApproved: false,
    }, { merge: true });
    setAvailableUsers((previous) => previous.filter((user) => user.uid !== uid));
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

  const updateCurrentUserProfile = async (updates: Partial<AppUser>) => {
    if (!currentUser?.uid) return;
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    try {
      localStorage.setItem('hearthaway_current_user_profile', JSON.stringify(updated));
      if (updated.uid) {
        localStorage.setItem('hearthaway_auth_uid', updated.uid);
      }
    } catch (e) {}

  };

  const loginWithUser = (_user: AppUser) => {
    throw new Error('Sign in with your Firebase account.');
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
          profile = {
            uid: user.uid,
            email: userEmail,
            displayName: user.displayName || 'Authenticated User',
            role: 'partner',
            avatarUrl: user.photoURL || undefined,
          };
          await setDoc(userRef, profile);
        }
      } catch {
        profile = {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || 'Authenticated User',
          role: 'partner',
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
          profile = {
            uid: fbUser.uid,
            email: cleanEmail,
            displayName: fbUser.displayName || cleanEmail.split('@')[0],
            role: 'partner',
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
          console.warn('[v0] Firebase sign-in rejected:', err);
          throw new Error('Invalid email or password.');
        }
      }

    throw new Error('Enter your Firebase email and password to sign in.');
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

    if (!isAuthenticated || !currentUser?.uid || auth.currentUser?.uid !== currentUser.uid || firebaseSessionUid !== currentUser.uid) {
      return { allowed: false, requiredRoles: [], reason: 'unauthenticated' };
    }

    const role = currentUser.role;

    const isInternal = internalRole === 'admin' || internalRole === 'management';
    if (path.startsWith('/finance') || path.startsWith('/internal/finance') || path.startsWith('/management')) {
      const allowed = internalRole === 'admin';
      return { allowed, requiredRoles: ['admin'], reason: allowed ? undefined : 'insufficient_role' };
    }
    if (path.startsWith('/activity') || path.startsWith('/sales') || path.startsWith('/internal/sales') || path.startsWith('/archive') || path.startsWith('/portfolio') || path.startsWith('/internal/management')) {
      return { allowed: isInternal, requiredRoles: ['admin', 'management'], reason: isInternal ? undefined : 'insufficient_role' };
    }
    if (path.startsWith('/partners') || path.startsWith('/partner')) {
      const allowed = isInternal || role === 'partner';
      return { allowed, requiredRoles: ['admin', 'management', 'partner'], reason: allowed ? undefined : 'insufficient_role' };
    }
    return { allowed: false, requiredRoles: [], reason: 'insufficient_role' };
  };

  const buildActivity = (
    studentId: string,
    activityType: string,
    description: string,
    oldValue?: string,
    newValue?: string
  ): Activity => {
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const actId = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      id: actId,
      activityId: `ACT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId,
      timestamp: formattedTimestamp,
      performedBy: {
        userId: currentUser.uid || 'system',
        name: (internalRole && leadOwnerOptions.find((owner) => owner.uid === currentUser.uid)?.displayName) || currentUser.displayName || '',
        role: internalRole && leadOwnerOptions.some((owner) => owner.uid === currentUser.uid) ? internalRole : (['admin', 'management'].includes(currentUser.role) ? 'unverified' : currentUser.role),
      },
      activityType,
      description,
      ...(typeof oldValue === 'string' ? { oldValue } : {}),
      ...(typeof newValue === 'string' ? { newValue } : {}),
    };

  };

  const logStudentActivity = async (
    studentId: string, activityType: string, description: string, oldValue?: string, newValue?: string
  ): Promise<void> => {
    const newActivity = buildActivity(studentId, activityType, description, oldValue, newValue);
    const relatedStudent = students.find((student) => student.studentId === studentId || student.id === studentId);
    await persistLeadActivity(db, newActivity, relatedStudent);
  };

  const reassignPartnerPortfolioOwner = async (partnerId: string, newOwnerId: string, newOwnerName: string) => {
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (!partner) throw new Error('This partner is no longer available.');
    const reference = doc(db, 'partners', partner.id || `part-${partner.partnerId.toLowerCase()}`);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('This partner is no longer available.');
      const current = snapshot.data() as Partner;
      if (current.portfolioOwnerId === newOwnerId) return;
      const previousName = current.portfolioOwnerName || 'Unassigned';
      const activity = buildActivity(
        current.partnerId, 'Partner Portfolio Owner Reassigned',
        `Partner "${current.companyName}" reassigned from ${previousName} to ${newOwnerName}.`,
        previousName, newOwnerName
      );
      transaction.update(reference, {
        portfolioOwnerId: newOwnerId, portfolioOwnerName: newOwnerName,
        assignedManagerId: newOwnerId, assignedManagerName: newOwnerName,
      });
      writeActivity(transaction, db, activity);
    });
  };

  const updateLeadOwner = async (studentId: string, kind: 'lead' | 'sales', ownerId: string, ownerName: string) => {
    const student = students.find((entry) => entry.studentId === studentId);
    if (!student || !['admin', 'management', 'sales'].includes(currentUser.role)) throw new Error('You cannot assign this lead.');
    const nextName = ownerId ? ownerName : 'Unassigned';
    const label = kind === 'sales' ? 'Sales Owner' : 'Lead Owner';
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, 'students', student.id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('This lead is no longer active.');
      const current = snapshot.data() as Student;
      const previous = kind === 'sales' ? { id: current.salesOwnerId, name: current.salesOwnerName } : getLeadOwner(current);
      if ((previous.id || '') === ownerId) return;
      const activity = buildActivity(studentId, `${label} Changed`, `${label} changed.`, previous.name || 'Unassigned', nextName);
      const changes = kind === 'sales' ? { salesOwnerId: ownerId, salesOwnerName: nextName } : {
        leadOwnerId: ownerId, leadOwnerName: nextName,
        // Keep compatibility with clients still reading the old field during rollout.
        assignedSalesExecutiveId: ownerId, assignedSalesExecutiveName: nextName,
      };
      transaction.update(reference, { ...changes, updatedAt: activity.timestamp });
      writeActivity(transaction, db, activity);
    });
  };

  const reassignLeadOwner = (studentId: string, id: string, name: string) => updateLeadOwner(studentId, 'lead', id, name);
  const assignSalesOwner = (studentId: string, id: string, name: string) => updateLeadOwner(studentId, 'sales', id, name);

  const onboardNewPartner = async (partnerData: any): Promise<Partner> => {
    const normalizedEmail = String(partnerData.email || '').toLowerCase().trim();
    const existingPartner = partners.find((partner) =>
      (normalizedEmail && partner.email.toLowerCase().trim() === normalizedEmail) ||
      (partnerData.companyName && partner.companyName.toLowerCase().trim() === String(partnerData.companyName).toLowerCase().trim())
    );
    if (existingPartner) throw new Error('A partner with this name or email already exists.');

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
      agreementTerms: partnerData.agreementTerms || '40% Commission, 120-day payment window',
      agreementSignedDate: partnerData.agreementSignedDate || new Date().toISOString().split('T')[0],
      agreementExpiryDate: partnerData.agreementExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      agreementDocumentUrl: partnerData.agreementDocumentUrl || '',
      status: partnerData.status || 'Active',
      onboardingDate: partnerData.onboardingDate || new Date().toISOString().split('T')[0],
      commissionRate: partnerData.commissionRate || 20,
      ...partnerData,
    };

  await setDoc(doc(db, 'partners', docId), newPartner).catch((err) => {
  handleFirestoreError(err, OperationType.WRITE, `partners/${docId}`);
  throw err;
  });

    logStudentActivity(
      partnerIdStr,
      'Partner Onboarded',
      `New partner "${newPartner.companyName}" (${partnerIdStr}) onboarded under Portfolio Owner ${newPartner.portfolioOwnerName} with ${newPartner.agreementType}.`
    );

    return newPartner;
  };

  const updatePartner = async (partnerId: string, updates: Partial<Partner>, agreementFile?: File): Promise<void> => {
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} was not found. Refresh the partners page and try again.`);
    }

    const docId = partner.id || `part-${partner.partnerId.toLowerCase()}`;
    try {
      const partnerRef = doc(db, 'partners', docId);
      const fields = agreementFile ? { ...updates, agreementDocumentUrl: agreementFile.name } : updates;
      if (agreementFile) {
        const batch = writeBatch(db);
        batch.set(partnerRef, fields, { merge: true });
        batch.set(doc(db, 'partnerAgreements', docId), {
          name: agreementFile.name,
          bytes: Bytes.fromUint8Array(new Uint8Array(await agreementFile.arrayBuffer())),
        });
        await batch.commit();
      } else {
        await setDoc(partnerRef, fields, { merge: true });
      }
      setPartners((previous) => previous.map((item) => item.partnerId === partner.partnerId ? { ...item, ...fields } : item));
      logStudentActivity(
        partner.partnerId,
        'Partner Updated',
        `Partner "${partner.companyName}" (${partner.partnerId}) profile / agreement terms updated by ${currentUser.displayName}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `partners/${docId}`);
    }
  };

  const getPartnerAgreement = async (partnerId: string) => {
    const partner = partners.find((item) => item.partnerId === partnerId);
    if (!partner) return null;
    const snapshot = await getDoc(doc(db, 'partnerAgreements', partner.id || `part-${partner.partnerId.toLowerCase()}`));
    const file = snapshot.data();
    if (!file || !(file.bytes instanceof Bytes) || typeof file.name !== 'string') return null;

    const bytes = Uint8Array.from(file.bytes.toUint8Array()).buffer;
    return { name: file.name, bytes };
  };

  const deletePartner = async (partnerId: string): Promise<void> => {
    const partner = partners.find((p) => p.partnerId === partnerId || p.id === partnerId);
    if (!partner) throw new Error(`Partner ${partnerId} was not found.`);

    const docId = partner.id || `part-${partner.partnerId.toLowerCase()}`;
    await deleteDoc(doc(db, 'partners', docId));
    setPartners((previous) => previous.filter((p) => p.id !== docId && p.partnerId !== partner.partnerId));
  };

  const intakeLock = doc(db, 'leadOperations', 'intake');

  function resolveLeadPartner(partnerId?: string) {
    if (currentUser.role === 'partner') {
      if (!currentUser.partnerId) throw new Error('Your account has no linked partner.');
      return partners.find((partner) => partner.partnerId === currentUser.partnerId) ??
        { partnerId: currentUser.partnerId, companyName: currentUser.partnerName || 'Partner agency' };
    }
    if (!['management', 'admin', 'sales'].includes(currentUser.role)) throw new Error('You cannot submit new leads.');
    if (!partnerId || partnerId === 'direct') return { partnerId: 'direct', companyName: 'Direct lead' };
    const partner = partners.find((entry) => entry.partnerId === partnerId);
    if (!partner) throw new Error('The selected partner is no longer available.');
    return partner;
  }

  async function getActiveLeads() {
    const snapshot = await getDocsFromServer(collection(db, 'students'));
    return snapshot.docs.flatMap((entry) => {
      const lead = entry.data() as Student;
      return lead.archivalStatus === 'Archived' ? [] : [{ ...lead, id: entry.id }];
    });
  }

  function makeLead(details: LeadDetails, partner: { partnerId: string; companyName: string }, existing: Student[], bulk: boolean) {
    const id = doc(collection(db, 'students')).id;
    const usedIds = new Set(existing.map((lead) => lead.studentId));
    const year = new Date().getFullYear();
    let studentId: string;
    do {
      studentId = `HA-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
    } while (usedIds.has(studentId));
    const [firstName, ...names] = details.fullName.split(/\s+/);
    const activity = buildActivity(studentId, 'Lead Submitted', `${bulk ? 'Lead imported from CSV' : 'Lead created individually'}. Source: ${partner.companyName} (${partner.partnerId}).`);
    const record: Student = {
      id, studentId, firstName, lastName: names.join(' '), fullName: details.fullName,
      email: details.email, phone: details.phone, whatsApp: details.whatsApp || details.phone,
      nationality: details.nationality || '', currentCountry: details.currentCountry || '',
      university: details.university, course: details.course || '', intake: details.intake,
      destinationCountry: details.destinationCountry, destinationCity: details.destinationCity,
      moveInDate: details.moveInDate, moveOutDate: details.moveOutDate || '',
      budget: details.budget, currency: details.currency || 'GBP',
      preferredRoom: details.preferredRoom || '', accommodationPreference: details.accommodationPreference || '',
      occupants: details.occupants ?? 1, passportStatus: details.passportStatus || 'Pending Verification',
      leadSource: details.leadSource || (partner.partnerId === 'direct' ? 'Direct' : 'Study Abroad Consultants'),
      partnerId: partner.partnerId, partnerName: partner.companyName,
      assignedSalesExecutiveId: '', assignedSalesExecutiveName: 'Unassigned',
      leadOwnerId: '', leadOwnerName: 'Unassigned', salesOwnerId: '', salesOwnerName: 'Unassigned',
      pipelineStage: 'New', leadStatus: 'New', accommodationStatus: 'Requirement Pending',
      bookingStatus: 'Not Started', moveInStatus: 'Upcoming', commissionStatus: 'Pending',
      priority: bulk ? 'Medium' : 'High', nextFollowUpAt: details.nextFollowUpAt || 'Within 2 hours',
      lastContactAt: 'Never', createdAt: activity.timestamp, updatedAt: activity.timestamp,
      notes: details.notes || '', isTestRecord: false, archivalStatus: 'Active',
    };
    return { record, activity };
  }

  const bulkImportPartnerLeads = async (incoming: LeadDetails[], partnerId?: string) => {
    const partner = resolveLeadPartner(partnerId);
    const result: BulkLeadImportResult = {
      importedCount: 0, duplicatesCount: 0, invalidCount: 0, retryRows: [], failureCodes: [],
    };
    const failureCodes = new Set<string>();
    for (let offset = 0; offset < incoming.length; offset += 100) {
      const chunk = incoming.slice(offset, offset + 100);
      try {
        const committed = await runTransaction(db, async (transaction) => {
          await transaction.get(intakeLock);
          const existing = await getActiveLeads();
          const saved: Student[] = [];
          let duplicates = 0;
          let invalid = 0;
          for (const item of chunk) {
            const parsed = leadDetailsSchema.safeParse(item);
            if (!parsed.success) { invalid++; continue; }
            if (leadConflictMessage(leadContactConflicts(parsed.data, existing))) { duplicates++; continue; }
            const { record, activity } = makeLead(parsed.data, partner, existing, true);
            transaction.set(doc(db, 'students', record.id), record);
            writeActivity(transaction, db, activity);
            existing.push(record);
            saved.push(record);
          }
          if (saved.length) transaction.set(intakeLock, { updatedAt: serverTimestamp() });
          return { saved, duplicates, invalid };
        });
        result.importedCount += committed.saved.length;
        result.duplicatesCount += committed.duplicates;
        result.invalidCount += committed.invalid;
      } catch (cause) {
        const code = cause instanceof FirebaseError ? cause.code : 'unexpected-error';
        failureCodes.add(code);
        result.retryRows.push(...chunk);
        console.error('Lead CSV import batch failed', { code, rowCount: chunk.length });
      }
    }
    return { ...result, failureCodes: [...failureCodes] };
  };

  const submitPartnerLead = async (lead: LeadDetails, partnerId?: string) => {
    const details = leadDetailsSchema.parse(lead);
    const partner = resolveLeadPartner(partnerId);
    return runTransaction(db, async (transaction) => {
      await transaction.get(intakeLock);
      const existing = await getActiveLeads();
      const conflict = leadConflictMessage(leadContactConflicts(details, existing));
      if (conflict) throw new Error(conflict);
      const { record, activity } = makeLead(details, partner, existing, false);
      transaction.set(doc(db, 'students', record.id), record);
      writeActivity(transaction, db, activity);
      transaction.set(intakeLock, { updatedAt: serverTimestamp() });
      return record;
    });
  };

  const editLeadDetails = async (studentId: string, details: LeadDetails) => {
    const { fullName, ...fields } = leadEditSchema.parse(details);
    const [firstName, ...names] = fullName.split(/\s+/);
    const lead = students.find((entry) => entry.studentId === studentId);
    if (!lead) throw new Error('This lead is no longer active.');
    await runTransaction(db, async (transaction) => {
      await transaction.get(intakeLock);
      const reference = doc(db, 'students', lead.id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('This lead is no longer active.');
      const current = snapshot.data() as Student;
      const partner = partners.find((entry) => entry.partnerId === current.partnerId);
      const role = currentUser.role;
      if (!['admin', 'management', 'sales'].includes(role) &&
          !(role === 'partner' && currentUser.partnerId === current.partnerId) &&
          !(role === 'portfolio_owner' && partner?.portfolioOwnerId === currentUser.uid)) {
        throw new Error('You cannot edit this lead.');
      }
      const changedEmail = fields.email !== (current.email || '').trim().toLowerCase();
      const changedPhone = fields.phone !== String(current.phone ?? '').trim();
      const changedWhatsApp = fields.whatsApp !== undefined && fields.whatsApp !== String(current.whatsApp ?? '').trim();
      if (changedEmail && !leadDetailsSchema.shape.email.safeParse(fields.email).success) {
        throw new Error('Enter a valid email address.');
      }
      const phone = normalizeLeadPhone(fields.phone);
      if (changedPhone && !phone) throw new Error('Enter a complete phone number using the original digits.');
      const whatsApp = fields.whatsApp ? normalizeLeadPhone(fields.whatsApp) : '';
      if (changedWhatsApp && whatsApp === null) throw new Error('Enter a complete WhatsApp number or leave it blank.');
      if (changedEmail || (changedPhone && phone !== normalizeLeadPhone(current.phone))) {
        const conflicts = leadContactConflicts(fields, (await getActiveLeads()).filter((entry) => entry.id !== lead.id));
        const message = leadConflictMessage({ email: changedEmail && conflicts.email, phone: changedPhone && conflicts.phone });
        if (message) throw new Error(message);
      }
      const updates = {
        ...fields,
        phone: changedPhone ? phone : undefined,
        whatsApp: changedWhatsApp ? whatsApp : undefined,
        fullName, firstName, lastName: names.join(' '),
      };
      const changed = Object.fromEntries(Object.entries(updates).filter(([key, value]) =>
        value !== undefined && value !== current[key as keyof Student]));
      if (!Object.keys(changed).length) return;
      const activity = buildActivity(studentId, 'Lead Details Updated', `Edited fields: ${Object.keys(changed).join(', ')}.`);
      transaction.update(reference, { ...changed, updatedAt: activity.timestamp });
      writeActivity(transaction, db, activity);
      transaction.set(intakeLock, { updatedAt: serverTimestamp() });
    });
  };

  const archiveLead = async (studentId: string, reason: string) => {
    const lead = students.find((entry) => entry.studentId === studentId);
    if (!lead || !reason.trim() || leadOperationsRole !== 'management') throw new Error('Management access and an archival reason are required.');
    await runTransaction(db, async (transaction) => {
      await transaction.get(intakeLock);
      const source = doc(db, 'students', lead.id);
      const snapshot = await transaction.get(source);
      if (!snapshot.exists()) throw new Error('This lead is no longer active.');
      const activity = buildActivity(studentId, 'Lead Archived', 'Lead moved to the data archive.');
      transaction.set(doc(db, 'archivedStudents', lead.id), {
        ...snapshot.data(), id: lead.id, leadStatus: 'Inactive', archivalStatus: 'Archived',
        archivalReason: reason.trim(), archivedAt: new Date().toISOString(), archivedBy: currentUser.uid,
      });
      transaction.delete(source);
      writeActivity(transaction, db, activity);
      transaction.set(intakeLock, { updatedAt: serverTimestamp() });
    });
    setSelectedStudentId(null);
  };

  const setPartnerLeadTarget = async (partnerId: string, season: string, promised: number) => {
    const partner = partners.find((entry) => entry.partnerId === partnerId);
    if (!partner || leadOperationsRole !== 'management') {
      throw new Error('You cannot edit this target.');
    }
    if (!intakeKey(season) || !Number.isSafeInteger(promised) || promised < 0) throw new Error('Enter a season and a whole number of leads.');
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, 'partners', partner.id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('This partner is no longer available.');
      const stored = snapshot.data() as Partner;
      const targets = (stored.leadTargets || []).filter((target) => intakeKey(target.season) !== intakeKey(season));
      transaction.update(reference, { leadTargets: [...targets, { season: season.trim(), promised }] });
    });
  };

  const updateStudentDecoupledStatus = async (
    studentId: string,
    updates: {
      pipelineStage?: PipelineStage;
      exitReason?: ExitReason;
      priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
      nextFollowUpAt?: string;
      notes?: string;
      propertyName?: string;
      providerType?: 'PBSA' | 'HMO' | 'Landlord';
      tenancyDuration?: string;
      rentAmount?: number;
      rentPaymentPeriod?: 'Weekly' | 'Monthly' | 'Termly' | 'Annual';
      commissionable?: boolean;
      leadStatus?: LeadStatus;
      accommodationStatus?: AccommodationStatus;
      bookingStatus?: BookingStatus;
      moveInStatus?: MoveInStatus;
      commissionStatus?: CommissionStatus;
    }
  ) => {
    const student = students.find((s) => s.studentId === studentId || s.id === studentId);
    if (!student) throw new Error('This lead is no longer active.');
    const reference = doc(db, 'students', student.id || `std-${student.studentId.toLowerCase()}`);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('This lead is no longer active.');
      const current = snapshot.data() as Student;
      const auditFields = [
        ['pipelineStage', 'Pipeline Stage', 'pipeline', 'New'],
        ['priority', 'Priority', 'priority', 'Medium'],
        ['accommodationStatus', 'Accommodation Status', 'Accommodation Status'],
        ['bookingStatus', 'Booking Status', 'Booking Status'],
        ['moveInStatus', 'Move-in Status', 'Move-in Status'],
        ['commissionStatus', 'Commission Status', 'Commission Status'],
      ] as const;
      for (const [field, label, description, fallback] of auditFields) {
        const previous = current[field] || fallback;
        const next = updates[field];
        if (!next || next === previous) continue;
        const activity = buildActivity(
          student.studentId, `${label} Change`,
          `Changed ${description} from "${previous}" to "${next}"`, previous, next
        );
        writeActivity(transaction, db, activity);
      }
      transaction.update(reference, { ...updates, updatedAt: new Date().toISOString() });
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
      assignedEmployeeId: student ? student.salesOwnerId || getLeadOwner(student).id : '',
      assignedEmployeeName: student ? student.salesOwnerName || getLeadOwner(student).name : '',
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

    if (!student) throw new Error('This lead is no longer active.');
    const activity = buildActivity(
      bookingData.studentId,
      'Property Booking Recorded',
      `Property booking ${bookingId} (${bookingData.propertyName}) recorded by ${currentUser.displayName}. Rent: ${bookingData.rentCurrency} ${bookingData.rentAmount} / ${bookingData.rentFrequency}, Deposit: ${bookingData.depositCurrency} ${bookingData.depositAmount}, Expected Revenue: ${bookingData.commissionableCurrency} ${expectedRevenue.toFixed(2)} (${bookingData.commissionRate}%). Status: ${bookingData.bookingStatus}.`
    );
    await persistNewBooking(db, newBooking, student, activity, buildActivity);

    return newBooking;
  };

  const updatePropertyBooking = async (
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<void> => {
    const booking = bookings.find((b) => b.bookingId === bookingId || b.id === bookingId);
    if (!booking) throw new Error('This booking is no longer available.');

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

    const activity = buildActivity(
      booking.studentId,
      'Property Booking Updated',
      `Property booking ${bookingId} (${updates.propertyName || booking.propertyName}) updated by ${currentUser.displayName}. Status: ${updates.bookingStatus || booking.bookingStatus}. Expected Revenue: ${updates.commissionableCurrency || booking.commissionableCurrency} ${expectedRevenue.toFixed(2)}.`
    );
    const student = students.find(entry => entry.studentId === booking.studentId);
    await persistBookingEdit(db, booking, fieldsToUpdate, activity, student);
  };

  const uploadPaymentTransaction = async (data: {
    studentId: string;
    bookingId?: string;
    bookingReference?: string;
    amount: number;
    rateToInr: number;
    amountInr: number;
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
      ...validateConversion(data.amount, data.currency, data.rateToInr, data.amountInr),
      amount: data.amount,
      currency: (data.currency?.toUpperCase() || 'GBP') as any,
      paymentDate: now.toISOString().split('T')[0],
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Pending Verification',
      screenshotUrl: primaryAttachmentUrl,
      attachments: data.attachments || [],
      ...(data.proofBypassReason ? {
        proofBypassReason: data.proofBypassReason,
        proofBypassedBy: `${currentUser.displayName} (${currentUser.role})`,
      } : {}),
      uploadedBy: currentUser.displayName,
      uploadedRole: currentUser.role,
      uploadedTimestamp: formattedTimestamp,
      remarks: data.remarks || 'Payment proof submitted for booking reservation.',
      ...(student?.partnerId !== undefined ? { partnerId: student.partnerId } : {}),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'payments', docId), newPayment);
    if (student) {
      const studentDocId = student.id || `std-${student.studentId.toLowerCase()}`;
      batch.update(doc(db, 'students', studentDocId), {
        pipelineStage: 'Payment',
        updatedAt: formattedTimestamp,
      });
    }
    await batch.commit().catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `payments/${docId}`);
      throw err;
    });

    if (student && student.pipelineStage !== 'Payment') {
      const previousStage = student.pipelineStage || 'New';
      void logStudentActivity(
        student.studentId,
        'Pipeline Stage Change',
        `Changed pipeline from "${previousStage}" to "Payment"`,
        previousStage,
        'Payment'
      ).catch(() => {});
    }

    if (data.proofBypassReason) {
      void logStudentActivity(
        data.studentId,
        'Payment Proof Bypassed',
        `Management proof requirement bypassed for payment ${paymentId} (${data.currency} ${data.amount}, ${conversionText(newPayment)}) by ${currentUser.displayName} (${currentUser.role}). Recorded Exception Reason: "${data.proofBypassReason}".`
      ).catch(() => {});
    }

    void logStudentActivity(
      data.studentId,
      'Payment Uploaded',
      `Payment proof ${paymentId} of ${data.currency} ${data.amount}, ${conversionText(newPayment)} recorded by ${currentUser.displayName} with ${data.attachments?.length || 0} file attachment(s). Status: Pending Verification.`
    ).catch(() => {});

    return newPayment;
  };

  const verifyPaymentTransaction = async (
    paymentId: string,
    decision: 'Verified' | 'Rejected',
    remarks?: string
  ): Promise<void> => {
    const payment = payments.find((p) => p.paymentId === paymentId || p.id === paymentId);
    if (!payment) throw new Error('This payment is no longer available.');

    const docId = payment.id || `pay-${payment.paymentId.toLowerCase()}`;
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const paymentRef = doc(db, 'payments', docId);
    const student = students.find(entry => entry.studentId === payment.studentId);
    const studentRef = student && decision === 'Verified' ? doc(db, 'students', student.id) : null;
    await runTransaction(db, async transaction => {
      const stored = (await transaction.get(paymentRef)).data() as Payment | undefined;
      if (!stored || stored.paymentStatus !== 'Pending Verification') throw new Error('Payment already reviewed or unavailable.');
      const lead = studentRef ? (await transaction.get(studentRef)).data() as Student | undefined : undefined;
      const audit = buildActivity(stored.studentId, `Payment ${decision}`,
        `Payment ${stored.paymentId} (${stored.currency} ${stored.amount}, ${conversionText(stored)}) was ${decision.toLowerCase()} by ${currentUser.displayName}. ${remarks || ''}`,
        stored.paymentStatus, decision);
      writeActivity(transaction, db, audit);
      transaction.update(paymentRef, {
        paymentStatus: decision, verifiedBy: `${currentUser.displayName} (${currentUser.role})`,
        verificationTimestamp: formattedTimestamp, remarks: remarks ? [stored.remarks, remarks].filter(Boolean).join(' | ') : stored.remarks || '',
      });
      if (lead && studentRef) {
        for (const [label, previous, next] of [['Booking Status', lead.bookingStatus, 'Booked'], ['Commission Status', lead.commissionStatus, 'Due']]) {
          if (previous === next) continue;
          const change = buildActivity(stored.studentId, label + ' Change', `Changed ${label} from "${previous || 'Unset'}" to "${next}"`, previous, next);
          writeActivity(transaction, db, change);
        }
        transaction.update(studentRef, { bookingStatus: 'Booked', commissionStatus: 'Due', updatedAt: formattedTimestamp, lastActivityAt: formattedTimestamp });
      } else if (student) {
        transaction.update(doc(db, 'students', student.id), { lastActivityAt: formattedTimestamp });
      }
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
        activityError,
        reassignPartnerPortfolioOwner,
        reassignLeadOwner,
        assignSalesOwner,
        editLeadDetails,
        archiveLead,
        leadOperationsRole,
        internalRole,
        leadOwnerOptions,
        portfolioOwnerOptions,
        setPartnerLeadTarget,
        bulkImportPartnerLeads,
        onboardNewPartner,
        updatePartner,
        getPartnerAgreement,
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
