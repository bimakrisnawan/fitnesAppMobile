"use client";

// Toasts and confirm dialogs, available anywhere via useToast() / useConfirm().
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface FeedbackValue {
  toast: (text: string, tone?: Tone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((text: string, tone: Tone = "success") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const Icon = { success: CircleCheck, error: CircleAlert, info: Info };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const I = Icon[t.tone];
          return (
            <div key={t.id} className={`toast ${t.tone}`}>
              <I size={18} />
              <span>{t.text}</span>
            </div>
          );
        })}
      </div>
      <Modal open={!!pending} onClose={() => close(false)} title={pending?.title ?? ""} width={440}>
        {pending?.body && <div className="muted">{pending.body}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={() => close(false)}>
            Cancel
          </button>
          <button className={`btn ${pending?.danger ? "danger-solid" : "primary"}`} onClick={() => close(true)} autoFocus>
            {pending?.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useToast() {
  const v = useContext(FeedbackContext);
  if (!v) throw new Error("useToast must be used inside <FeedbackProvider>");
  return v.toast;
}

export function useConfirm() {
  const v = useContext(FeedbackContext);
  if (!v) throw new Error("useConfirm must be used inside <FeedbackProvider>");
  return v.confirm;
}
