// frontend/src/components/ui/Modal.jsx
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

// <dialog> nativo: Esc, trampa de foco y backdrop sin dependencias.
export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  footer,
  children,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onMouseDown={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${sizes[size]} rounded-xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50`}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
