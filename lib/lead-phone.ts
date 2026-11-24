const scientificPhone = /^(\+?)([1-9])(?:\.(\d+))?e\+?(\d{1,2})$/i;
const formattedPhone = /^\+?[\d(][\d ().-]*\d\)?$/;
const phoneLength = /^\d{6,15}$/;

export function parseLeadPhone(value: unknown) {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/^tel:/i, '');
  const scientific = scientificPhone.exec(text);

  if (scientific) {
    const [, prefix, firstDigit, decimals = '', exponent] = scientific;
    // Every position must be present. Expanding a rounded CSV value would invent trailing digits.
    const digits = firstDigit + decimals;
    if (digits.length !== Number(exponent) + 1 || !phoneLength.test(digits)) return null;
    const number = prefix + digits;
    return { digits, dial: number, display: number };
  }

  if (!formattedPhone.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  if (!phoneLength.test(digits)) return null;
  return { digits, dial: (text.startsWith('+') ? '+' : '') + digits, display: text };
}
