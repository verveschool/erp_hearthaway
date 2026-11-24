import assert from 'node:assert/strict';
import { test } from 'node:test';
import { convertToInr, validateConversion, verifiedReceipts, paymentConversion } from '../lib/payment-money';

test('captures a rate per original unit and rounds once to paise', () => {
  assert.deepEqual(validateConversion(200, 'EUR', 91.2345, 18246.9), { rateToInr: 91.2345, amountInr: 18246.9 });
  assert.equal(convertToInr(1, 1.005), 1.01);
  assert.equal(convertToInr(1e6, 1e-7), 0.1);
  for (const invalid of [0, -1, NaN, Infinity]) assert.throws(() => validateConversion(2, 'USD', invalid, 2));
  assert.throws(() => validateConversion(200, 'EUR', 91, 18199));
  assert.deepEqual(validateConversion(200, 'INR', 0, 200), { rateToInr: 1, amountInr: 200 });
});

test('mixed currencies, legacy receipts and pending payments stay distinct', () => {
  const gbp = { amount: 550, currency: 'gbp', rateToInr: 110, amountInr: 60500, paymentStatus: 'Verified' };
  const eur = { amount: 200, currency: 'EUR', paymentStatus: 'Verified' };
  assert.deepEqual(verifiedReceipts([gbp, eur]), { native: '€200.00 + £550.00', rupees: 'INR total incomplete (1 missing conversion)' });
  assert.deepEqual(paymentConversion(eur), { rateToInr: undefined, amountInr: undefined });
  const inr = { amount: 250, currency: 'inr', paymentStatus: 'Verified' };
  assert.equal(verifiedReceipts([gbp, inr, { ...eur, paymentStatus: 'Rejected' }]).rupees, '₹60,750.00');
});
