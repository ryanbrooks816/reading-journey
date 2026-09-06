import { ReactNode } from "react";

export type PageMetric = {
    label: string;
    value: ReactNode;
};

export default function MetricStrip({ metrics }: { metrics: PageMetric[] }) {
    return (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
            {metrics.map((metric) => (
                <span
                    key={metric.label}
                    className="grid shrink-0 gap-1 border-l border-[rgba(68,48,25,0.16)] pl-3 font-sans text-[0.68rem] font-extrabold uppercase text-[var(--muted)]"
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
