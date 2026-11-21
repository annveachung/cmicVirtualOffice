import { useEffect, useRef, useState } from 'react';
import { STATUSES, statusInfo, type StatusId } from '@little-office/shared';
import { StatusIcon } from './StatusIcon';

interface Props {
  status: StatusId;
  onChange: (s: StatusId) => void;
}

/** Top-bar status dropdown: "● Working ▾" → pick from the list. Shown next to your name tag. */
export function StatusPicker({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = statusInfo(status);

  // close on outside click or Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="status-picker" ref={ref}>
      <button
        className="pixel-btn icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Set your status"
      >
        <StatusIcon status={status} />
        <span className="btn-label">{current.label}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="status-menu pixel-panel" role="listbox" aria-label="Your status">
          {STATUSES.map((s) => (
            <li key={s.id}>
              <button
                role="option"
                aria-selected={s.id === status}
                className={`status-option${s.id === status ? ' selected' : ''}`}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                <StatusIcon status={s.id} /> {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
