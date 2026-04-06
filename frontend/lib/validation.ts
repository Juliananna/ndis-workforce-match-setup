export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidAustralianPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-().+]/g, "");
  return /^(0[2-9]\d{8}|(\+?61)[2-9]\d{8})$/.test(digits);
}

export function emailError(email: string): string | null {
  if (!email.trim()) return null;
  return isValidEmail(email) ? null : "Please enter a valid email address";
}

export function phoneError(phone: string): string | null {
  if (!phone.trim()) return null;
  return isValidAustralianPhone(phone) ? null : "Please enter a valid Australian phone number (e.g. 0412 345 678)";
}
