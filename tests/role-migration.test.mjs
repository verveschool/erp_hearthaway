import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(...args) {
  return spawnSync(process.execPath, ['--require', './tests/fixtures/role-migration-fetch.cjs', './scripts/migrate-internal-roles.mjs', ...args], {
    encoding: 'utf8', env: { ...process.env, GOOGLE_OAUTH_ACCESS_TOKEN: 'test-token' },
  });
}
const project = '--project=test-project';
const database = '--database=ai-studio-7b4966a7-1d3f-4ab2-bcc5-924d7c1e1515';
test('requires one valid explicit project and database before any request', () => {
  for (const args of [[project], [database], [project, '--database='], [project, '--database=../bad'], [project, '--database=bad/name'], [project, '--database=ABC'], [project, database, '--database=(default)'], ['--project=../bad', database]]) {
    const result = run(...args);
    assert.notEqual(result.status, 0, JSON.stringify(args));
    assert.doesNotMatch(result.stdout, /MOCK/);
  }
});
test('dry run reads the named database and performs no writes', () => {
  const result = run(project, database);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /databases\/ai-studio-7b4966a7-1d3f-4ab2-bcc5-924d7c1e1515\/documents\/users\/test-user/);
  assert.doesNotMatch(result.stdout, /MOCK POST/);
  assert.match(result.stdout, /Auth claims are project-wide/);
});
test('apply targets named database in commit URL and document names', () => {
  const result = run(project, database, '--apply');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /MOCK POST https:\/\/firestore.googleapis.com\/v1\/projects\/test-project\/databases\/ai-studio-7b4966a7-1d3f-4ab2-bcc5-924d7c1e1515\/documents:commit/);
  assert.match(result.stdout, /projects\/test-project\/databases\/ai-studio-7b4966a7-1d3f-4ab2-bcc5-924d7c1e1515\/documents\/users\/test-user/);
  assert.doesNotMatch(result.stdout, /databases\/\(default\)/);
});
test('explicit default database is supported', () => {
  const result = run(project, '--database=(default)');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /databases\/\(default\)\/documents\/users\/test-user/);
});
