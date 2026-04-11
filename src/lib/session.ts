export const TOKEN_KEY = 'pulse_access_token';
export const USER_KEY = 'pulse_user';

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
