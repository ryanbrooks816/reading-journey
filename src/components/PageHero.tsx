import { ReactNode } from "react";
import MetricStrip from "./MetricStip";
import type { PageMetric } from "./MetricStip";

export function PageHero({
    icon,
    kicker,
    title,
    metrics,
    actions,
}: {
    icon: ReactNode;
    kicker: string;
    title: string;
    metrics?: PageMetric[];
    actions?: ReactNode;
}) {
    return (
        <section
            className={`flex min-h-[4.9rem] items-center justify-between gap-4 rounded-lg border border-[rgba(68,48,25,0.2)] bg-[linear-gradient(180deg,rgba(255,250,240,0.88),rgba(250,241,222,0.68))] px-4 py-3 shadow-[0_12px_34px_rgba(43,31,18,0.06)] max-[760px]:items-start max-[760px]:flex-col`}
        >
            <div>
                <span className="kicker">
                    {icon}
                    {kicker}
                </span>
                <h2
                    className={
                        "mt-0.5 font-display text-[clamp(1.28rem,2vw,1.65rem)] font-[760] leading-[1.02]"
                    }
                >
                    {title}
                </h2>
            </div>
            <div className={`gap-2 flex`}>
                {metrics?.length ? <MetricStrip metrics={metrics} /> : actions}
            </div>
        </section>
    );
}
