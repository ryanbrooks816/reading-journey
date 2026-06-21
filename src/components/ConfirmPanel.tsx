import { Loader2, Check } from "lucide-react";
import { ReactNode } from "react";

export default function ConfirmPanel({
    icon,
    title,
    detail,
    confirmLabel,
    saving,
    onCancel,
    onConfirm,
}: {
    icon: ReactNode;
    title: string;
    detail: string;
    confirmLabel: string;
    saving: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <section className="confirm-panel">
            <div className="modal-heading">
                <span>{icon}</span>
                <h2>{title}</h2>
            </div>
            <p>{detail}</p>
            <div className="form-actions">
                <button
                    className="ghost-button"
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </button>
                <button
                    className="primary-button"
                    disabled={saving}
                    onClick={onConfirm}
                    type="button"
                >
                    {saving ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : (
                        <Check size={16} />
                    )}
                    <span>{confirmLabel}</span>
                </button>
            </div>
        </section>
    );
}
