export const SUPER_ADMIN_EMAIL = (
  import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? "vihaan282007@gmail.com"
).toLowerCase();

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return email.toLowerCase() === SUPER_ADMIN_EMAIL;
}
