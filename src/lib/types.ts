export type DatePrecision = "unknown" | "year" | "month" | "exact";
export type ReadingStatus =
    | "planned"
    | "reading"
    | "finished"
    | "paused"
    | "dnf";
export type ReadKind = "first" | "reread";

export interface Series {
    id: string;
    title: string;
    author: string;
    description: string;
    cover_image_url: string;
    color: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Book {
    id: string;
    series_id: string | null;
    title: string;
    author: string;
    sort_order: number;
    pages: number;
    category: string;
    format: string;
    cover_image_url: string;
    accent_color: string;
    publication_year: number | null;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface BookWithMeta extends Book {
    series?: Series;
    entries: ReadingEntry[];
    readCount: number;
    latestEntry?: ReadingEntry;
}

export interface ReadingEntry {
    id: string;
    book_id: string;
    status: ReadingStatus;
    read_kind: ReadKind;
    start_value: string;
    start_precision: DatePrecision;
    end_value: string;
    end_precision: DatePrecision;
    rating: number | null;
    review: string;
    period_label: string;
    entry_order: number;
    created_at: string;
    updated_at: string;
}

export type ModalState =
    | { type: "book"; book?: Book }
    | { type: "series"; series?: Series }
    | { type: "entry"; entry?: ReadingEntry; bookId?: string };
