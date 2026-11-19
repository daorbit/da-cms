import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconDots, IconX, IconCheck } from '@tabler/icons-react';
import type { PageStatus } from '@/types';
import { STATUS_LABEL } from '@/components/StatusLabel';

/**
 * Small Tailwind building blocks for the content screens. Kept to what those
 * screens use; anything wider in the app still comes from Mantine.
 */

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* -------------------------------------------------------------- buttons --- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-cta text-cta-fg hover:bg-cta-hover disabled:opacity-50',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-2 disabled:opacity-50',
  ghost: 'text-fg-2 hover:bg-surface-hover hover:text-fg disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-colors',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('grid size-8 shrink-0 place-items-center rounded-sm text-muted hover:bg-surface-hover hover:text-fg', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}

/* --------------------------------------------------------------- status --- */

const STATUS_TONE: Record<PageStatus, { pill: string; dot: string }> = {
  published: { pill: 'bg-ok/10 text-ok', dot: 'bg-ok' },
  draft: { pill: 'bg-warn/10 text-warn', dot: 'bg-warn' },
  archived: { pill: 'bg-surface-2 text-muted', dot: 'bg-faint' },
};

export function StatusBadge({ status }: { status: PageStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', tone.pill)}>
      <span className={cx('size-1.5 rounded-full', tone.dot)} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* --------------------------------------------------------------- dialog --- */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** A centred modal, portalled to <body> so no parent's overflow can clip it. */
export function Dialog({ open, onClose, title, children, footer, width = 'max-w-md' }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="tw fixed inset-0 z-[300] flex items-center justify-center p-4 font-sans text-fg">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('animate-pop-in relative flex max-h-[90vh] w-full flex-col rounded-lg border border-line bg-surface shadow-pop-lg', width)}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <IconX size={16} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm leading-6 text-fg-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmState {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

/** Confirmation with Cancel as the safe default. Holds its own busy state while onConfirm runs. */
export function ConfirmDialog({ state, onClose }: { state: ConfirmState | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={state !== null}
      onClose={() => !busy && onClose()}
      title={state?.title ?? ''}
      footer={
        <>
          <Button onClick={onClose} disabled={busy} autoFocus>
            Cancel
          </Button>
          <Button
            variant={state?.danger ? 'danger' : 'primary'}
            loading={busy}
            onClick={async () => {
              if (!state) return;
              setBusy(true);
              try {
                await state.onConfirm();
              } finally {
                setBusy(false);
                onClose();
              }
            }}
          >
            {state?.confirmLabel}
          </Button>
        </>
      }
    >
      {state?.message}
    </Dialog>
  );
}

/* ----------------------------------------------------------------- menu --- */

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

/** A ⋯ button with a short list of actions. Clicks inside never reach the row behind it. */
export function Menu({ items, label = 'More actions' }: { items: (MenuItem | false | null)[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <IconButton label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconDots size={16} />
      </IconButton>
      {open && (
        <div className="animate-pop-in absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-pop">
          {items.filter(Boolean).map((item) => {
            const it = item as MenuItem;
            return (
              <button
                key={it.label}
                type="button"
                className={cx(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-hover',
                  it.danger ? 'text-danger' : 'text-fg',
                )}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
              >
                <span className="text-muted">{it.icon}</span>
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- fields --- */

export const inputCls =
  'w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft';

export function Field({
  label, hint, counter, children,
}: { label: string; hint?: ReactNode; counter?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-medium text-fg">
        {label}
        {counter}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** "52 / 50–60": green inside the range search engines show in full, amber outside it. */
export function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  const tone = n === 0 ? 'text-faint' : n < min || n > max ? 'text-warn' : 'text-ok';
  return <span className={cx('text-xs font-normal tabular-nums', tone)}>{n} / {min}–{max}</span>;
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-lg border border-line bg-surface p-5', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------ checklist --- */

export interface CheckItem {
  ok: boolean;
  label: string;
}

export function ChecklistView({ items }: { items: CheckItem[] }) {
  const done = items.filter((i) => i.ok).length;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cx('h-full rounded-full transition-all', done === items.length ? 'bg-ok' : 'bg-warn')}
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted tabular-nums">{done}/{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-sm">
            <span
              className={cx(
                'grid size-4 shrink-0 place-items-center rounded-full',
                i.ok ? 'bg-ok text-white' : 'border border-line-strong',
              )}
            >
              {i.ok && <IconCheck size={11} stroke={3} />}
            </span>
            <span className={i.ok ? 'text-muted' : 'text-fg'}>{i.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
