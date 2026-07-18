import React, { useState, useEffect } from 'react';

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-[95vw] max-w-sm sm:max-w-md overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 m-4">
        <div className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        </div>
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 flex justify-end space-x-3 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                : 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromptDialog({
  isOpen,
  title,
  label,
  defaultValue = "",
  confirmText = "Save",
  cancelText = "Cancel",
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (val: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-[95vw] max-w-sm sm:max-w-md overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 m-4">
        <div className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">{title}</h3>
          {label && <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{label}</label>}
          <input
            type="text"
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onConfirm(value);
                onClose();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
        </div>
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 flex justify-end space-x-3 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(value); onClose(); }}
            className="px-4 py-2 text-sm font-medium text-neutral-900 dark:text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-[0_0_15px_rgba(217,119,6,0.3)]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AlertDialog({
  isOpen,
  title,
  message,
  confirmText = "OK",
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-[95vw] max-w-sm sm:max-w-md overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 m-4">
        <div className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        </div>
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 flex justify-end border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-neutral-900 dark:text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-[0_0_15px_rgba(217,119,6,0.3)]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
