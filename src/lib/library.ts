import type {
    Book,
    BookWithMeta,
    Series,
    ReadingEntry,
    FlowNode,
    FlowEdge,
} from "./types";
import { entrySortValue } from "./dates";
import { entryYear, entryMonthKey, formatMonthLabel } from "./dates";

export const emptyLibraryState: LibraryState = {
    series: [],
    books: [],
    entries: [],
    flowNodes: [],
    flowEdges: [],
    generatedAt: "",
};

export interface LibraryState {
    books: Book[];
    series: Series[];
    entries: ReadingEntry[];
    flowNodes: FlowNode[];
    flowEdges: FlowEdge[];
    generatedAt: string;
}

export interface LibraryStats {
    finishedEntries: number;
    uniqueFinishedBooks: number;
    wordsRead: number;
    averageRating: number | null;
    yearly: Array<{
        year: string;
        count: number;
        words: number;
    }>;
    monthly: Array<{
        month: string;
        label: string;
        count: number;
    }>;
    categories: Array<{
        category: string;
        books: number;
        words: number;
    }>;
}

export function isReading(book: Pick<BookWithMeta, "entries">) {
    return book.entries.some((entry) => entry.status === "reading");
}

export function buildLibrary(state: LibraryState) {
    const seriesById = new Map(state.series.map((item) => [item.id, item]));
    const entriesByBook = new Map<string, ReadingEntry[]>();

    // Group all reading entries by their associated book.
    for (const entry of state.entries) {
        entriesByBook.set(entry.book_id, [
            ...(entriesByBook.get(entry.book_id) ?? []),
            entry,
        ]);
    }

    // Create a list of books with their associated metadata.
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

    // Sort the books by their series, sort order, and title.
    books.sort((a, b) => {
        const seriesA = a.series?.sort_order ?? 9999;
        const seriesB = b.series?.sort_order ?? 9999;
        return (
            seriesA - seriesB ||
            a.sort_order - b.sort_order ||
            a.title.localeCompare(b.title)
        );
    });

    // Return the final library state.
    return {
        books,
        series: state.series,
        entries: state.entries,
        flowNodes: state.flowNodes,
        flowEdges: state.flowEdges,
    };
}

export function buildStats(
    books: BookWithMeta[],
    entries: ReadingEntry[],
): LibraryStats {
    const bookById = new Map(books.map((book) => [book.id, book]));
    const finished = entries.filter((entry) => entry.status === "finished");
    const wordsRead = finished.reduce(
        (total, entry) =>
            total + (bookById.get(entry.book_id)?.word_count ?? 0),
        0,
    );
    const ratings = finished
        .map((entry) => entry.rating)
        .filter((rating): rating is number => rating !== null);
    const yearlyMap = new Map<
        string,
        { year: string; count: number; words: number }
    >();
    const monthlyMap = new Map<
        string,
        { month: string; label: string; count: number }
    >();
    const categoryMap = new Map<
        string,
        { category: string; books: number; words: number }
    >();

    for (const entry of finished) {
        const book = bookById.get(entry.book_id);
        const year = entryYear(entry);
        const currentYear = yearlyMap.get(year) ?? { year, count: 0, words: 0 };
        currentYear.count += 1;
        currentYear.words += book?.word_count ?? 0;
        yearlyMap.set(year, currentYear);

        const month = entryMonthKey(entry);
        const currentMonth = monthlyMap.get(month) ?? {
            month,
            label: formatMonthLabel(month),
            count: 0,
        };
        currentMonth.count += 1;
        monthlyMap.set(month, currentMonth);
    }

    for (const book of books) {
        const current = categoryMap.get(book.category) ?? {
            category: book.category,
            books: 0,
            words: 0,
        };
        current.books += 1;
        current.words += book.word_count;
        categoryMap.set(book.category, current);
    }

    return {
        finishedEntries: finished.length,
        uniqueFinishedBooks: new Set(finished.map((entry) => entry.book_id))
            .size,
        wordsRead,
        averageRating: ratings.length
            ? Number(
                  (
                      ratings.reduce((total, rating) => total + rating, 0) /
                      ratings.length
                  ).toFixed(1),
              )
            : null,
        yearly: Array.from(yearlyMap.values()).sort((a, b) => {
            if (a.year === "Undated") return 1;
            if (b.year === "Undated") return -1;
            return b.year.localeCompare(a.year);
        }),
        monthly: Array.from(monthlyMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month),
        ),
        categories: Array.from(categoryMap.values()).sort(
            (a, b) => b.books - a.books,
        ),
    };
}
