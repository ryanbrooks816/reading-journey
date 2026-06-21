import { X } from "lucide-react";
import {
    CSSProperties,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import { libraryApi } from "./lib/api";
import {
    isReading,
    buildLibrary,
    emptyLibraryState,
    type LibraryState,
} from "./lib/library";
import { todayValue } from "./lib/dates";
import { titleCase } from "./lib/format";
import { useStoredPreferences } from "./lib/preferences";
import type { BookWithMeta } from "./lib/types";
import Sidebar from "./components/Sidebar";
import { View } from "./components/Sidebar";
import { LoadingPanel } from "./components/LoadingPanel";
import { Book, ModalState } from "./lib/types";
import ToastStack from "./components/ToastStack";
import type { AppToast } from "./components/ToastStack";
import Modal from "./components/Modal";
import SeriesForm from "./components/SeriesForm";
import BookForm from "./components/BookForm";
import EntryForm from "./components/EntryForm";
import LibraryPage from "./components/LibraryPage";
import { HistoryPage } from "./components/HistoryPage";
import StudioPage from "./components/StudioPage";

export default function App() {
    const [view, setView] = useState<View>("flow");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [toasts, setToasts] = useState<AppToast[]>([]);

    const [modal, setModal] = useState<ModalState | null>(null);

    const [preferences, setPreferences] = useStoredPreferences();

    const [libraryState, setState] = useState<LibraryState>(emptyLibraryState);
    const library = useMemo(() => buildLibrary(libraryState), [libraryState]);

    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const selectedBook = selectedBookId
        ? library.books.find((book) => book.id === selectedBookId)
        : undefined;

    const loadLibrary = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const next = await libraryApi.getState();

            setState(next);
            setSelectedBookId(next.books[0]?.id ?? null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to load library.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLibrary();
    }, [loadLibrary]);

    const refresh = useCallback(async () => {
        const next = await libraryApi.getState();
        setState(next);
        setSelectedBookId((current) => current ?? next.books[0]?.id ?? null);
    }, []);

    // Toasts

    function showToast(next: Omit<AppToast, "id">) {
        const id = Date.now();
        setToasts((current) => [...current.slice(-2), { ...next, id }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 5200);
    }

    function followToast(toast: AppToast) {
        if (toast.action?.bookId) {
            setSelectedBookId(toast.action.bookId);
        }
        if (toast.action) {
            setView(toast.action.view);
        }
        setToasts((current) => current.filter((item) => item.id !== toast.id));
    }

    // Endpoints

    async function mutate(operation: () => Promise<unknown>) {
        setSaving(true);
        setError("");
        try {
            await operation();
            await refresh();
            setModal(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to save changes.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteSeries(id: string) {
        const series = libraryState.series.find((item) => item.id === id);
        if (
            !window.confirm(
                "Delete this series? Books will stay in the library.",
            )
        ) {
            return;
        }
        await mutate(async () => {
            const result = await libraryApi.deleteSeries(id);
            showToast({
                title: "Series deleted",
                detail: `${series?.title ?? "The series"} was removed. Books stayed in your library.`,
                tone: "info",
                action: { label: "View studio", view: "studio" },
            });
            return result;
        });
    }

    async function deleteBook(id: string) {
        const book = library.books.find((item) => item.id === id);
        if (!window.confirm("Delete this book and its reading entries?")) {
            return;
        }
        await mutate(async () => {
            const result = await libraryApi.deleteBook(id);
            showToast({
                title: "Book deleted",
                detail: `${book?.title ?? "The book"} was removed from your library.`,
                tone: "info",
                action: { label: "View library", view: "library" },
            });
            return result;
        });
    }

    async function deleteEntry(id: string) {
        const entry = libraryState.entries.find((item) => item.id === id);
        const book = entry
            ? library.books.find((item) => item.id === entry.book_id)
            : undefined;
        if (!window.confirm("Delete this reading entry?")) {
            return;
        }
        await mutate(async () => {
            const result = await libraryApi.deleteEntry(id);
            showToast({
                title: "Entry deleted",
                detail: `${book?.title ?? "The reading entry"} was removed from History.`,
                tone: "info",
                action: {
                    label: "View history",
                    view: "history",
                    bookId: book?.id,
                },
            });
            return result;
        });
    }

    async function quickStart(book: BookWithMeta) {
        if (isReading(book)) {
            showToast({
                title: "Already reading",
                detail: `${book.title} already has an active reading entry.`,
                tone: "warning",
                action: {
                    label: "View in library",
                    view: "library",
                    bookId: book.id,
                },
            });
            return;
        }

        await mutate(async () => {
            const entry = await libraryApi.createEntry({
                book_id: book.id,
                status: "reading",
                read_kind: book.readCount > 0 ? "reread" : "first",
                start_value: todayValue(),
                start_precision: "exact",
                end_value: "",
                end_precision: "unknown",
                entry_order: Date.now(),
            });
            showToast({
                title: "Reading started",
                detail: `${book.title} was added to your active reading entries.`,
                tone: "success",
                action: {
                    label: "View history",
                    view: "history",
                    bookId: book.id,
                },
            });
            return entry;
        });
    }

    async function quickQueue(book: BookWithMeta) {
        await mutate(async () => {
            const entry = await libraryApi.createEntry({
                book_id: book.id,
                status: "planned",
                read_kind: book.readCount > 0 ? "reread" : "first",
                period_label: book.readCount > 0 ? "Reread queue" : "Next up",
                entry_order: Date.now(),
            });
            showToast({
                title: "Planned entry added",
                detail: `${book.title} is saved as a planned reading entry.`,
                tone: "success",
                action: {
                    label: "View history",
                    view: "history",
                    bookId: book.id,
                },
            });
            return entry;
        });
    }

    return (
        <div
            className={
                "min-h-screen bg-[linear-gradient(180deg,rgba(255,249,236,0.82),rgba(239,232,214,0.96)),linear-gradient(90deg,rgba(83,62,35,0.035)_1px,transparent_1px),linear-gradient(rgba(83,62,35,0.026)_1px,transparent_1px),var(--paper)] bg-[length:auto,30px_30px,30px_30px,auto] text-ink"
            }
            style={{ "--user-accent": preferences.accent } as CSSProperties}
        >
            <div
                className={
                    "grid min-h-screen w-full max-w-[1840px] grid-cols-[14.25rem_minmax(0,1fr)] gap-3 p-3 max-lg:grid-cols-[5rem_minmax(0,1fr)] max-md:flex max-md:flex-col max-md:p-2 has-[.flow-page]:h-screen has-[.flow-page]:min-h-0 has-[.flow-page]:overflow-hidden"
                }
            >
                <Sidebar
                    view={view}
                    setView={setView}
                    modal={modal}
                    setModal={setModal}
                    preferences={preferences}
                />

                <div
                    className={
                        "flex min-w-0 flex-col gap-3 has-[.flow-page]:min-h-0 has-[.flow-page]:overflow-hidden [&:has(.flow-page)_main]:min-h-0 [&:has(.flow-page)_main]:overflow-hidden"
                    }
                >
                    {error ? (
                        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-[rgba(141,59,70,0.24)] bg-[#fff4f0] px-4 py-3 text-[#7c2835]">
                            <span>{error}</span>
                            <button
                                onClick={() => setError("")}
                                type="button"
                                aria-label="Dismiss"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : null}

                    {loading ? (
                        <LoadingPanel />
                    ) : (
                        <main className={"min-w-0"}>
                            {view === "library" ? (
                                <LibraryPage
                                    books={library.books}
                                    series={libraryState.series}
                                    selectedBook={selectedBook}
                                    onSelectBook={setSelectedBookId}
                                    onAddBook={() => setModal({ type: "book" })}
                                    onEditBook={(book: Book) =>
                                        setModal({ type: "book", book })
                                    }
                                    onDeleteBook={deleteBook}
                                    onStart={quickStart}
                                    onQueue={quickQueue}
                                    onAddEntry={(bookId) =>
                                        setModal({ type: "entry", bookId })
                                    }
                                    onEditEntry={(entry) =>
                                        setModal({ type: "entry", entry })
                                    }
                                    onDeleteEntry={deleteEntry}
                                />
                            ) : null}

                            {view === "history" ? (
                                <HistoryPage
                                    entries={libraryState.entries}
                                    books={library.books}
                                    onEditEntry={(entry) =>
                                        setModal({ type: "entry", entry })
                                    }
                                    onDeleteEntry={deleteEntry}
                                    onSelectBook={setSelectedBookId}
                                />
                            ) : null}

                            {view === "studio" ? (
                                <StudioPage
                                    preferences={preferences}
                                    setPreferences={setPreferences}
                                    series={libraryState.series}
                                    onAddSeries={() =>
                                        setModal({ type: "series" })
                                    }
                                    onEditSeries={(series) =>
                                        setModal({ type: "series", series })
                                    }
                                    onDeleteSeries={deleteSeries}
                                />
                            ) : null}
                        </main>
                    )}
                </div>

                {modal ? (
                    <Modal onClose={() => setModal(null)}>
                        {modal.type === "series" ? (
                            <SeriesForm
                                series={modal.series}
                                saving={saving}
                                onCancel={() => setModal(null)}
                                onSubmit={(payload) =>
                                    mutate(async () => {
                                        const series = modal.series
                                            ? await libraryApi.updateSeries(
                                                  modal.series.id,
                                                  payload,
                                              )
                                            : await libraryApi.createSeries(
                                                  payload,
                                              );
                                        showToast({
                                            title: modal.series
                                                ? "Series updated"
                                                : "Series added",
                                            detail: `${series.title} is ready in Studio.`,
                                            tone: "success",
                                            action: {
                                                label: "View studio",
                                                view: "studio",
                                            },
                                        });
                                        return series;
                                    })
                                }
                            />
                        ) : null}

                        {modal.type === "book" ? (
                            <BookForm
                                book={modal.book}
                                series={libraryState.series}
                                saving={saving}
                                onCancel={() => setModal(null)}
                                onSubmit={(payload) =>
                                    mutate(async () => {
                                        const book = modal.book
                                            ? await libraryApi.updateBook(
                                                  modal.book.id,
                                                  payload,
                                              )
                                            : await libraryApi.createBook(
                                                  payload,
                                              );
                                        showToast({
                                            title: modal.book
                                                ? "Book updated"
                                                : "Book added",
                                            detail: `${book.title} is in your library.`,
                                            tone: "success",
                                            action: {
                                                label: "View book",
                                                view: "library",
                                                bookId: book.id,
                                            },
                                        });
                                        return book;
                                    })
                                }
                            />
                        ) : null}

                        {modal.type === "entry" ? (
                            <EntryForm
                                entry={modal.entry}
                                books={library.books}
                                defaultBookId={modal.bookId}
                                saving={saving}
                                onCancel={() => setModal(null)}
                                onSubmit={(payload) => {
                                    const book = library.books.find(
                                        (item) => item.id === payload.book_id,
                                    );
                                    return mutate(async () => {
                                        const entry = modal.entry
                                            ? await libraryApi.updateEntry(
                                                  modal.entry.id,
                                                  payload,
                                              )
                                            : await libraryApi.createEntry(
                                                  payload,
                                              );
                                        showToast({
                                            title: modal.entry
                                                ? "Entry updated"
                                                : "Entry added",
                                            detail: `${book?.title ?? "This book"} is now marked ${titleCase(String(payload.status ?? "updated"))}.`,
                                            tone: "success",
                                            action: {
                                                label: "View history",
                                                view: "history",
                                                bookId: book?.id,
                                            },
                                        });
                                        return entry;
                                    });
                                }}
                            />
                        ) : null}
                    </Modal>
                ) : null}

                <ToastStack
                    toasts={toasts}
                    onFollow={followToast}
                    onDismiss={(id) =>
                        setToasts((current) =>
                            current.filter((toast) => toast.id !== id),
                        )
                    }
                />
            </div>
        </div>
    );
}
