type Money = { amount: number; currency: string; rateToInr?: number; amountInr?: number };

export function convertToInr(amount: number, rate: number) {
  if (!(amount > 0 && rate > 0) || !Number.isFinite(amount * rate)) return undefined;
  // Multiply decimal digits before rounding once to the nearest paisa.
  const parts = [amount, rate].map(value => value.toString().toLowerCase().split('e'));
  let product = BigInt(1);
  let places = 0;
  for (const [digits, exponent] of parts) {
    const [whole, fraction = ''] = digits.split('.');
    product *= BigInt(whole + fraction);
    places += fraction.length - Number(exponent || 0);
  }
  const divisor = BigInt(10) ** BigInt(Math.max(0, places - 2));
  const paise = (product * BigInt(10) ** BigInt(Math.max(0, 2 - places)) + divisor / BigInt(2)) / divisor;
  return paise > BigInt(0) && paise <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(paise) / 100 : undefined;
}

export function paymentConversion(p: Money) {
  const domestic = p.currency.toUpperCase() === 'INR';
  return { rateToInr: domestic ? 1 : p.rateToInr, amountInr: domestic ? p.amount : p.amountInr };
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}

export function conversionText(p: Money) {
  const { rateToInr, amountInr } = paymentConversion(p);
  if (!rateToInr || amountInr == null) return 'INR conversion not recorded';
  return money(amountInr, 'INR') + ' at ₹' + rateToInr + ' per ' + p.currency.toUpperCase();
}

export function verifiedReceipts(payments: (Money & { paymentStatus: string })[]) {
  const byCurrency = new Map<string, number>();
  let paise = 0;
  let missing = 0;
  for (const p of payments) {
    if (p.paymentStatus !== 'Verified') continue;
    const currency = p.currency.toUpperCase();
    byCurrency.set(currency, (byCurrency.get(currency) || 0) + p.amount);
    const { amountInr } = paymentConversion(p);
    if (amountInr == null) missing++;
    else paise += Math.round(amountInr * 100);
  }
  const native = [...byCurrency].sort(([a], [b]) => a.localeCompare(b)).map(([c, n]) => money(n, c)).join(' + ');
  const rupees = missing ? 'INR total incomplete (' + missing + ' missing conversion)' : money(paise / 100, 'INR');
  return { native, rupees };
}

export function validateConversion(amount: number, currency: string, rate: number, entered: number) {
  const rateToInr = currency.toUpperCase() === 'INR' ? 1 : rate;
  const amountInr = convertToInr(amount, rateToInr);
  if (!amountInr) throw new Error('Enter a positive amount and exchange rate that give at least ₹0.01.');
  if (amountInr !== entered) throw new Error('The INR amount must match the payment amount multiplied by the exchange rate.');
  return { rateToInr, amountInr };
}
