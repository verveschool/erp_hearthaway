import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDocFromServer, getFirestore, serverTimestamp, setDoc, terminate, updateDoc } from 'firebase/firestore';

// This suite targets only the disposable demo project and loopback emulators.
async function run() {
  const app = initializeApp({ projectId: 'demo-hearthaway-qa', apiKey: 'local-qa-only' });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:49199', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 48081);
  const login = async (alias: string) => (await signInWithEmailAndPassword(auth, `${alias}@example.invalid`, 'only-local-fixtures')).user;
  const denied = async (operation: Promise<unknown>) => assert.rejects(operation, (error: { code?: string }) => error.code === 'permission-denied');
  try {
    const admin = await login('qa-admin');
    const manager = await login('qa-management');
    const validOwner = await login('qa-sales');
    const disabledOwner = await login('qa-disabled');
    const missingDirectoryOwner = await login('qa-no-directory');
    const partner = await login('qa-partner');
    const lead = doc(db, 'students', 'qa-access-lead');
    await setDoc(lead, { studentId: 'HA-2026-100002', fullName: 'QA Intake', intake: 'Sep-27', leadStatus: 'New', archivalStatus: 'Active' });
    assert.equal((await getDocFromServer(lead)).data()?.intake, 'Sep-27');
    await denied(updateDoc(lead, { leadOwnerId: validOwner.uid, assignedSalesExecutiveId: validOwner.uid }));
    await denied(getDocFromServer(doc(db, 'payments', 'private')));
    await denied(getDocFromServer(doc(db, 'activities', 'private')));
    await denied(getDocFromServer(doc(db, 'operationalActivities', 'private')));
    await denied(setDoc(doc(db, 'users', partner.uid), { role: 'admin' }, { merge: true }));

    await login('qa-management');
    await updateDoc(lead, { leadOwnerId: validOwner.uid, assignedSalesExecutiveId: validOwner.uid });
    await denied(updateDoc(lead, { leadOwnerId: disabledOwner.uid, assignedSalesExecutiveId: disabledOwner.uid }));
    await denied(updateDoc(lead, { leadOwnerId: missingDirectoryOwner.uid, assignedSalesExecutiveId: missingDirectoryOwner.uid }));
    await denied(updateDoc(lead, { leadOwnerId: validOwner.uid, assignedSalesExecutiveId: manager.uid }));
    await denied(getDocFromServer(doc(db, 'payments', 'private')));
    await denied(getDocFromServer(doc(db, 'activities', 'private')));
    const feed = doc(db, 'operationalActivities', 'qa-feed');
    const event = { id: feed.id, studentId: 'HA-2026-100002', timestamp: '24 Nov 2026, 00:00', performedBy: { userId: manager.uid, name: 'QA Management', role: 'management' }, activityType: 'Lead Submitted' };
    await setDoc(feed, event);
    assert.equal((await getDocFromServer(feed)).data()?.activityType, 'Lead Submitted');
    await denied(setDoc(doc(db, 'operationalActivities', 'qa-financial-leak'), { ...event, id: 'qa-financial-leak', description: 'private financial details' }));
    await denied(updateDoc(feed, { activityType: 'Lead Archived' }));
    await denied(setDoc(doc(db, 'operationalActivities', 'qa-spoof'), { ...event, id: 'qa-spoof', performedBy: { ...event.performedBy, userId: admin.uid } }));
    const lock = doc(db, 'leadOperations', 'intake');
    await setDoc(lock, { updatedAt: serverTimestamp() });
    await denied(setDoc(lock, { updatedAt: serverTimestamp(), extra: true }));
    await login('qa-admin');
    await getDocFromServer(doc(db, 'payments', 'private'));
    await getDocFromServer(doc(db, 'activities', 'private'));
    console.log('PASS: intake, role gates, owner eligibility, and operational activity restrictions.');
  } finally {
    await signOut(auth);
    await terminate(db);
    await deleteApp(app);
  }
}
void run().catch(error => { console.error(error); process.exitCode = 1; });
