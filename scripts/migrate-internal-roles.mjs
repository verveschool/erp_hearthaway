import { readFileSync } from 'node:fs';
// One-time migration. Dry-run by default. Uses a short-lived Google OAuth token
// supplied by the operator; never uses credentials from this repository.
const args = process.argv.slice(2);
const project = args.find(x => x.startsWith('--project='))?.slice(10);
const apply = args.includes('--apply');
const manifestPath = args.find(x => x.startsWith('--manifest='))?.slice(11);
const manifest = manifestPath ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object' || Object.values(manifest).some(role => !['admin', 'management'].includes(role))) throw new Error('Manifest must be a JSON object mapping exact Firebase UIDs to admin or management.');
if (!project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project) || !process.env.GOOGLE_OAUTH_ACCESS_TOKEN || args.some(x => !x.startsWith('--project=') && x !== '--apply' && !x.startsWith('--manifest='))) {
  console.error('Usage: GOOGLE_OAUTH_ACCESS_TOKEN=<token> node scripts/migrate-internal-roles.mjs --project=<project-id> [--manifest=reviewed-uid-map.json] [--apply]');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${process.env.GOOGLE_OAUTH_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await r.json();
  if (!r.ok) throw new Error(`${method} failed (${r.status}): ${data.error?.message || 'unknown error'}`);
  return data;
}
const authBase = `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts`;
const store = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const mapping = { management: 'admin', sales: 'management', portfolio_owner: 'management' };
let pageToken;
const users = [];
do {
  const result = await api(`${authBase}:batchGet?maxResults=1000${pageToken ? `&nextPageToken=${encodeURIComponent(pageToken)}` : ''}`);
  users.push(...(result.users || []));
  pageToken = result.nextPageToken;
} while (pageToken);
const unknownUids = Object.keys(manifest).filter(uid => !users.some(user => user.localId === uid));
if (unknownUids.length) throw new Error(`Manifest contains unknown UIDs: ${unknownUids.join(', ')}`);
let planned = 0, skipped = 0;
for (const user of users) {
  const claims = JSON.parse(user.customAttributes || '{}');
  const legacyMapped = mapping[claims.leadOperationsRole];
  const reviewed = Object.prototype.hasOwnProperty.call(manifest, user.localId) ? manifest[user.localId] : undefined;
  const mapped = legacyMapped || reviewed;
  // Existing new claims may have been deliberately changed since migration.
  if (!mapped || user.disabled || (reviewed && legacyMapped && reviewed !== legacyMapped) || (claims.leadOperationsRole && !legacyMapped) || (claims.internalRole && claims.internalRole !== mapped)) {
    if (claims.leadOperationsRole || claims.internalRole) console.log(`SKIP ${user.localId}: disabled, unknown legacy role, or conflicting new claim`);
    skipped++;
    continue;
  }
  let profile;
  try { profile = await api(`${store}/users/${encodeURIComponent(user.localId)}`); }
  catch (error) { console.log(`SKIP ${user.localId}: profile unavailable (${error.message})`); skipped++; continue; }
  const fields = profile.fields || {};
  if (fields.role?.stringValue === 'partner' || (fields.status?.stringValue && fields.status.stringValue !== 'approved') || fields.isApproved?.booleanValue === false || fields.deletedAt) {
    console.log(`SKIP ${user.localId}: external, unapproved or deleted profile`); skipped++; continue;
  }
  const displayName = fields.displayName?.stringValue || user.displayName || user.email || user.localId;
  console.log(`${apply ? 'APPLY' : 'PLAN'} ${user.localId}: ${claims.leadOperationsRole || 'reviewed manifest'} -> ${mapped}; profile and both owner directories`);
  planned++;
  if (!apply) continue;
  // Firestore writes are committed together. Claim changes happen last, so a
  // failed directory/profile write cannot grant access. A failed claim update
  // can be safely retried, after reviewing the partial result.
  const docName = `projects/${project}/databases/(default)/documents`;
  const writes = [{ update: { name: `${docName}/users/${user.localId}`, fields: { role: { stringValue: mapped } } }, updateMask: { fieldPaths: ['role'] }, currentDocument: { updateTime: profile.updateTime } }];
  for (const directory of ['leadOwnerDirectory', 'portfolioOwnerDirectory']) {
    writes.push({ update: { name: `${docName}/${directory}/${user.localId}`, fields: { displayName: { stringValue: displayName } } }, updateMask: { fieldPaths: ['displayName'] } });
  }
  await api(`${store}:commit`, 'POST', { writes });
  await api(`${authBase}:update`, 'POST', { localId: user.localId, customAttributes: JSON.stringify({ ...claims, internalRole: mapped }) });
}
console.log(`${apply ? 'Applied' : 'Dry run planned'} ${planned}; skipped ${skipped}. Refresh user sessions after applying.`);
