const scientificPhone = /^(\+?)([1-9])(?:\.(\d+))?e\+?(\d{1,2})$/i;
const formattedPhone = /^\+?(?:\d|\(\d+\))(?:[ .-]?(?:\d|\(\d+\)))*$/;
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

  if (text.length > 80 || !formattedPhone.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  if (!phoneLength.test(digits)) return null;
  return { digits, dial: (text.startsWith('+') ? '+' : '') + digits, display: text };
}

export function normalizeLeadPhone(value: unknown): string | null {
  return parseLeadPhone(value)?.dial ?? null;
}

export function leadPhoneCsv(value: unknown): string {
  const phone = normalizeLeadPhone(value);
  return phone ? `tel:${phone}` : '';
}

export function leadWhatsAppTarget(value: unknown): string | null {
  const phone = normalizeLeadPhone(value);
  if (!phone) return null;
  // Indian mobile numbers are commonly stored without a country code. Infer
  // it only for a complete, valid-looking 10-digit mobile, never a damaged
  // number or an explicitly international number.
  if (/^[6-9]\d{9}$/.test(phone)) return `91${phone}`;
  if (!/^(?:\+|00)[1-9]/.test(phone)) return null;
  const international = phone.replace(/^(?:\+|00)/, '');
  return /^\d{6,15}$/.test(international) ? international : null;
}
