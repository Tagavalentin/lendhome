import { api } from '@/lib/api';
import type { LoginResponse, User } from '@plateforme/shared';

export function login(email: string, password: string) {
  return api.post<LoginResponse>('/api/auth/login', { email, password });
}

export function logout() {
  return api.post('/api/auth/logout');
}

export function fetchMe() {
  return api.get<User>('/api/me');
}
