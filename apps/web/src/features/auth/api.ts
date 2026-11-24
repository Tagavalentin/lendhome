import { api } from '@/lib/api';
import type { LoginResponse, User } from '@plateforme/shared';
import { normalizeLoginResponse, toFrontendUser } from '@/lib/backend';
import type { BackendLoginResponse } from '@/lib/backend';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<BackendLoginResponse>('/api/auth/login', { email, password });
  return normalizeLoginResponse(res);
}

export async function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const res = await api.post<BackendLoginResponse>('/api/auth/register', input);
  return normalizeLoginResponse(res);
}

export function logout() {
  return api.post('/api/auth/logout');
}

export async function fetchMe(): Promise<User> {
  const res = await api.get<Parameters<typeof toFrontendUser>[0]>('/api/me');
  return toFrontendUser(res);
}
