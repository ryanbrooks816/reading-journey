import { X, ListPlus } from "lucide-react";
import {
    CSSProperties,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { libraryApi } from "./lib/api";
import {
    isReading,
    buildLibrary,
    buildStats,
    emptyLibraryState,
    type LibraryState,
} from "./lib/library";
import { todayValue } from "./lib/dates";
import { titleCase } from "./lib/format";
import {
    defaultPreferences,
    type Preferences,
} from "./lib/preferences";
import type { BookWithMeta, FlowNode, ReadingEntry, Series } from "./lib/types";
import Sidebar from "./components/Sidebar";
import { View } from "./components/Sidebar";
import { LoadingPanel } from "./components/LoadingPanel";
import { Book, ModalState } from "./lib/types";
import ToastStack from "./components/ToastStack";
import type { AppToast } from "./components/ToastStack";
import Modal from "./components/Modal";
import ConfirmPanel from "./components/ConfirmPanel";
import SeriesForm from "./components/SeriesForm";
import BookForm from "./components/BookForm";
import BookCsvUploadForm from "./components/BookCsvUploadForm";
import EntryForm from "./components/EntryForm";
import FlowPage from "./components/FlowPage";
import { snapFlowPosition } from "./lib/flow";
import LibraryPage from "./components/LibraryPage";
import HistoryPage from "./components/HistoryPage";
import StatsPage from "./components/StatsPage";
import StudioPage from "./components/StudioPage";

export default function App() {
    const [view, setView] = useState<View>("flow");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [toasts, setToasts] = useState<AppToast[]>([]);

    const [modal, setModal] = useState<ModalState | null>(null);

    const [preferences, setPreferencesState] =
        useState<Preferences>(defaultPreferences);
    const preferenceSaveTimeout = useRef<number | null>(null);

    const [libraryState, setState] = useState<LibraryState>(emptyLibraryState);
    const library = useMemo(() => buildLibrary(libraryState), [libraryState]);
    const libraryStats = useMemo(
        () => buildStats(library.books, libraryState.entries),
        [library.books, libraryState.entries],
    );

    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const selectedBook = selectedBookId
        ? library.books.find((book) => book.id === selectedBookId)
        : undefined;

    const [duplicateFlowBook, setDuplicateFlowBook] =
        useState<BookWithMeta | null>(null);

    const loadLibrary = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const next = await libraryApi.getState();

            setState(next);
            setPreferencesState(next.preferences);
            setSelectedBookId(next.books[0]?.id ?? null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to load library.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const setPreferences = useCallback((next: Preferences) => {
        setPreferencesState(next);

        if (preferenceSaveTimeout.current !== null) {
            window.clearTimeout(preferenceSaveTimeout.current);
        }
        preferenceSaveTimeout.current = window.setTimeout(() => {
            void libraryApi.updatePreferences(next).catch((err: unknown) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to save library preferences.",
                );
            });
        }, 400);
    }, []);

    useEffect(
        () => () => {
            if (preferenceSaveTimeout.current !== null) {
                window.clearTimeout(preferenceSaveTimeout.current);
            }
        },
        [],
    );

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

    async function mutate(
        operation: () => Promise<unknown>,
        options: { throwOnError?: boolean } = {},
    ) {
        setSaving(true);
        setError("");
        try {
            await operation();
            await refresh();
            setModal(null);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unable to save changes.";
            setError(message);
            if (options.throwOnError) {
                throw new Error(message);
            }
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

    async function addFlowNode(
        book: BookWithMeta,
        options: {
            allowDuplicate?: boolean;
            position?: { x: number; y: number };
        } = {},
    ): Promise<FlowNode | undefined> {
        if (
            !options.allowDuplicate &&
            libraryState.flowNodes.some((node) => node.book_id === book.id)
        ) {
            setDuplicateFlowBook(book);
            return undefined;
        }

        const position =
            options.position ??
            snapFlowPosition({
                x: 128 + (libraryState.flowNodes.length % 5) * 320,
                y: 128 + Math.floor(libraryState.flowNodes.length / 5) * 192,
            });

        setSaving(true);
        setError("");
        try {
            const node = await libraryApi.createFlowNode({
                book_id: book.id,
                label: "",
                position_x: position.x,
                position_y: position.y,
                node_order: Date.now(),
            });
            showToast({
                title: "Added to flow",
                detail: `${book.title} was placed on the journey chart.`,
                tone: "success",
                action: { label: "View flow", view: "flow", bookId: book.id },
            });
            setDuplicateFlowBook(null);
            await refresh();
            return node;
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to add that book to the flow.",
            );
            return undefined;
        } finally {
            setSaving(false);
        }
    }

    async function addSeriesToFlow(series: Series, books: BookWithMeta[]) {
        const sortedBooks = [...books].sort(
            (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title),
        );
        if (!sortedBooks.length) {
            return;
        }

        const nodesByBookId = new Map<string, FlowNode>();
        for (const node of libraryState.flowNodes) {
            if (!nodesByBookId.has(node.book_id)) {
                nodesByBookId.set(node.book_id, node);
            }
        }

        const maxY = libraryState.flowNodes.length
            ? Math.max(...libraryState.flowNodes.map((node) => node.position_y))
            : -64;
        const rowY = snapFlowPosition({ x: 0, y: maxY + 192 }).y;
        const firstX = 128;
        const orderedNodes: FlowNode[] = [];

        setSaving(true);
        setError("");
        try {
            for (const [index, book] of sortedBooks.entries()) {
                const existing = nodesByBookId.get(book.id);
                if (existing) {
                    orderedNodes.push(existing);
                    continue;
                }

                const position = snapFlowPosition({
                    x: firstX + index * 320,
                    y: rowY,
                });
                const node = await libraryApi.createFlowNode({
                    book_id: book.id,
                    label: "",
                    position_x: position.x,
                    position_y: position.y,
                    node_order: Date.now() + index,
                });
                nodesByBookId.set(book.id, node);
                orderedNodes.push(node);
            }

            const existingEdges = new Set(
                libraryState.flowEdges.map(
                    (edge) => `${edge.source_node_id}:${edge.target_node_id}`,
                ),
            );
            for (let index = 0; index < orderedNodes.length - 1; index += 1) {
                const source = orderedNodes[index];
                const target = orderedNodes[index + 1];
                const key = `${source.id}:${target.id}`;
                if (existingEdges.has(key)) {
                    continue;
                }
                await libraryApi.createFlowEdge({
                    source_node_id: source.id,
                    target_node_id: target.id,
                });
                existingEdges.add(key);
            }

            showToast({
                title: "Series mapped",
                detail: `${series.title} was added as a connected path.`,
                tone: "success",
                action: { label: "View flow", view: "flow" },
            });
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to add that series to the flow.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function updateFlowNodePosition(
        nodeId: string,
        position: { x: number; y: number },
    ) {
        const currentNode = libraryState.flowNodes.find(
            (node) => node.id === nodeId,
        );
        if (!currentNode) {
            return;
        }
        const snappedPosition = snapFlowPosition(position);

        setState((current) => ({
            ...current,
            flowNodes: current.flowNodes.map((node) =>
                node.id === nodeId
                    ? {
                          ...node,
                          position_x: snappedPosition.x,
                          position_y: snappedPosition.y,
                      }
                    : node,
            ),
        }));

        try {
            await libraryApi.updateFlowNode(nodeId, {
                ...currentNode,
                position_x: snappedPosition.x,
                position_y: snappedPosition.y,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save the flow position.",
            );
            await refresh();
        }
    }

    async function updateFlowNodeLabel(nodeId: string, label: string) {
        const currentNode = libraryState.flowNodes.find(
            (node) => node.id === nodeId,
        );
        if (!currentNode || currentNode.label === label) {
            return;
        }

        setState((current) => ({
            ...current,
            flowNodes: current.flowNodes.map((node) =>
                node.id === nodeId ? { ...node, label } : node,
            ),
        }));

        try {
            await libraryApi.updateFlowNode(nodeId, {
                ...currentNode,
                label,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save the flow note.",
            );
            await refresh();
        }
    }

    async function addFlowEdge(sourceNodeId: string, targetNodeId: string) {
        if (sourceNodeId === targetNodeId) {
            return;
        }
        const exists = libraryState.flowEdges.some(
            (edge) =>
                edge.source_node_id === sourceNodeId &&
                edge.target_node_id === targetNodeId,
        );
        if (exists) {
            return;
        }

        setSaving(true);
        setError("");
        try {
            await libraryApi.createFlowEdge({
                source_node_id: sourceNodeId,
                target_node_id: targetNodeId,
            });
            showToast({
                title: "Flow connected",
                detail: "Those books are now linked on the journey chart.",
                tone: "success",
                action: { label: "View flow", view: "flow" },
            });
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to connect those books.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteFlowEdge(edgeId: string) {
        setSaving(true);
        setError("");
        try {
            await libraryApi.deleteFlowEdge(edgeId);
            showToast({
                title: "Connection removed",
                detail: "The flow link was removed from the chart.",
                tone: "info",
                action: { label: "View flow", view: "flow" },
            });
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to remove that connection.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteFlowNode(nodeId: string) {
        setSaving(true);
        setError("");
        try {
            await libraryApi.deleteFlowNode(nodeId);
            showToast({
                title: "Node removed",
                detail: "That book was removed from the journey chart.",
                tone: "info",
                action: { label: "View flow", view: "flow" },
            });
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to remove that node.",
            );
        } finally {
            setSaving(false);
        }
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
                            {view === "flow" ? (
                                <FlowPage
                                    books={library.books}
                                    series={libraryState.series}
                                    flowNodes={libraryState.flowNodes}
                                    flowEdges={libraryState.flowEdges}
                                    stats={libraryStats}
                                    onSelectBook={setSelectedBookId}
                                    onStart={quickStart}
                                    onAddFlowNode={addFlowNode}
                                    onAddSeriesToFlow={addSeriesToFlow}
                                    onUpdateFlowNodePosition={
                                        updateFlowNodePosition
                                    }
                                    onUpdateFlowNodeLabel={
                                        updateFlowNodeLabel
                                    }
                                    onAddFlowEdge={addFlowEdge}
                                    onDeleteFlowEdge={deleteFlowEdge}
                                    onDeleteFlowNode={deleteFlowNode}
                                />
                            ) : null}

                            {view === "library" ? (
                                <LibraryPage
                                    books={library.books}
                                    series={libraryState.series}
                                    selectedBook={selectedBook}
                                    onSelectBook={setSelectedBookId}
                                    onAddBook={() => setModal({ type: "book" })}
                                    onBulkUpload={() =>
                                        setModal({ type: "bookBulk" })
                                    }
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
                                    onEditEntry={(entry: ReadingEntry) =>
                                        setModal({ type: "entry", entry })
                                    }
                                    onDeleteEntry={deleteEntry}
                                    onSelectBook={setSelectedBookId}
                                />
                            ) : null}

                            {view === "stats" ? (
                                <StatsPage
                                    stats={libraryStats}
                                    books={library.books}
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

                <ToastStack
                    toasts={toasts}
                    onFollow={followToast}
                    onDismiss={(id) =>
                        setToasts((current) =>
                            current.filter((toast) => toast.id !== id),
                        )
                    }
                />

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

                        {modal.type === "bookBulk" ? (
                            <BookCsvUploadForm
                                series={libraryState.series}
                                saving={saving}
                                onCancel={() => setModal(null)}
                                onSubmit={(rows) =>
                                    mutate(
                                        async () => {
                                            const result =
                                                await libraryApi.createBooksBulk(
                                                    rows,
                                                );
                                            showToast({
                                                title: "Books uploaded",
                                                detail: `${result.count} books were added to your library.`,
                                                tone: "success",
                                                action: {
                                                    label: "View library",
                                                    view: "library",
                                                },
                                            });
                                            return result;
                                        },
                                        { throwOnError: true },
                                    )
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

                {duplicateFlowBook ? (
                    <Modal onClose={() => setDuplicateFlowBook(null)}>
                        <ConfirmPanel
                            icon={<ListPlus size={20} />}
                            title="Already on the chart"
                            detail={`${duplicateFlowBook.title} is already in the flow. Add another copy anyway?`}
                            confirmLabel="Add anyway"
                            saving={saving}
                            onCancel={() => setDuplicateFlowBook(null)}
                            onConfirm={() =>
                                addFlowNode(duplicateFlowBook, {
                                    allowDuplicate: true,
                                })
                            }
                        />
                    </Modal>
                ) : null}
            </div>
        </div>
    );
}
