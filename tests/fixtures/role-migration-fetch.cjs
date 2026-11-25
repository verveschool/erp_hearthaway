// Intercept every fetch so migration tests cannot touch a live service.
global.fetch = async (url, options = {}) => {
  console.log(`MOCK ${options.method || 'GET'} ${url} ${options.body || ''}`);
  let result = {};
  if (url.includes('accounts:batchGet')) result = { users: [{ localId: 'test-user', customAttributes: JSON.stringify({ leadOperationsRole: 'sales', existing: 'keep' }) }] };
  else if (url.includes('/documents/users/')) result = { updateTime: '2026-01-01T00:00:00Z', fields: { role: { stringValue: 'sales' }, displayName: { stringValue: 'Test User' } } };
  else if (!url.includes('/documents:commit') && !url.includes('accounts:update')) throw new Error(`Unexpected mocked URL: ${url}`);
  return { ok: true, json: async () => result };
};

if (process.env.MIGRATION_FIXTURE) {
  const fs = require('node:fs');
  const path = process.env.MIGRATION_FIXTURE;
  const state = JSON.parse(fs.readFileSync(path, 'utf8'));
  global.fetch = async (url, options) => {
    let result = {};
    const body = options.body && JSON.parse(options.body);
    if (url.includes('accounts:batchGet')) {
      result.users = Object.entries(state).map(([localId, user]) => ({ localId, customAttributes: JSON.stringify(user.claims) }));
    } else if (url.includes('/documents/users/')) {
      const user = state[url.split('/').pop()];
      result = { updateTime: '2026-01-01T00:00:00Z', fields: { role: { stringValue: user.role }, roleMigrationVersion: { integerValue: user.version } } };
    } else if (url.endsWith(':commit')) {
      for (const { update } of body.writes) {
        const [id, collection] = update.name.split('/').reverse();
        if (collection === 'users') {
          state[id].role = update.fields.role.stringValue;
          state[id].version = update.fields.roleMigrationVersion.integerValue;
        } else state[id].directories.push(collection);
      }
    } else if (url.endsWith('accounts:update')) state[body.localId].claims = JSON.parse(body.customAttributes);
    else throw new Error('Unexpected migration request');
    fs.writeFileSync(path, JSON.stringify(state));
    return { ok: true, json: async () => result };
  };
}
