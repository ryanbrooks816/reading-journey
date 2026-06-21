import { BookMarked, Info } from "lucide-react";
import { useState, FormEvent } from "react";
import type {
    DatePrecision,
    BookWithMeta,
    ReadingEntry,
    ReadingStatus,
} from "../lib/types";
import FormActions from "./FormActions";

export default function EntryForm({
    entry,
    books,
    defaultBookId,
    saving,
    onCancel,
    onSubmit,
}: {
    entry?: ReadingEntry;
    books: BookWithMeta[];
    defaultBookId?: string;
    saving: boolean;
    onCancel: () => void;
    onSubmit: (payload: Partial<ReadingEntry>) => void;
}) {
    const [form, setForm] = useState({
        book_id: entry?.book_id ?? defaultBookId ?? books[0]?.id ?? "",
        status: entry?.status ?? "finished",
        read_kind: entry?.read_kind ?? "first",
        start_value: entry?.start_value ?? "",
        start_precision: entry?.start_precision ?? "unknown",
        end_value: entry?.end_value ?? "",
        end_precision: entry?.end_precision ?? "unknown",
        rating: entry?.rating ?? "",
        review: entry?.review ?? "",
        period_label: entry?.period_label ?? "",
        entry_order: entry?.entry_order ?? Date.now(),
    });
    const selectedBook = books.find((book) => book.id === form.book_id);
    const alreadyReading =
        form.status === "reading" &&
        selectedBook?.entries.some(
            (item) => item.status === "reading" && item.id !== entry?.id,
        );

    function submit(event: FormEvent) {
        event.preventDefault();
        if (alreadyReading) {
            return;
        }
        onSubmit({
            ...form,
            rating: form.rating === "" ? null : Number(form.rating),
            status: form.status as ReadingStatus,
            read_kind: form.read_kind as "first" | "reread",
            start_precision: form.start_precision as DatePrecision,
            end_precision: form.end_precision as DatePrecision,
        });
    }

    return (
        <form onSubmit={submit}>
            <div className="modal-heading">
                <span className="kicker">
                    <BookMarked size={20} />
                </span>
                <h2>{entry ? "Edit entry" : "Reading entry"}</h2>
            </div>
            <p className="form-intro">
                Use this to record a reading state for one book: planned for
                later, reading now, finished, paused, or DNF.
            </p>
            {alreadyReading && selectedBook ? (
                <div className="form-alert">
                    <Info size={16} />
                    <span>
                        You are already reading {selectedBook.title}. Finish or
                        edit that entry before starting another active read.
                    </span>
                </div>
            ) : null}
            <div className="form-grid two">
                <label className="two-span">
                    <span>Book</span>
                    <select
                        value={form.book_id}
                        onChange={(event) =>
                            setForm({ ...form, book_id: event.target.value })
                        }
                    >
                        {books.map((book) => (
                            <option value={book.id} key={book.id}>
                                {book.title}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>Status</span>
                    <select
                        value={form.status}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                status: event.target.value as ReadingStatus,
                            })
                        }
                    >
                        <option value="planned">Planned</option>
                        <option value="reading">Reading</option>
                        <option value="finished">Finished</option>
                        <option value="paused">Paused</option>
                        <option value="dnf">DNF</option>
                    </select>
                </label>
                <label>
                    <span>Read type</span>
                    <select
                        value={form.read_kind}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                read_kind: event.target.value as
                                    | "first"
                                    | "reread",
                            })
                        }
                    >
                        <option value="first">First read</option>
                        <option value="reread">Reread</option>
                    </select>
                </label>
                <FlexibleDateField
                    label="Start"
                    value={form.start_value}
                    precision={form.start_precision as DatePrecision}
                    onChange={(value, precision) =>
                        setForm({
                            ...form,
                            start_value: value,
                            start_precision: precision,
                        })
                    }
                />
                <FlexibleDateField
                    label="End"
                    value={form.end_value}
                    precision={form.end_precision as DatePrecision}
                    onChange={(value, precision) =>
                        setForm({
                            ...form,
                            end_value: value,
                            end_precision: precision,
                        })
                    }
                />
                <label>
                    <span>Rating</span>
                    <select
                        value={form.rating}
                        onChange={(event) =>
                            setForm({ ...form, rating: event.target.value })
                        }
                    >
                        <option value="">Unrated</option>
                        {Array.from(
                            { length: 10 },
                            (_, index) => index + 1,
                        ).map((rating) => (
                            <option value={rating} key={rating}>
                                {rating}/10
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>Period label</span>
                    <input
                        value={form.period_label}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                period_label: event.target.value,
                            })
                        }
                        placeholder="Read before this log"
                    />
                </label>
                <label className="two-span">
                    <span>Review</span>
                    <textarea
                        value={form.review}
                        onChange={(event) =>
                            setForm({ ...form, review: event.target.value })
                        }
                    />
                </label>
            </div>
            <FormActions
                saving={saving}
                disabled={Boolean(alreadyReading)}
                onCancel={onCancel}
                saveLabel={alreadyReading ? "Already reading" : "Save"}
            />
        </form>
    );
}

export function FlexibleDateField({
    label,
    value,
    precision,
    onChange,
}: {
    label: string;
    value: string;
    precision: DatePrecision;
    onChange: (value: string, precision: DatePrecision) => void;
}) {
    const inputType =
        precision === "exact"
            ? "date"
            : precision === "month"
              ? "month"
              : "text";
    const placeholder =
        precision === "year"
            ? "2026"
            : precision === "month"
              ? "2026-06"
              : precision === "exact"
                ? ""
                : "Flexible";

    return (
        <div className="date-field">
            <label>
                <span>{label} precision</span>
                <select
                    value={precision}
                    onChange={(event) =>
                        onChange(value, event.target.value as DatePrecision)
                    }
                >
                    <option value="unknown">Unknown</option>
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                    <option value="exact">Exact</option>
                </select>
            </label>
            <label>
                <span>{label} date</span>
                <input
                    type={inputType}
                    value={value}
                    placeholder={placeholder}
                    disabled={precision === "unknown"}
                    onChange={(event) =>
                        onChange(event.target.value, precision)
                    }
                />
            </label>
        </div>
    );
}
