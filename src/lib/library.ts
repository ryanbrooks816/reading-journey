import type { Book, BookWithMeta, Series, ReadingEntry } from "./types";
import { entrySortValue } from "./dates";

export const emptyLibraryState: LibraryState = {
    series: [],
    books: [],
    entries: [],
    generatedAt: "",
};

export interface LibraryState {
    books: Book[];
    series: Series[];
    entries: ReadingEntry[];
    generatedAt: string;
}

export function buildLibrary(state: LibraryState) {
    const seriesById = new Map(state.series.map((item) => [item.id, item]));
    const entriesByBook = new Map<string, ReadingEntry[]>();

    for (const entry of state.entries) {
        entriesByBook.set(entry.book_id, [
            ...(entriesByBook.get(entry.book_id) ?? []),
            entry,
        ]);
    }

    const books: BookWithMeta[] = state.books.map((book) => {
        const entries = entriesByBook.get(book.id) ?? [];
        const sorted = entries
            .slice()
            .sort(
                (a, b) =>
                    entrySortValue(b) - entrySortValue(a) ||
                    b.entry_order - a.entry_order,
            );
        return {
            ...book,
            series: book.series_id ? seriesById.get(book.series_id) : undefined,
            entries,
            readCount: entries.filter((entry) => entry.status === "finished")
                .length,
            latestEntry: sorted[0],
        };
    });

    books.sort((a, b) => {
        const seriesA = a.series?.sort_order ?? 9999;
        const seriesB = b.series?.sort_order ?? 9999;
        return (
            seriesA - seriesB ||
            a.sort_order - b.sort_order ||
            a.title.localeCompare(b.title)
        );
    });

    return { books };
}
