import { create } from 'zustand';

export interface ToastItem {
  id: string;
  kind: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface UiState {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

let counter = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = `toast-${++counter}`;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(kind: ToastItem['kind'], title: string, message?: string) {
  useUiStore.getState().pushToast({ kind, title, message });
}
