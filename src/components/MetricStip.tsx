import { ReactNode } from "react";

export type PageMetric = {
    label: string;
    value: ReactNode;
};

export default function MetricStrip({ metrics }: { metrics: PageMetric[] }) {
    return (
        <div className="grid min-w-[min(470px,48vw)] grid-cols-4 max-[760px]:w-full max-[760px]:min-w-0 max-[760px]:grid-cols-2 max-[760px]:gap-y-3">
            {metrics.map((metric) => (
                <span
                    key={metric.label}
                    className="grid gap-1 border-l border-[rgba(68,48,25,0.16)] pl-3 font-sans text-[0.68rem] font-extrabold uppercase text-[var(--muted)]"
                >
                    <strong className="font-display text-xl font-[760] leading-none text-[var(--ink)]">
                        {metric.value}
                    </strong>
                    <span>{metric.label}</span>
                </span>
            ))}
        </div>
    );
}
