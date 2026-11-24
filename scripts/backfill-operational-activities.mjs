// Dry-run by default. Uses a short-lived Google OAuth token supplied by an
// authorized operator. Never copies descriptions, values, context, or files.
// Existing projections are never overwritten, making retries safe.
const args = process.argv.slice(2);
const project = args.find(x => x.startsWith('--project='))?.slice(10);
const database = args.find(x => x.startsWith('--database='))?.slice(11);
const apply = args.includes('--apply');
if (!project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project) || !database || !(database === '(default)' || /^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(database)) || !process.env.GOOGLE_OAUTH_ACCESS_TOKEN || args.some(x => !x.startsWith('--project=') && !x.startsWith('--database=') && x !== '--apply')) {
  console.error('Usage: GOOGLE_OAUTH_ACCESS_TOKEN=<token> node scripts/backfill-operational-activities.mjs --project=<project-id> --database=<database-id> [--apply]');
  process.exit(1);
}
const types = new Set([
  'Partner Portfolio Owner Reassigned', 'Partner Onboarded', 'Partner Updated',
  'Lead Owner Changed', 'Sales Owner Changed', 'Lead Submitted', 'Lead Details Updated',
  'Lead Archived', 'Pipeline Stage Change', 'Priority Change', 'Accommodation Status Change',
  'Booking Status Change', 'Move-in Status Change', 'Property Booking Recorded', 'Property Booking Updated',
]);
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents`;
const headers = { Authorization: `Bearer ${process.env.GOOGLE_OAUTH_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(`Firestore request failed (${response.status})`), { status: response.status, code: data.error?.status });
  return data;
}
const string = (value) => value?.stringValue;
const users = new Map();
async function actor(uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return null;
  if (users.has(uid)) return users.get(uid);
  let result = null;
  try {
    const profile = (await api(`${root}/users/${encodeURIComponent(uid)}`)).fields || {};
    const directory = (await api(`${root}/leadOwnerDirectory/${encodeURIComponent(uid)}`)).fields || {};
    const name = string(directory.displayName), role = string(profile.role);
    if (name && name.length <= 100 && /^[\p{L}\p{M} .'-]+$/u.test(name) && ['admin', 'management'].includes(role) && string(profile.status) !== 'deleted' && !profile.deletedAt) result = { userId: uid, name, role };
  } catch (error) { if (error.status !== 404) throw error; }
  users.set(uid, result);
  return result;
}
let token, scanned = 0, eligible = 0, skipped = 0, existing = 0;
do {
  const page = await api(`${root}/activities?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
  for (const legacy of page.documents || []) {
    scanned++;
    const f = legacy.fields || {}, id = legacy.name.split('/').pop();
    const studentId = string(f.studentId), timestamp = string(f.timestamp), activityType = string(f.activityType);
    const uid = string(f.performedBy?.mapValue?.fields?.userId);
    // Skip malformed or ambiguous historical data rather than copy unreviewed text.
    if (!id || string(f.id) !== id || !studentId || !/^(HA-\d{4}-\d{6}|PART-\d{5})$/.test(studentId) ||
        !timestamp || !(/^\d{2} [A-Za-z]{3} \d{4}, \d{2}:\d{2}$/.test(timestamp)) ||
        !types.has(activityType) || !uid) { skipped++; continue; }
    const performedBy = await actor(uid);
    if (!performedBy) { skipped++; continue; }
    eligible++;
    if (!apply) continue;
    const fields = {
      id: { stringValue: id }, studentId: { stringValue: studentId }, timestamp: { stringValue: timestamp },
      activityType: { stringValue: activityType }, performedBy: { mapValue: { fields: Object.fromEntries(Object.entries(performedBy).map(([k, v]) => [k, { stringValue: v }])) } },
    };
    try {
      await api(`${root}:commit`, { method: 'POST', body: JSON.stringify({ writes: [{ update: { name: `projects/${project}/databases/${database}/documents/operationalActivities/${id}`, fields }, currentDocument: { exists: false } }] }) });
    } catch (error) {
      if (error.status === 409 || error.status === 412 || error.code === 'ALREADY_EXISTS' || error.code === 'FAILED_PRECONDITION') existing++;
      else throw error;
    }
  }
  token = page.nextPageToken;
} while (token);
console.log(`${apply ? 'Applied' : 'Dry run'}: scanned ${scanned}; eligible ${eligible}; skipped ${skipped}; existing ${existing}.`);
