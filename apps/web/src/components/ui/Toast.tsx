import { useUiStore, type ToastItem } from '@/stores/ui';
import { cn } from '@/lib/utils';

const styles: Record<ToastItem['kind'], string> = {
  success: 'border-emerald-400 bg-emerald-50 text-emerald-900',
  error: 'border-red-400 bg-red-50 text-red-900',
  info: 'border-blue-400 bg-blue-50 text-blue-900',
  warning: 'border-amber-400 bg-amber-50 text-amber-900',
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn('pointer-events-auto rounded-md border-l-4 p-3 shadow-lg', styles[t.kind])}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && <p className="mt-0.5 text-sm opacity-90">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fermer la notification"
              className="text-current opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
