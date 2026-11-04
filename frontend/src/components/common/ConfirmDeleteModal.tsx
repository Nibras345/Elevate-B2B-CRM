import React, { useEffect } from 'react';
import { Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemType?: string; // e.g., 'lead', 'client', 'invoice'
  itemName?: string; // e.g., 'Apex Dynamics'
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  itemType = 'record',
  itemName,
  isDeleting = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isDeleting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Modal Dialog Container */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl z-10 transition-all duration-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Icon and Title */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            {itemName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Target: <span className="font-semibold text-slate-800 dark:text-slate-200">{itemName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Body Text */}
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to delete this {itemType}{itemName ? ` "${itemName}"` : ''}? This action cannot be undone.
        </div>

        {/* Modal Buttons: Cancel and Delete */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmDeleteModal;

