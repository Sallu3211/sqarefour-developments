"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind, action?: ToastItem["action"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback(
    (message: string, kind: ToastKind = "success", action?: ToastItem["action"]) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, kind, action }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, action ? 5000 : 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              t.kind === "success"
                ? "bg-emerald-600 text-white ring-emerald-700"
                : t.kind === "error"
                ? "bg-red-600 text-white ring-red-700"
                : "bg-slate-800 text-white ring-slate-900"
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  setToasts((list) => list.filter((x) => x.id !== t.id));
                }}
                className="shrink-0 rounded-lg bg-white/20 px-2 py-1 text-xs font-semibold hover:bg-white/30"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
