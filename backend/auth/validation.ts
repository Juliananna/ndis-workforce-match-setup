export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-().+]/g, "");
  return /^(0[2-9]\d{8}|61[2-9]\d{8})$/.test(digits);
}
