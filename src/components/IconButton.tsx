import { ReactNode } from "react";

export default function IconButton({
    label,
    onClick,
    children,
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            className="icon-button"
            disabled={disabled}
            onClick={onClick}
            type="button"
            title={label}
            aria-label={label}
        >
            {children}
            <span>{label}</span>
        </button>
    );
}
