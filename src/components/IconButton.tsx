import { ReactNode } from "react";

export default function IconButton({
    label,
    onClick,
    children,
    disabled = false,
    className = "",
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            className={`icon-button ${className}`}
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
