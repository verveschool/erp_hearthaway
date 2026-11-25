import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { contactEmail, contactPhone } from '@/lib/lead-details';
import production from '@/firebase-applet-config.json';

const bodySchema = z.object({
  contacts: z.array(z.object({ email: z.string().max(320), phone: z.string().max(100) })).min(1).max(100),
  excludeId: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
});
// This server-only Firebase identity can read leads for duplicate checks.
let readerSession: { token: string; expires: number } | undefined;
async function readerToken(authBase: string, apiKey: string) {
  if (readerSession && readerSession.expires > Date.now()) return readerSession.token;
  const password = process.env.NEXT_PUBLIC_FIREBASE_MODE === 'emulator' ? 'only-local-fixtures' : process.env.HEARTHAWAY_INTAKE_LOOKUP_PASSWORD;
  if (!password) throw new Error('Intake reader is unavailable.');
  const response = await fetch(authBase + '/v1/accounts:signInWithPassword?key=' + apiKey, {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lead-intake-reader@system.hearthaway.invalid', password, returnSecureToken: true }),
  });
  if (!response.ok) throw new Error('Intake reader sign-in failed.');
  const session = await response.json();
  readerSession = { token: session.idToken, expires: Date.now() + (Number(session.expiresIn) - 60) * 1000 };
  return readerSession.token;
}
type Fields = Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean }>;
const fail = (status: number) => Response.json({ error: 'Lead intake check unavailable.' }, { status });

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return fail(401);
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400);
  try {
    const mode = process.env.NEXT_PUBLIC_FIREBASE_MODE || 'production';
    const local = mode === 'emulator';
    const config = local ? { projectId: 'demo-hearthaway-qa', firestoreDatabaseId: '(default)', apiKey: 'local-qa-only' }
      : mode === 'production' ? production : JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_STAGING_CONFIG || '{}');
    const authBase = local ? 'http://127.0.0.1:49199/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
    const store = (local ? 'http://127.0.0.1:48081' : 'https://firestore.googleapis.com')
      + `/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents`;
    const identity = await fetch(authBase + '/v1/accounts:lookup?key=' + config.apiKey, {
      method: 'POST', body: JSON.stringify({ idToken: auth.slice(7) }), headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    });
    if (!identity.ok) return fail(401);
    const user = (await identity.json()).users?.[0];
    if (!user?.localId || user.disabled) return fail(403);
    const profile = await fetch(store + '/users/' + encodeURIComponent(user.localId), { headers: { Authorization: auth }, cache: 'no-store' });
    if (!profile.ok) return fail(403);
    const { fields } = await profile.json() as { fields: Fields };
    if (fields.role?.stringValue !== 'partner' || !fields.partnerId?.stringValue ||
      fields.isApproved?.booleanValue === false || fields.deletedAt?.stringValue ||
      (fields.status?.stringValue || 'approved') !== 'approved') return fail(403);
    const selected = ['studentId', 'email', 'phone', 'partnerId', 'archivalStatus'];
    const response = await fetch(store + ':runQuery', {
      method: 'POST', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + await readerToken(authBase, config.apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'students' }], select: { fields: selected.map(fieldPath => ({ fieldPath })) } } }),
    });
    if (!response.ok) return fail(503);
    const emails = new Set<string>(), phones = new Set<string>(), ids = new Set<string>();
    for (const { document } of await response.json() as { document?: { name: string; fields: Fields } }[]) {
      if (!document) continue;
      const f = document.fields;
      ids.add(f.studentId?.stringValue || '');
      if (f.archivalStatus?.stringValue === 'Archived' || (document.name.split('/').pop() === input.data.excludeId && f.partnerId?.stringValue === fields.partnerId.stringValue)) continue;
      emails.add(contactEmail(f.email?.stringValue));
      phones.add(contactPhone(f.phone?.stringValue ?? f.phone?.integerValue));
    }
    const checks = input.data.contacts.map(contact => {
      let studentId: string;
      do { studentId = `HA-${new Date().getFullYear()}-${randomInt(100000, 1000000)}`; } while (ids.has(studentId));
      ids.add(studentId);
      const phone = contactPhone(contact.phone), email = contactEmail(contact.email);
      return { email: !!email && emails.has(email), phone: !!phone && phones.has(phone), studentId };
    });
    return Response.json(checks, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(503);
  }
}
