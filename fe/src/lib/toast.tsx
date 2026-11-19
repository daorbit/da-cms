import { useSyncExternalStore } from 'react';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';

/**
 * Toasts for the Tailwind screens.
 *
 * A module-level store rather than a context, so any handler (a hook, a service
 * callback, a modal) can raise one without being inside a provider. The
 * <Toaster /> mounted once in main.tsx renders them.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  message?: string;
  /** One follow-up action, such as Undo or View page. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it hides itself. Errors stay a little longer. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  type: ToastType;
  title: string;
}

/** More than this and older toasts drop off, so a burst of actions never fills the screen. */
const MAX_VISIBLE = 3;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function show(type: ToastType, title: string, options: ToastOptions = {}) {
  const id = nextId++;
  items = [...items, { id, type, title, ...options }].slice(-MAX_VISIBLE);
  emit();
  const duration = options.duration ?? (type === 'error' ? 6500 : 4500);
  window.setTimeout(() => dismiss(id), duration);
  return id;
}

export const toast = {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
  info: (title: string, options?: ToastOptions) => show('info', title, options),
  dismiss,
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const ICON = {
  success: { Icon: IconCheck, tone: 'text-ok bg-ok/10' },
  error: { Icon: IconAlertTriangle, tone: 'text-danger bg-danger/10' },
  info: { Icon: IconInfoCircle, tone: 'text-accent bg-accent-soft' },
} as const;

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);

  return (
    <div
      className="tw pointer-events-none fixed right-4 bottom-4 z-[1000] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 font-sans"
      aria-live="polite"
      role="status"
    >
      {list.map((t) => {
        const { Icon, tone } = ICON[t.type];
        return (
          <div
            key={t.id}
            className="animate-toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-surface p-3.5 text-fg shadow-pop"
          >
            <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon size={15} stroke={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && <p className="mt-0.5 text-sm break-words text-muted">{t.message}</p>}
              {t.action && (
                <button
                  type="button"
                  className="mt-1.5 text-sm font-semibold text-accent-text hover:underline"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded p-1 text-faint hover:bg-surface-hover hover:text-fg"
              onClick={() => dismiss(t.id)}
            >
              <IconX size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
