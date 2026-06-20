import { X } from "lucide-react";
import type { View } from "./Sidebar";

export interface AppToast {
    id: number;
    title: string;
    detail: string;
    tone?: "success" | "info" | "warning";
    action?: {
        label: string;
        view: View;
        bookId?: string;
    };
}

export default function ToastStack({
    toasts,
    onFollow,
    onDismiss,
}: {
    toasts: AppToast[];
    onFollow: (toast: AppToast) => void;
    onDismiss: (id: number) => void;
}) {
    if (!toasts.length) {
        return null;
    }

    return (
        <div
            className="fixed right-4 bottom-4 z-80 grid w-[min(390px,calc(100vw-2rem))] gap-2"
            role="status"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <article
                    className={`toast ${toast.tone ?? "info"} grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3`}
                    key={toast.id}
                >
                    <div className="min-w-0">
                        <strong className="toast-title">{toast.title}</strong>
                        <p className="toast-detail">{toast.detail}</p>
                    </div>

                    {toast.action ? (
                        <button
                            className="toast-link shrink-0"
                            onClick={() => onFollow(toast)}
                            type="button"
                        >
                            {toast.action.label}
                        </button>
                    ) : null}

                    <button
                        className="toast-close shrink-0"
                        onClick={() => onDismiss(toast.id)}
                        type="button"
                        aria-label="Dismiss notification"
                    >
                        <X size={14} />
                    </button>
                </article>
            ))}
        </div>
    );
}
