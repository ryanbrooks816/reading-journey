import { BarChart3, CalendarDays, Clock3, Layers3 } from "lucide-react";
import { buildStats } from "../lib/library";
import { formatNumber } from "../lib/format";
import type { BookWithMeta } from "../lib/types";
import { PageHero } from "./PageHero";
import SeriesProgressBar from "./SeriesProgressBar";

export default function StatsPage({
    stats,
    books,
}: {
    stats: ReturnType<typeof buildStats>;
    books: BookWithMeta[];
}) {
    const maxYearPages = Math.max(...stats.yearly.map((item) => item.pages), 1);
    const maxMonthCount = Math.max(
        ...stats.monthly.map((item) => item.count),
        1,
    );

    return (
        <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3 max-[1180px]:grid-cols-1">
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
                    { label: "Pages", value: formatNumber(stats.pagesRead) },
                    {
                        label: "Rating",
                        value: stats.averageRating
                            ? `${stats.averageRating}/10`
                            : "Open",
                    },
                ]}
            />

            <section className="panel">
                <div className="panel-heading">
                    <div>
                        <span className="kicker">
                            <CalendarDays size={16} />
                            Yearly
                        </span>
                        <h2>Yearly pages</h2>
                    </div>
                </div>
                <div className="panel-list">
                    {stats.yearly.map((item) => (
                        <div className="chart-row" key={item.year}>
                            <span>{item.year}</span>
                            <div>
                                <i
                                    style={{
                                        width: `${Math.max(8, (item.pages / maxYearPages) * 100)}%`,
                                    }}
                                />
                            </div>
                            <strong>
                                {item.count} books / {formatNumber(item.pages)}{" "}
                                pages
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
                <div className="month-grid">
                    {stats.monthly.map((item) => (
                        <div className="month-bar" key={item.month}>
                            <div
                                style={{
                                    height: `${Math.max(10, (item.count / maxMonthCount) * 100)}%`,
                                }}
                            />
                            <span>{item.label}</span>
                            <strong>{item.count}</strong>
                        </div>
                    ))}
                </div>
            </section>

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
                            <p>{formatNumber(item.pages)} pages shelved</p>
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
    );
}
