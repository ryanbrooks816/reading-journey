import { Loader2, Save } from "lucide-react";

export default function FormActions({
    saving,
    onCancel,
    disabled = false,
    saveLabel = "Save",
}: {
    saving: boolean;
    onCancel: () => void;
    disabled?: boolean;
    saveLabel?: string;
}) {
    return (
        <div className="form-actions">
            <button
                className="icon-button muted"
                onClick={onCancel}
                type="button"
            >
                Cancel
            </button>
            <button
                className="icon-button primary"
                disabled={saving || disabled}
                type="submit"
            >
                {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                ) : (
                    <Save size={16} />
                )}
                <span>{saveLabel}</span>
            </button>
        </div>
    );
}
