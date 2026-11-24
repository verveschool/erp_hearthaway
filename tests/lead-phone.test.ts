import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leadPhoneCsv, leadWhatsAppTarget, normalizeLeadPhone } from '../lib/lead-phone';

test('Indian mobile numbers work in WhatsApp without changing stored digits', () => {
  for (const phone of ['9876543210', '8123456789', '7123456789', '6123456789', '98765 43210', 'tel:9876543210']) {
    assert.equal(leadWhatsAppTarget(phone), `91${normalizeLeadPhone(phone)}`);
  }
  assert.equal(normalizeLeadPhone('9876543210'), '9876543210');
  assert.equal(leadPhoneCsv('9876543210'), 'tel:9876543210');
});

test('explicit international numbers keep their own country code', () => {
  assert.equal(leadWhatsAppTarget('+91 98765 43210'), '919876543210');
  assert.equal(leadWhatsAppTarget('00919876543210'), '919876543210');
  assert.equal(leadWhatsAppTarget('+44 7700 900003'), '447700900003');
  assert.equal(leadWhatsAppTarget('+1 (202) 555-0123'), '12025550123');
});

test('ambiguous, truncated or damaged data is not guessed', () => {
  for (const phone of [null, '', 9876543210, '7.7E+10', '1234567890', '987654321', '07700990123', '9876543210000', '+09876543210']) {
    assert.equal(leadWhatsAppTarget(phone), null, String(phone));
  }
  assert.equal(leadPhoneCsv('07700990123'), 'tel:07700990123');
  assert.equal(leadPhoneCsv('7.7E+10'), '');
});
