import { Student, Partner, Booking, Payment, Activity, AppUser } from './types';

export const INITIAL_USERS: AppUser[] = [
  {
    uid: 'user-mgmt-001',
    email: 'emily@hearthaway.com',
    displayName: 'Emily Watson',
    role: 'management',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-po-001',
    email: 'beatrice@hearthaway.com',
    displayName: 'Beatrice Vance',
    role: 'portfolio_owner',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-po-002',
    email: 'marcus@hearthaway.com',
    displayName: 'Marcus Sterling',
    role: 'portfolio_owner',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-emp-001',
    email: 'harshul@hearthaway.com',
    displayName: 'Harshul Mehta',
    role: 'sales',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-emp-002',
    email: 'sara@hearthaway.com',
    displayName: 'Sara Jenkins',
    role: 'sales',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-fin-001',
    email: 'oliver@hearthaway.com',
    displayName: 'Oliver Ross',
    role: 'finance',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-partner-00482',
    email: 'consultant@globaledu.com',
    displayName: 'Vikram Malhotra',
    role: 'partner',
    partnerId: 'PART-00482',
    partnerName: 'Global Edu Pathways',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user-partner-00109',
    email: 'director@apexabroad.com',
    displayName: 'Rohan Deshmukh',
    role: 'partner',
    partnerId: 'PART-00109',
    partnerName: 'Apex Abroad Studies',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_PARTNERS: Partner[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_ACTIVITIES: Activity[] = [];
