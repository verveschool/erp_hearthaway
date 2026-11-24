import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { operationalActivity } from '../lib/operational-activity';
import type { Activity } from '../lib/types';

const audit: Activity = {
  id: 'act-example', activityId: 'ACT-example', studentId: 'HA-2026-123456',
  timestamp: '24 Nov 2026, 14:10', performedBy: { userId: 'actor', name: 'A User', role: 'management' },
  activityType: 'Lead Details Updated', description: 'Sensitive free text', oldValue: 'old secret',
  newValue: 'new secret', context: { payment: 500 }, attachment: 'private-file',
};
test('operational projection strips private values and rejects finance and arbitrary event labels', () => {
  assert.deepEqual(operationalActivity(audit), {
    id: audit.id, studentId: audit.studentId, timestamp: audit.timestamp,
    performedBy: audit.performedBy, activityType: audit.activityType,
  });
  for (const activityType of ['Payment Uploaded', 'Commission Status Change', 'Internal Note Added']) {
    assert.equal(operationalActivity({ ...audit, activityType }), null);
  }
  assert.equal(operationalActivity({ ...audit, studentId: 'private free text' }), null);
  assert.equal(operationalActivity({ ...audit, performedBy: { ...audit.performedBy, role: 'partner' } }), null);
});
