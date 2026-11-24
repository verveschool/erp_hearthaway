// Disposable fixtures for the loopback-only demo project.
const project = 'demo-hearthaway-qa';
const auth = 'http://127.0.0.1:49199';
const store = 'http://127.0.0.1:48081';
const password = 'only-local-fixtures';
const admin = { Authorization: 'Bearer owner' };

async function request(url, method, body, headers = {}) {
  const response = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || `Fixture request failed with status ${response.status}.`);
  return result;
}

async function profile(alias, role, name, claim, partnerId) {
  const email = `${alias}@example.invalid`;
  const credentials = { email, password, returnSecureToken: true };
  let uid;
  try {
    ({ localId: uid } = await request(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-qa-only`, 'POST', credentials));
  } catch (error) {
    if (error.message !== 'EMAIL_EXISTS') throw error;
    ({ localId: uid } = await request(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-qa-only`, 'POST', credentials));
  }
  if (claim) {
    await request(`${auth}/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:update`, 'POST', {
      localId: uid, customAttributes: JSON.stringify({ internalRole: claim }),
    }, admin);
  }
  await fixture(`users/${uid}`, {
    uid, email, displayName: name, role, isApproved: true, status: 'approved',
    ...(partnerId ? { partnerId, partnerName: 'Example Education' } : {}),
  });
  return uid;
}

function encode(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: encodeFields(value) } };
}

function encodeFields(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, encode(value)]));
}

function fixture(path, values) {
  return request(`${store}/v1/projects/${project}/databases/(default)/documents/${path}`, 'PATCH', {
    fields: encodeFields(values),
  }, admin);
}

const adminUser = await profile('qa-admin', 'admin', 'QA Admin', 'admin');
const manager = await profile('qa-management', 'management', 'QA Management', 'management');
const owner = await profile('qa-portfolio', 'management', 'QA Portfolio Owner', 'management');
const other = await profile('qa-other-portfolio', 'management', 'QA Other Portfolio', 'management');
const sales = await profile('qa-sales', 'management', 'QA Sales', 'management');
const secondRep = await profile('qa-sales-two', 'management', 'QA Sales Two', 'management');
const disabled = await profile('qa-disabled', 'management', 'QA Disabled', 'management');
await profile('qa-no-directory', 'management', 'QA No Directory', 'management');
const partner = await profile('qa-partner', 'partner', 'QA Partner', undefined, 'PART-00001');
await profile('qa-finance', 'finance', 'QA Finance');

await Promise.all([
  fixture(`leadOwnerDirectory/${adminUser}`, { displayName: 'QA Admin' }),
  fixture(`leadOwnerDirectory/${manager}`, { displayName: 'QA Management' }),
  fixture(`leadOwnerDirectory/${disabled}`, { displayName: 'QA Disabled' }),
  fixture(`users/${disabled}`, { uid: disabled, email: 'qa-disabled@example.invalid', displayName: 'QA Disabled', role: 'management', status: 'approved', isApproved: false }),
  fixture(`leadOwnerDirectory/${sales}`, { displayName: 'QA Sales' }),
  fixture(`leadOwnerDirectory/${secondRep}`, { displayName: 'QA Sales Two' }),
  fixture(`portfolioOwnerDirectory/${owner}`, { displayName: 'QA Portfolio Owner' }),
  fixture(`portfolioOwnerDirectory/${other}`, { displayName: 'QA Other Portfolio' }),
  fixture('partners/qa-partner', {
    id: 'qa-partner', partnerId: 'PART-00001', companyName: 'Example Education', accountUid: partner,
    type: 'Study Abroad Consultant', contactPerson: 'Example Advisor', email: 'agency@example.invalid',
    phone: '+44 7700 900001', city: 'London', state: 'London', country: 'United Kingdom',
    portfolioOwnerId: owner, portfolioOwnerName: 'QA Portfolio Owner', agreementStatus: 'Active',
    status: 'Active', onboardingDate: '2026-01-01', commissionRate: 20,
    leadTargets: [{ season: 'September 2027', promised: 4 }],
  }),
  fixture('partners/qa-other-partner', {
    id: 'qa-other-partner', partnerId: 'PART-00002', companyName: 'Different Education',
    type: 'Study Abroad Consultant', contactPerson: 'Different Advisor', email: 'different@example.invalid',
    phone: '+44 7700 900002', city: 'Bristol', state: 'Bristol', country: 'United Kingdom',
    portfolioOwnerId: other, portfolioOwnerName: 'QA Other Portfolio', agreementStatus: 'Active',
    status: 'Active', onboardingDate: '2026-01-01', commissionRate: 20,
  }),
  fixture('students/qa-legacy-lead', {
    id: 'qa-legacy-lead', studentId: 'HA-2026-100001', fullName: 'Existing Fixture Lead',
    firstName: 'Existing', lastName: 'Fixture Lead', email: 'existing@example.invalid',
    phone: '+44 7700 900003', whatsApp: '+44 7700 900003', nationality: 'UK', currentCountry: 'UK',
    university: 'Example University', course: 'Example course', intake: 'Sep-27',
    destinationCity: 'London', destinationCountry: 'United Kingdom', moveInDate: '2027-09-01',
    moveOutDate: '', budget: 200, currency: 'GBP', partnerId: 'PART-00001', partnerName: 'Example Education',
    assignedSalesExecutiveId: sales, assignedSalesExecutiveName: 'QA Sales',
    pipelineStage: 'New', leadStatus: 'New', bookingStatus: 'Not Started', priority: 'Medium',
    createdAt: '2026-11-21', updatedAt: '2026-11-21', archivalStatus: 'Active', addedBy: manager,
  }),
]);
console.log(`Seeded ${project} on loopback. Local fixture passwords: ${password}`);
