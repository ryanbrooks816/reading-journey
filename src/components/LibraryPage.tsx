import { BookOpen, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { Book, BookWithMeta, ReadingEntry, Series } from "../lib/types";
import { PageHero } from "./PageHero";
import BookCover from "./BookCover";
import { BookDetail } from "./BookDetail";
import IconButton from "./IconButton";

export default function LibraryPage({
    books,
    series,
    selectedBook,
    onSelectBook,
    onAddBook,
    onEditBook,
    onDeleteBook,
    onStart,
    onQueue,
    onAddEntry,
    onEditEntry,
    onDeleteEntry,
}: {
    books: BookWithMeta[];
    series: Series[];
    selectedBook?: BookWithMeta;
    onSelectBook: (id: string) => void;
    onAddBook: () => void;
    onEditBook: (book: Book) => void;
    onDeleteBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onQueue: (book: BookWithMeta) => void;
    onAddEntry: (bookId: string) => void;
    onEditEntry: (entry: ReadingEntry) => void;
    onDeleteEntry: (id: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const categories = Array.from(
        new Set(books.map((book) => book.category)),
    ).sort();
    const filtered = books.filter((book) => {
        const matchesQuery =
            `${book.title} ${book.author} ${book.series?.title ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase());
        const matchesCategory =
            category === "all" || book.category === category;
        return matchesQuery && matchesCategory;
    });

    return (
        <div className="grid gap-3">
            <PageHero
                icon={<BookOpen size={16} />}
                kicker="Library"
                title="Library"
                actions={
                    <IconButton label="Book" onClick={onAddBook}>
                        <Plus size={16} />
                    </IconButton>
                }
            />

            <div className="grid grid-cols-[minmax(300px,0.92fr)_minmax(390px,1.08fr)] items-stretch gap-4 max-[1180px]:grid-cols-1">
                <section className="panel scroll-panel">
                    <div className="mb-3 grid grid-cols-1 gap-2">
                        <label className="search-field">
                            <Search size={17} />
                            <input
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Search shelves"
                            />
                        </label>
                        <label className="select-field">
                            <SlidersHorizontal size={17} />
                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(event.target.value)
                                }
                            >
                                <option value="all">All categories</option>
                                {categories.map((item) => (
                                    <option value={item} key={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(98px,1fr))] gap-2">
                        {filtered.map((book) => (
                            <button
                                className={`shelf-book ${selectedBook?.id === book.id ? "selected" : ""}`}
                                key={book.id}
                                onClick={() => onSelectBook(book.id)}
                                type="button"
                            >
                                <BookCover book={book} />
                                <span>
                                    {book.series?.title ?? book.category}
                                </span>
                                <strong>{book.title}</strong>
                                <i>
                                    {book.readCount
                                        ? `${book.readCount} read`
                                        : "Unread"}
                                </i>
                            </button>
                        ))}
                    </div>
                </section>

                <aside className="panel scroll-panel sticky-detail">
                    {selectedBook ? (
                        <BookDetail
                            book={selectedBook}
                            series={series}
                            onEditBook={onEditBook}
                            onDeleteBook={onDeleteBook}
                            onStart={onStart}
                            onQueue={onQueue}
                            onAddEntry={onAddEntry}
                            onEditEntry={onEditEntry}
                            onDeleteEntry={onDeleteEntry}
                        />
                    ) : (
                        <p className="message-panel">
                            Select a book to open its details.
                        </p>
                    )}
                </aside>
            </div>
        </div>
    );
}
