// Um formato canônico para comparação e outro para apresentação. Não inventa DDD ou nono dígito.
const BRAZIL_DDDS = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
export function phoneDigits(value) {
  const text = String(value ?? '').trim().replace(/^tel:/i, '');
  if (!/^(?:\+|00)?[\d\s().-]+$/.test(text)) return '';
  let digits = text.replace(/\D/g, '');
  const international = text.startsWith('+') || text.startsWith('00');
  if (text.startsWith('00')) digits = digits.slice(2);
  // Discagem nacional: 0 + CSP + DDD + assinante, ou 0 + DDD + assinante.
  if (!international && /^0[1-9]\d\d{10,11}$/.test(digits)) digits = digits.slice(3);
  else if (!international && /^0\d{10,11}$/.test(digits)) digits = digits.slice(1);
  if (!international && (digits.length === 10 || digits.length === 11)) digits = '55' + digits;
  if (!/^55\d{2}(?:[2-5]\d{7}|9\d{8})$/.test(digits) || !BRAZIL_DDDS.has(digits.slice(2,4))) return '';
  return digits;
}
export function formatPhone(value) {
  const digits = phoneDigits(value);
  if (!digits) return '';
  const number = digits.slice(4);
  return `+55 ${digits.slice(2,4)} ${number.slice(0,-4)}-${number.slice(-4)}`;
}
export function duplicateProfiles(profiles, phone, category, role = 'professional') {
  const digits = phoneDigits(phone);
  return digits && category ? profiles.filter(p => !p.demo && phoneDigits(p.phone) === digits && p.category === category && (p.role || 'professional') === role) : [];
}
