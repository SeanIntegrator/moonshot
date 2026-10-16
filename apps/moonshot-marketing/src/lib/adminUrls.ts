// Links into the admin app. Set VITE_ADMIN_SIGNUP_URL / VITE_ADMIN_LOGIN_URL
// for a deployed site; the fallbacks point at the admin app running locally.

export function getAdminSignupUrl(): string {
  return import.meta.env.VITE_ADMIN_SIGNUP_URL?.trim() || 'http://localhost:5174/signup';
}

export function getAdminLoginUrl(): string {
  return import.meta.env.VITE_ADMIN_LOGIN_URL?.trim() || 'http://localhost:5174/login';
}
