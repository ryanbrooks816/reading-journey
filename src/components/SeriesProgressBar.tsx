import { CSSProperties } from "react";

export default function SeriesProgressBar({
    color,
    total,
    read,
    queued = 0,
}: {
    color: string;
    total: number;
    read: number;
    queued?: number;
}) {
    const readPercent = total ? Math.round((read / total) * 100) : 0;
    const queuedPercent = total
        ? Math.round(((read + queued) / total) * 100)
        : readPercent;

    return (
        <div
            className="series-progress-bar"
            style={{ "--series-color": color } as CSSProperties}
        >
            <i style={{ width: `${Math.max(readPercent, read ? 5 : 0)}%` }} />
            {queued ? (
                <b style={{ width: `${Math.max(queuedPercent, 5)}%` }} />
            ) : null}
        </div>
    );
}
