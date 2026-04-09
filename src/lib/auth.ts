import { isAxiosError } from 'axios';
import type { AuthUser, LoginResponseBody } from '../types/auth';
import { api } from './api';

const TOKEN_KEY = 'pulse_access_token';
const USER_KEY = 'pulse_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await api.post<LoginResponseBody>('/auth/login', {
    email,
    password
  });

  const { accessToken, user } = res.data.data;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
