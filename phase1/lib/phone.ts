// أدوات أرقام الهاتف

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

// صالح إن كان فيه 7 إلى 15 رقماً (معيار E.164 بحدّه الأقصى 15)
export function isValidPhone(phone: string): boolean {
  if (!/^[0-9+\s-]{6,20}$/.test(phone)) return false;
  const d = digitsOnly(phone);
  return d.length >= 7 && d.length <= 15;
}

// يحوّل الرقم إلى الصيغة الدولية لروابط واتساب.
// الأرقام السورية المحلية (09XXXXXXXX) تُحوَّل إلى 9639XXXXXXXX.
export function toWhatsAppNumber(phone: string): string {
  let d = digitsOnly(phone);
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 10) d = `963${d.slice(1)}`;
  return d;
}
