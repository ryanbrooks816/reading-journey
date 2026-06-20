import { ReactNode } from "react";

export default function IconTextButton({
    label,
    onClick,
    children,
    className,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <button
            className={`bg-[var(--button-bg)] text-ink inline-flex min-h-[2.35rem] items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] px-3 font-bold transition duration-150 ${className || ""}`}
            onClick={onClick}
            type="button"
        >
            {children}
            <span>{label}</span>
        </button>
    );
}
