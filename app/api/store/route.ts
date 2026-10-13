import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import {
  INITIAL_BOOKINGS,
  INITIAL_PAYMENTS,
  INITIAL_ACTIVITIES,
  INITIAL_STUDENTS,
} from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'app-store.json');

interface AppStore {
  bookings: any[];
  payments: any[];
  activities: any[];
  students: any[];
  partners: any[];
  lastUpdated: string;
}

async function getOrInitStore(): Promise<AppStore> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      bookings: parsed.bookings || [],
      payments: parsed.payments || [],
      activities: parsed.activities || [],
      students: parsed.students || [],
      partners: parsed.partners || [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    // Initialize default store
    const initialStore: AppStore = {
      bookings: [],
      payments: [],
      activities: [],
      students: [],
      partners: [],
      lastUpdated: new Date().toISOString(),
    };
    await writeFile(STORE_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
    return initialStore;
  }
}

async function saveStore(store: AppStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  store.lastUpdated = new Date().toISOString();
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const store = await getOrInitStore();
    return NextResponse.json(store);
  } catch (err: any) {
    console.error('Error fetching persistent store:', err);
    return NextResponse.json({ error: 'Failed to read store' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const store = await getOrInitStore();

    switch (action) {
      case 'save_booking': {
        const booking = payload;
        const existingIdx = store.bookings.findIndex(
          (b) => b.bookingId === booking.bookingId || b.id === booking.id
        );
        if (existingIdx >= 0) {
          store.bookings[existingIdx] = { ...store.bookings[existingIdx], ...booking };
        } else {
          store.bookings = [booking, ...store.bookings];
        }
        break;
      }

      case 'save_payment': {
        const payment = payload;
        const existingIdx = store.payments.findIndex(
          (p) => p.paymentId === payment.paymentId || p.id === payment.id
        );
        if (existingIdx >= 0) {
          store.payments[existingIdx] = { ...store.payments[existingIdx], ...payment };
        } else {
          store.payments = [payment, ...store.payments];
        }
        break;
      }

      case 'save_activity': {
        const activity = payload;
        store.activities = [activity, ...store.activities];
        break;
      }

      case 'sync_all': {
        if (payload.bookings) store.bookings = payload.bookings;
        if (payload.payments) store.payments = payload.payments;
        if (payload.activities) store.activities = payload.activities;
        if (payload.students) store.students = payload.students;
        break;
      }

      case 'flag_test_records': {
        const timestamp = new Date().toISOString();
        const flaggedBy = payload?.flaggedBy || 'Management System Audit';

        // Helper to check if a student is a test lead
        const isTestStudent = (s: any) => {
          if (s.isTestRecord) return true;
          const email = (s.email || '').toLowerCase();
          const notes = (s.notes || '').toLowerCase();
          const fullName = (s.fullName || '').toLowerCase();
          return (
            email.includes('example.com') ||
            email.includes('test') ||
            notes.includes('test') ||
            notes.includes('csv') ||
            notes.includes('imported via csv') ||
            fullName.includes('test')
          );
        };

        let flaggedCount = 0;

        store.students = (store.students || []).map((s: any) => {
          if (isTestStudent(s)) {
            flaggedCount++;
            return {
              ...s,
              isTestRecord: true,
              archivalStatus: 'Flagged For Archival',
              archivalTag: s.archivalTag || 'CSV & Permission Test',
              archivalReason:
                s.archivalReason ||
                'Created/validated during CSV import & role permissions verification',
              flaggedAt: s.flaggedAt || timestamp,
              flaggedBy: s.flaggedBy || flaggedBy,
            };
          }
          return s;
        });

        store.payments = (store.payments || []).map((p: any) => {
          const isTestPayment =
            p.isTestRecord ||
            !!p.proofBypassReason ||
            (p.remarks || '').toLowerCase().includes('test') ||
            store.students.some(
              (s: any) => s.isTestRecord && (s.studentId === p.studentId || s.fullName === p.studentName)
            );
          if (isTestPayment) {
            flaggedCount++;
            return {
              ...p,
              isTestRecord: true,
              archivalStatus: 'Flagged For Archival',
              archivalTag: p.archivalTag || 'Payment Test Validation',
              archivalReason:
                p.archivalReason ||
                'Recorded during payment evidence & role permission testing',
              flaggedAt: p.flaggedAt || timestamp,
              flaggedBy: p.flaggedBy || flaggedBy,
            };
          }
          return p;
        });

        store.bookings = (store.bookings || []).map((b: any) => {
          const isTestBooking =
            b.isTestRecord ||
            (b.notes || '').toLowerCase().includes('test') ||
            store.students.some(
              (s: any) => s.isTestRecord && (s.studentId === b.studentId || s.fullName === b.studentName)
            );
          if (isTestBooking) {
            flaggedCount++;
            return {
              ...b,
              isTestRecord: true,
              archivalStatus: 'Flagged For Archival',
              archivalTag: b.archivalTag || 'Booking Test Validation',
              archivalReason:
                b.archivalReason || 'Recorded during property booking workflow testing',
              flaggedAt: b.flaggedAt || timestamp,
              flaggedBy: b.flaggedBy || flaggedBy,
            };
          }
          return b;
        });
        break;
      }

      case 'flag_record': {
        const { type, id, isTestRecord, archivalStatus, archivalTag, archivalReason, flaggedBy } =
          payload;
        const timestamp = new Date().toISOString();

        const updateList = (list: any[]) =>
          (list || []).map((item) => {
            if (item.id === id || item.studentId === id || item.paymentId === id || item.bookingId === id) {
              return {
                ...item,
                isTestRecord: isTestRecord !== undefined ? isTestRecord : true,
                archivalStatus: archivalStatus || (isTestRecord ? 'Flagged For Archival' : 'Active'),
                archivalTag: archivalTag || 'Manual Archival Flag',
                archivalReason: archivalReason || 'Flagged manually for archival',
                flaggedAt: timestamp,
                flaggedBy: flaggedBy || 'Authorized Manager',
              };
            }
            return item;
          });

        if (type === 'student') store.students = updateList(store.students);
        if (type === 'payment') store.payments = updateList(store.payments);
        if (type === 'booking') store.bookings = updateList(store.bookings);
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await saveStore(store);
    return NextResponse.json({ success: true, store });
  } catch (err: any) {
    console.error('Error saving to persistent store:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to save store' },
      { status: 500 }
    );
  }
}
