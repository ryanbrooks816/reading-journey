import { ReactNode } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton";

export default function Modal({
    children,
    onClose,
}: {
    children: ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="modal-shell" role="dialog" aria-modal="true">
            <div className="modal-backdrop" onClick={onClose} />
            <div className="modal-card">
                <IconButton label="Close" onClick={onClose}>
                    <X size={18} />
                </IconButton>
                {children}
            </div>
        </div>
    );
}
