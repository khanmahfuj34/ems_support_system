"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: number;
  variant: ToastVariant;
  duration: number;
};

type ToastApi = {
  show: (toast: ToastInput) => void;
  success: (toast: Omit<ToastInput, "variant">) => void;
  error: (toast: Omit<ToastInput, "variant">) => void;
  dismiss: (id: number) => void;
};

const DEFAULT_DURATION = 5000;

const ToastContext = createContext<ToastApi | null>(null);

const VARIANT_STYLES = {
  success: {
    container: "border-emerald-200 bg-emerald-50/95 text-emerald-900",
    icon: "bg-emerald-100 text-emerald-600",
    description: "text-emerald-700",
    close: "text-emerald-400 hover:text-emerald-600",
    iconNode: CheckCircle2,
  },
  error: {
    container: "border-red-200 bg-red-50/95 text-red-900",
    icon: "bg-red-100 text-red-500",
    description: "text-red-700",
    close: "text-red-400 hover:text-red-600",
    iconNode: AlertCircle,
  },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current;
      const duration = input.duration ?? DEFAULT_DURATION;
      const toast: ToastItem = { ...input, id, variant: input.variant ?? "success", duration };

      setToasts((current) => [...current.slice(-3), toast]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (toast) => show({ ...toast, variant: "success" }),
      error: (toast) => show({ ...toast, variant: "error" }),
      dismiss,
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[80] flex w-[min(calc(100vw-2rem),360px)] flex-col gap-2"
      >
        {toasts.map((toast) => {
          const styles = VARIANT_STYLES[toast.variant];
          const IconNode = styles.iconNode;
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm animate-in fade-in-80 slide-in-from-top-2 duration-200",
                styles.container,
              )}
            >
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center shrink-0",
                  styles.icon,
                )}
              >
                <IconNode className="size-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold leading-5">{toast.title}</p>
                {toast.description && (
                  <p className={cn("mt-0.5 leading-4", styles.description)}>
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className={cn("p-1 shrink-0 transition-colors cursor-pointer", styles.close)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
