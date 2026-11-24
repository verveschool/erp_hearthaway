import { doc, runTransaction, writeBatch, type Firestore } from 'firebase/firestore';
import type { Activity, Booking, Student } from './types';

type BuildActivity = (studentId: string, type: string, description: string, previous?: string, next?: string) => Activity;
const leadRef = (db: Firestore, student: Student) => doc(db, 'students', student.id || `std-${student.studentId.toLowerCase()}`);

export async function persistLeadActivity(db: Firestore, activity: Activity, student?: Student) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'activities', activity.id), activity);
  if (student && !/(status|stage|priority|owner reassigned|lead updated)/i.test(activity.activityType)) {
    batch.update(leadRef(db, student), { lastActivityAt: activity.timestamp });
  }
  await batch.commit();
}

export async function persistNewBooking(db: Firestore, booking: Booking, student: Student, activity: Activity, buildActivity: BuildActivity) {
  const studentRef = leadRef(db, student);
  await runTransaction(db, async transaction => {
    const lead = (await transaction.get(studentRef)).data() as Student | undefined;
    if (!lead) throw new Error('This lead is no longer active.');
    const updates: Partial<Student> = { lastActivityAt: activity.timestamp, updatedAt: new Date().toISOString() };
    if (booking.bookingStatus === 'Confirmed') { updates.bookingStatus = 'Booked'; updates.commissionStatus = 'Due'; }
    else if (booking.bookingStatus === 'Pending Confirmation') updates.bookingStatus = 'Processing';
    for (const [key, label] of [['bookingStatus', 'Booking Status'], ['commissionStatus', 'Commission Status']] as const) {
      if (!updates[key] || updates[key] === lead[key]) continue;
      const audit = buildActivity(student.studentId, `${label} Change`, `Changed ${label} from "${lead[key] || 'Unset'}" to "${updates[key]}"`, lead[key], updates[key]);
      transaction.set(doc(db, 'activities', audit.id), audit);
    }
    transaction.set(doc(db, 'bookings', booking.id), booking);
    transaction.set(doc(db, 'activities', activity.id), activity);
    transaction.update(studentRef, updates);
  });
}

export async function persistBookingEdit(db: Firestore, booking: Booking, fields: Partial<Booking>, activity: Activity, student?: Student) {
  const batch = writeBatch(db);
  const bookingRef = doc(db, 'bookings', booking.id || `bk-${booking.bookingId.toLowerCase()}`);
  batch.update(bookingRef, Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)));
  batch.set(doc(db, 'activities', activity.id), activity);
  if (student) batch.update(leadRef(db, student), { lastActivityAt: activity.timestamp });
  await batch.commit();
}
