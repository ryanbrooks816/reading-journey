import { Archive, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { displayEntryRange, entrySortValue } from "../lib/dates";
import { titleCase } from "../lib/format";
import type { BookWithMeta, ReadingEntry, ReadingStatus } from "../lib/types";
import BookCover from "./BookCover";
import IconButton from "./IconButton";
import RatingBadge from "./RatingBadge";
import StatusBadge from "./StatusBadge";

export function timelineMonthKey(entry: ReadingEntry): string {
    const value = entry.end_value || entry.start_value;
    const precision = entry.end_value
        ? entry.end_precision
        : entry.start_precision;

    if (!value || precision === "unknown") {
        return "Undated";
    }

    if (precision === "year") {
        return value.slice(0, 4) + "-flex";
    }

    return value.slice(0, 7);
}

export function timelineMonthLabel(value: string): string {
    if (value === "Undated") {
        return "Undated";
    }
    if (value.endsWith("-flex")) {
        return value.slice(0, 4);
    }
    const [year, month] = value.split("-");
    if (!year || !month) {
        return value;
    }
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
        undefined,
        {
            month: "long",
            year: "numeric",
        },
    );
}

export function groupTimelineEntries(entries: ReadingEntry[]) {
    const groups = new Map<
        string,
        { key: string; label: string; entries: ReadingEntry[] }
    >();

    for (const entry of entries) {
        const key = timelineMonthKey(entry);
        const current = groups.get(key) ?? {
            key,
            label: timelineMonthLabel(key),
            entries: [],
        };
        current.entries.push(entry);
        groups.set(key, current);
    }

    return Array.from(groups.values());
}

export function HistoryPage({
    entries,
    books,
    onEditEntry,
    onDeleteEntry,
    onSelectBook,
}: {
    entries: ReadingEntry[];
    books: BookWithMeta[];
    onEditEntry: (entry: ReadingEntry) => void;
    onDeleteEntry: (id: string) => void;
    onSelectBook: (id: string) => void;
}) {
    const [filter, setFilter] = useState<ReadingStatus | "all">("all");
    const bookById = new Map(books.map((book) => [book.id, book]));
    const visible = entries
        .filter((entry) => filter === "all" || entry.status === filter)
        .slice()
        .sort(
            (a, b) =>
                entrySortValue(b) - entrySortValue(a) ||
                b.entry_order - a.entry_order,
        );
    const groups = groupTimelineEntries(visible);

    return (
        <section className="panel">
            <div className="panel-heading">
                <div>
                    <span className="kicker">
                        <Archive size={16} />
                        Chronicle
                    </span>
                    <h2>Chronicle</h2>
                </div>
                <div className="segmented">
                    {(["all", "finished", "reading", "planned"] as const).map(
                        (item) => (
                            <button
                                key={item}
                                className={filter === item ? "active" : ""}
                                onClick={() => setFilter(item)}
                                type="button"
                            >
                                {titleCase(item)}
                            </button>
                        ),
                    )}
                </div>
            </div>

            <div className="history-river">
                {groups.map((group) => (
                    <section className="history-month" key={group.key}>
                        <div className="history-date-label">{group.label}</div>
                        <div className="history-month-items">
                            {group.entries.map((entry) => {
                                const book = bookById.get(entry.book_id);
                                if (!book) {
                                    return null;
                                }
                                return (
                                    <article
                                        className="history-item"
                                        key={entry.id}
                                    >
                                        <div className="history-marker" />
                                        <button
                                            onClick={() =>
                                                onSelectBook(book.id)
                                            }
                                            type="button"
                                        >
                                            <BookCover
                                                book={book}
                                                scale={0.68}
                                            />
                                        </button>
                                        <div className="history-copy">
                                            <div className="history-copy-top">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge
                                                        status={entry.status}
                                                    />
                                                    {entry.read_kind ===
                                                    "reread" ? (
                                                        <span className="chip">
                                                            Reread
                                                        </span>
                                                    ) : null}
                                                    {entry.rating ? (
                                                        <RatingBadge
                                                            rating={
                                                                entry.rating
                                                            }
                                                        />
                                                    ) : null}
                                                </div>
                                                <div
                                                    className={
                                                        "history-actions"
                                                    }
                                                >
                                                    <IconButton
                                                        label="Edit entry"
                                                        onClick={() =>
                                                            onEditEntry(entry)
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </IconButton>
                                                    <IconButton
                                                        label="Delete entry"
                                                        onClick={() =>
                                                            onDeleteEntry(
                                                                entry.id,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </div>
                                            </div>
                                            <h3>{book.title}</h3>
                                            <p>{displayEntryRange(entry)}</p>
                                            {entry.review ? (
                                                <blockquote>
                                                    {entry.review}
                                                </blockquote>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
}
