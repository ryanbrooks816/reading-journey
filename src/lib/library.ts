import type { Book, Series, ReadingEntry } from "./types";

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
