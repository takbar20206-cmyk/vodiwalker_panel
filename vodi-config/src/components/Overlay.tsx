import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icons';

interface SheetProps {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ title, onClose, closeLabel, children, footer }: SheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel} type="button">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

interface ConfirmProps {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, text, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="scrim center" onClick={onCancel} role="presentation">
      <div
        className="confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-icon">
          <Icon name="alert" size={24} />
        </div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
