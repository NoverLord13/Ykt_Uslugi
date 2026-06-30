import { useEffect, useRef, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export const Modal = ({ open, title, description, onClose, children }: ModalProps) => {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]') || []);
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const items = focusable(); if (!items.length) return;
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeys);
    requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKeys);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panelRef} className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 id="modal-title" className="text-xl font-black text-[var(--ink)]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="icon-button">×</button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
};
