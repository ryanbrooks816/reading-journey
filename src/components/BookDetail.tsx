import { ListPlus, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { displayEntryRange, entrySortValue } from "../lib/dates";
import { formatNumber } from "../lib/format";
import type { Book, BookWithMeta, Series, ReadingEntry } from "../lib/types";
import BookCover from "./BookCover";
import IconButton from "./IconButton";
import StatusBadge from "./StatusBadge";
import RatingBadge from "./RatingBadge";

export function BookDetail({
    book,
    onEditBook,
    onDeleteBook,
    onStart,
    onQueue,
    onAddEntry,
    onEditEntry,
    onDeleteEntry,
}: {
    book: BookWithMeta;
    series: Series[];
    onEditBook: (book: Book) => void;
    onDeleteBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onQueue: (book: BookWithMeta) => void;
    onAddEntry: (bookId: string) => void;
    onEditEntry: (entry: ReadingEntry) => void;
    onDeleteEntry: (id: string) => void;
}) {
    const sortedEntries = book.entries
        .slice()
        .sort(
            (a, b) =>
                entrySortValue(b) - entrySortValue(a) ||
                b.entry_order - a.entry_order,
        );

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[118px_minmax(0,1fr)] items-start gap-4 max-[760px]:grid-cols-1">
                <BookCover book={book} scale={1.05} />
                <div className="book-detail min-w-0">
                    <p className="kicker">
                        {book.series?.title ?? book.category}
                    </p>
                    <h2 className="mb-2">{book.title}</h2>
                    <p>{book.author}</p>
                    <div className="flex flex-wrap gap-2 items-center mt-2">
                        <span className="chip">
                            {book.pages
                                ? `${formatNumber(book.pages)} pages`
                                : "Pages open"}
                        </span>
                        <span>{book.publication_year ?? "Year open"}</span>
                        <span>{book.format}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <IconButton label="Start" onClick={() => onStart(book)}>
                    <Play size={16} />
                </IconButton>
                <IconButton label="Plan" onClick={() => onQueue(book)}>
                    <ListPlus size={16} />
                </IconButton>
                <IconButton label="Entry" onClick={() => onAddEntry(book.id)}>
                    <Plus size={16} />
                </IconButton>
                <IconButton label="Edit book" onClick={() => onEditBook(book)}>
                    <Pencil size={16} />
                </IconButton>
                <IconButton
                    label="Delete book"
                    onClick={() => onDeleteBook(book.id)}
                >
                    <Trash2 size={16} />
                </IconButton>
            </div>

            {book.notes ? <p className="detail-notes">{book.notes}</p> : null}

            <div className={"panel-list mt-4"}>
                <div className="flex gap-6 justify-between items-end">
                    <div>
                        <p className="kicker">Entries</p>
                        <h2>Reading sessions</h2>
                    </div>
                    <span className="chip">{book.readCount} finished</span>
                </div>
                {sortedEntries.length ? (
                    sortedEntries.map((entry) => (
                        <article
                            className="flex justify-between gap-4 rounded-lg border border-[var(--line)] bg-[rgba(255,253,247,0.64)] p-4"
                            key={entry.id}
                        >
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <StatusBadge status={entry.status} />
                                    {entry.read_kind === "reread" ? (
                                        <span className="chip">Reread</span>
                                    ) : null}
                                    {entry.rating ? (
                                        <RatingBadge rating={entry.rating} />
                                    ) : null}
                                </div>
                                <p>{displayEntryRange(entry)}</p>
                                {entry.review ? (
                                    <blockquote>{entry.review}</blockquote>
                                ) : null}
                            </div>
                            <div className="flex gap-2 items-center">
                                <IconButton
                                    label="Edit entry"
                                    onClick={() => onEditEntry(entry)}
                                >
                                    <Pencil size={15} />
                                </IconButton>
                                <IconButton
                                    label="Delete entry"
                                    onClick={() => onDeleteEntry(entry.id)}
                                >
                                    <Trash2 size={15} />
                                </IconButton>
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="message-panel">No reading entries yet.</div>
                )}
            </div>
        </div>
    );
}
