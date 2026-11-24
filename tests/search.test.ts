import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesSearch } from '../lib/utils';

test('workspace searches are case-insensitive, trimmed, and safe with legacy fields', () => {
  assert.equal(matchesSearch('   ', [null, undefined]), true);
  assert.equal(matchesSearch('  LONDON  ', [undefined, 'London']), true);
  assert.equal(matchesSearch('001', ['QA-001', null]), true);
  assert.equal(matchesSearch('12', [null, 123]), true);
  assert.equal(matchesSearch('missing', [null, undefined, {}]), false);
});
