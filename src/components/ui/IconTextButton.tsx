import { ReactNode } from "react";

export function IconTextButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            className="bg-[var(--button-bg)] text-ink inline-flex min-h-[2.35rem] items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] px-3 font-bold transition duration-150"
            onClick={onClick}
            type="button"
        >
            {children}
            <span>{label}</span>
        </button>
    );
}
