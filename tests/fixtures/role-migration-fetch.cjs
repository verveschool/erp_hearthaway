// Intercept every fetch so migration tests cannot touch a live service.
global.fetch = async (url, options = {}) => {
  console.log(`MOCK ${options.method || 'GET'} ${url} ${options.body || ''}`);
  let result = {};
  if (url.includes('accounts:batchGet')) result = { users: [{ localId: 'test-user', customAttributes: JSON.stringify({ leadOperationsRole: 'sales', existing: 'keep' }) }] };
  else if (url.includes('/documents/users/')) result = { updateTime: '2026-01-01T00:00:00Z', fields: { role: { stringValue: 'sales' }, displayName: { stringValue: 'Test User' } } };
  else if (!url.includes('/documents:commit') && !url.includes('accounts:update')) throw new Error(`Unexpected mocked URL: ${url}`);
  return { ok: true, json: async () => result };
};
