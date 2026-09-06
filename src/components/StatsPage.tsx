import { BarChart3, CalendarDays, Clock3, Layers3 } from "lucide-react";
import { buildStats } from "../lib/library";
import { formatNumber } from "../lib/format";
import type { BookWithMeta } from "../lib/types";
import { PageHero } from "./PageHero";
import SeriesProgressBar from "./SeriesProgressBar";

function formatMonthAxisLabel(value: string) {
    if (value === "Undated") {
        return "Open";
    }
    if (value.endsWith("-flex")) {
        return value.slice(0, 4);
    }

    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (!year || !month || Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
    });
}

export default function StatsPage({
    stats,
    books,
}: {
    stats: ReturnType<typeof buildStats>;
    books: BookWithMeta[];
}) {
    const maxYearWords = Math.max(...stats.yearly.map((item) => item.words), 1);
    const maxMonthCount = Math.max(
        ...stats.monthly.map((item) => item.count),
        1,
    );
    const monthChart = {
        width: 720,
        height: 260,
        padding: { top: 18, right: 18, bottom: 42, left: 34 },
    };
    const monthPlotBottom = monthChart.height - monthChart.padding.bottom;
    const monthPoints = stats.monthly.map((item, index) => {
        const x =
            stats.monthly.length === 1
                ? monthChart.width / 2
                : monthChart.padding.left +
                  (index / (stats.monthly.length - 1)) *
                      (monthChart.width -
                          monthChart.padding.left -
                          monthChart.padding.right);
        const y =
            monthChart.padding.top +
            (1 - item.count / maxMonthCount) *
                (monthPlotBottom - monthChart.padding.top);
        return { ...item, x, y };
    });
    const monthLine = monthPoints
        .map((point) => `${point.x},${point.y}`)
        .join(" ");
    const monthLabelStep = Math.max(1, Math.ceil(monthPoints.length / 7));
    const monthTicks = Array.from(
        new Set([0, Math.ceil(maxMonthCount / 2), maxMonthCount]),
    ).sort((a, b) => b - a);

    return (
        <div className="grid gap-3">
            <PageHero
                icon={<BarChart3 size={16} />}
                kicker="Reading weather"
                title="Overview"
                metrics={[
                    {
                        label: "Finished",
                        value: formatNumber(stats.finishedEntries),
                    },
                    {
                        label: "Books",
                        value: formatNumber(stats.uniqueFinishedBooks),
                    },
                    { label: "Words", value: formatNumber(stats.wordsRead) },
                    {
                        label: "Rating",
                        value: stats.averageRating
                            ? `${stats.averageRating}/10`
                            : "Open",
                    },
                ]}
            />

            <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-start gap-3 max-[1180px]:grid-cols-1">
                <div>
                    <section className="panel mb-3">
                        <div className="panel-heading">
                            <div>
                                <span className="kicker">
                                    <CalendarDays size={16} />
                                    Yearly
                                </span>
                                <h2>Yearly words</h2>
                            </div>
                        </div>
                        <div className="panel-list">
                            {stats.yearly.map((item) => (
                                <div className="chart-row" key={item.year}>
                                    <span>{item.year}</span>
                                    <div>
                                        <i
                                            style={{
                                                width: `${Math.max(8, (item.words / maxYearWords) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <strong>
                                        {item.count} books /{" "}
                                        {formatNumber(item.words)} words
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-heading">
                            <div>
                                <span className="kicker">
                                    <Clock3 size={16} />
                                    Monthly
                                </span>
                                <h2>Monthly rhythm</h2>
                            </div>
                        </div>
                        <svg
                            aria-label="Books finished per month over time"
                            className="month-line-chart"
                            role="img"
                            viewBox={`0 0 ${monthChart.width} ${monthChart.height}`}
                        >
                            {monthTicks.map((tick) => {
                                const y =
                                    monthChart.padding.top +
                                    (1 - tick / maxMonthCount) *
                                        (monthPlotBottom -
                                            monthChart.padding.top);
                                return (
                                    <g key={tick}>
                                        <line
                                            className="month-chart-grid-line"
                                            x1={monthChart.padding.left}
                                            x2={
                                                monthChart.width -
                                                monthChart.padding.right
                                            }
                                            y1={y}
                                            y2={y}
                                        />
                                        <text
                                            className="month-chart-y-label"
                                            x={monthChart.padding.left - 10}
                                            y={y + 4}
                                        >
                                            {tick}
                                        </text>
                                    </g>
                                );
                            })}
                            <line
                                className="month-chart-axis-line"
                                x1={monthChart.padding.left}
                                x2={monthChart.width - monthChart.padding.right}
                                y1={monthPlotBottom}
                                y2={monthPlotBottom}
                            />
                            {monthLine ? (
                                <polyline
                                    className="month-chart-line"
                                    points={monthLine}
                                />
                            ) : null}
                            {monthPoints.map((point, index) => (
                                <g key={point.month}>
                                    <circle
                                        className="month-chart-point"
                                        cx={point.x}
                                        cy={point.y}
                                        r="4"
                                    />
                                    {index % monthLabelStep === 0 ||
                                    index === monthPoints.length - 1 ? (
                                        <text
                                            className="month-chart-x-label"
                                            x={point.x}
                                            y={monthChart.height - 12}
                                        >
                                            {formatMonthAxisLabel(point.month)}
                                        </text>
                                    ) : null}
                                </g>
                            ))}
                        </svg>
                    </section>
                </div>

                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <span className="kicker">
                                <Layers3 size={16} />
                                Shelves
                            </span>
                            <h2>Shelves</h2>
                        </div>
                    </div>
                    <div className="category-grid">
                        {stats.categories.map((item) => (
                            <div className="category-card" key={item.category}>
                                <span>{item.category}</span>
                                <strong>{item.books} books</strong>
                                <p>{formatNumber(item.words)} words shelved</p>
                            </div>
                        ))}
                    </div>
                    <div className="series-progress-list">
                        {Array.from(
                            books
                                .filter((book) => book.series)
                                .reduce<Map<string, BookWithMeta[]>>(
                                    (map, book) => {
                                        const key = book.series!.id;
                                        map.set(key, [
                                            ...(map.get(key) ?? []),
                                            book,
                                        ]);
                                        return map;
                                    },
                                    new Map(),
                                )
                                .entries(),
                        ).map(([id, group]) => {
                            const series = group[0].series!;
                            const read = group.filter(
                                (book) => book.readCount > 0,
                            ).length;
                            return (
                                <div className="series-progress" key={id}>
                                    <span>{series.title}</span>
                                    <SeriesProgressBar
                                        color={series.color}
                                        total={group.length}
                                        read={read}
                                    />
                                    <strong>
                                        {read}/{group.length}
                                    </strong>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
