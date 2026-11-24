import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDocFromServer, getFirestore, terminate } from 'firebase/firestore';
import { persistBookingEdit, persistLeadActivity, persistNewBooking } from '../lib/crm-record-writes';
import type { Activity, Booking, Student } from '../lib/types';

// Only ever connect to the disposable demo project and loopback emulators.
async function run() {
  const app = initializeApp({ projectId: 'demo-hearthaway-qa', apiKey: 'local-qa-only' });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:49199', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 48081);
  try {
    const { user } = await signInWithEmailAndPassword(auth, 'qa-sales@example.invalid', 'only-local-fixtures');
    const studentRef = doc(db, 'students', 'qa-legacy-lead');
    const student = (await getDocFromServer(studentRef)).data() as Student;
    assert.ok(student);
    const activity = (studentId: string, activityType: string, description: string, previous?: string, next?: string): Activity => ({
      id: `qa-${randomUUID()}`, activityId: `ACT-${randomUUID()}`, studentId, timestamp: new Date().toISOString(),
      performedBy: { userId: user.uid, name: 'QA Sales', role: 'sales' }, activityType, description,
      ...(previous === undefined ? {} : { oldValue: previous }), ...(next === undefined ? {} : { newValue: next }),
    });
    const booking = { id: `qa-${randomUUID()}`, bookingId: 'QA-BOOKING', studentId: student.studentId, bookingStatus: 'Confirmed', propertyName: 'QA Property' } as Booking;
    const note = activity(student.studentId, 'Internal Note Added', 'QA note');
    await persistLeadActivity(db, note, student);
    assert.ok((await getDocFromServer(doc(db, 'activities', note.id))).exists());
    assert.equal((await getDocFromServer(studentRef)).data()?.lastActivityAt, note.timestamp);

    const recorded = activity(student.studentId, 'Property Booking Recorded', 'QA booking');
    await persistNewBooking(db, booking, student, recorded, activity);
    assert.equal((await getDocFromServer(doc(db, 'bookings', booking.id))).data()?.bookingStatus, 'Confirmed');
    assert.equal((await getDocFromServer(studentRef)).data()?.bookingStatus, 'Booked');
    assert.equal((await getDocFromServer(studentRef)).data()?.commissionStatus, 'Due');
    assert.ok((await getDocFromServer(doc(db, 'activities', recorded.id))).exists());

    const edited = activity(student.studentId, 'Property Booking Updated', 'QA edit');
    await persistBookingEdit(db, booking, { propertyName: 'Edited QA Property', notes: undefined }, edited, student);
    assert.equal((await getDocFromServer(doc(db, 'bookings', booking.id))).data()?.propertyName, 'Edited QA Property');
    assert.ok((await getDocFromServer(doc(db, 'activities', edited.id))).exists());
    assert.equal((await getDocFromServer(studentRef)).data()?.lastActivityAt, edited.timestamp);

    const missing = { ...student, id: 'qa-missing-lead' };
    const unsaved = activity(student.studentId, 'Internal Note Added', 'Must not persist');
    await assert.rejects(persistLeadActivity(db, unsaved, missing));
    assert.equal((await getDocFromServer(doc(db, 'activities', unsaved.id))).exists(), false);
    const failedBooking = { ...booking, id: 'qa-failed-booking' };
    const failedAudit = activity(student.studentId, 'Property Booking Recorded', 'Must not persist');
    await assert.rejects(persistNewBooking(db, failedBooking, missing, failedAudit, activity));
    assert.equal((await getDocFromServer(doc(db, 'bookings', failedBooking.id))).exists(), false);
    assert.equal((await getDocFromServer(doc(db, 'activities', failedAudit.id))).exists(), false);
    console.log('PASS: activity and booking writes are confirmed together; failed writes leave no partial note, booking or audit record.');
  } finally {
    await signOut(auth);
    await terminate(db);
    await deleteApp(app);
  }
}
void run().catch(error => { console.error(error); process.exitCode = 1; });
