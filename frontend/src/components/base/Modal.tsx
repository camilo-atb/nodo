import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/50 rounded-2xl p-0 max-w-lg w-full shadow-2xl border
        bg-white text-[#111318] border-gray-200
        dark:bg-[#101317] dark:text-[#f4f6f8] dark:border-[#20262d]"
    >
      <div className="p-5">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 dark:text-[#68717d] dark:hover:text-white text-xl leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
