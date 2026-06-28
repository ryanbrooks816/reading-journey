import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    Background,
    BackgroundVariant,
    type Connection,
    Controls,
    Handle,
    MarkerType,
    Position,
    ReactFlow,
    useNodesState,
    type Edge,
    type Node,
    type NodeProps,
    type OnNodeDrag,
} from "@xyflow/react";
import {
    AlignHorizontalJustifyCenter,
    Check,
    ChevronLeft,
    ChevronRight,
    GitBranch,
    ListOrdered,
    ListPlus,
    Map as MapIcon,
    Play,
    Plus,
    Search,
    SlidersHorizontal,
    Star,
    Trash2,
} from "lucide-react";
import type { CSSProperties } from "react";
import { BookWithMeta, Series, FlowNode, FlowEdge } from "../lib/types";
import type { LibraryStats } from "../lib/library";
import { formatNumber } from "../lib/format";
import { FLOW_GRID, snapFlowPosition } from "../lib/flow";
import { PageHero } from "./PageHero";
import IconButton from "./IconButton";
import BookCover from "./BookCover";
import Modal from "./Modal";
import SeriesProgressBar from "./SeriesProgressBar";
import BookListItem from "./BookListItem";
import StartReadingButton from "./StartReadingButton";

const SUGGESTION_PAGE_SIZE = 5;
const TIDY_ALIGNMENT_TOLERANCE = 48;
const DEFAULT_VIEWPORT = {
    x: 36,
    y: 92,
    zoom: 0.72,
};

export default function FlowPage({
    books,
    series,
    flowNodes,
    flowEdges,
    stats,
    onSelectBook,
    onStart,
    onAddFlowNode,
    onUpdateFlowNodePosition,
    onUpdateFlowNodeLabel,
    onAddFlowEdge,
    onDeleteFlowEdge,
    onDeleteFlowNode,
}: {
    books: BookWithMeta[];
    series: Series[];
    flowNodes: FlowNode[];
    flowEdges: FlowEdge[];
    stats: LibraryStats;
    onSelectBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onAddFlowNode: (
        book: BookWithMeta,
        options?: { position?: { x: number; y: number } },
    ) => void;
    onUpdateFlowNodePosition: (
        id: string,
        position: { x: number; y: number },
    ) => void;
    onUpdateFlowNodeLabel: (id: string, label: string) => void;
    onAddFlowEdge: (sourceId: string, targetId: string) => void;
    onDeleteFlowEdge: (id: string) => void;
    onDeleteFlowNode: (id: string) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [mode, setMode] = useState<"chart" | "path">("chart");
    const [gridVisible, setGridVisible] = useState(true);
    const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
    const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
    const [visibleSuggestions, setVisibleSuggestions] =
        useState(SUGGESTION_PAGE_SIZE);
    const [seriesBookIndexes, setSeriesBookIndexes] = useState<
        Record<string, number>
    >({});
    const flowCanvasRef = useRef<HTMLDivElement>(null);

    const bookById = useMemo(
        () => new Map(books.map((book) => [book.id, book])),
        [books],
    );

    const completedBookIds = useMemo(
        () =>
            new Set(
                books
                    .filter((book) => book.readCount > 0)
                    .map((book) => book.id),
            ),
        [books],
    );

    const activeBookIds = useMemo(
        () =>
            new Set(
                books
                    .filter((book) =>
                        book.entries.some(
                            (entry) => entry.status === "reading",
                        ),
                    )
                    .map((book) => book.id),
            ),
        [books],
    );

    const flowBookIds = new Set(flowNodes.map((node) => node.book_id));

    const incomingByNode = useMemo(() => {
        const map = new Map<string, FlowEdge[]>();
        for (const edge of flowEdges) {
            map.set(edge.target_node_id, [
                ...(map.get(edge.target_node_id) ?? []),
                edge,
            ]);
        }
        return map;
    }, [flowEdges]);

    const nextNodeIds = useMemo(() => {
        const ids = new Set<string>();
        for (const node of flowNodes) {
            if (
                completedBookIds.has(node.book_id) ||
                activeBookIds.has(node.book_id)
            ) {
                continue;
            }
            const incoming = incomingByNode.get(node.id) ?? [];
            const prerequisitesMet =
                incoming.length === 0 ||
                incoming.every((edge) => {
                    const source = flowNodes.find(
                        (item) => item.id === edge.source_node_id,
                    );
                    return source
                        ? completedBookIds.has(source.book_id)
                        : false;
                });
            if (prerequisitesMet) {
                ids.add(node.id);
            }
        }
        return ids;
    }, [activeBookIds, completedBookIds, flowNodes, incomingByNode]);

    const flow = useMemo(
        () =>
            buildFlowElements(
                flowNodes,
                flowEdges,
                bookById,
                completedBookIds,
                activeBookIds,
                nextNodeIds,
                onSelectBook,
                onStart,
                onUpdateFlowNodeLabel,
                onDeleteFlowNode,
            ),
        [
            activeBookIds,
            bookById,
            completedBookIds,
            flowEdges,
            flowNodes,
            nextNodeIds,
            onSelectBook,
            onStart,
            onUpdateFlowNodeLabel,
            onDeleteFlowNode,
        ],
    );
    const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);

    useEffect(() => {
        setNodes(flow.nodes);
    }, [flow, setNodes]);

    useEffect(() => {
        setSelectedEdgeIds((current) =>
            current.filter((id) => flow.edges.some((edge) => edge.id === id)),
        );
    }, [flow.edges]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                selectedEdgeIds.length === 0 ||
                (event.key !== "Backspace" && event.key !== "Delete")
            ) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (
                target?.closest("input, textarea, select") ||
                target?.isContentEditable
            ) {
                return;
            }

            event.preventDefault();
            selectedEdgeIds.forEach((id) => onDeleteFlowEdge(id));
            setSelectedEdgeIds([]);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onDeleteFlowEdge, selectedEdgeIds]);

    const handleConnect = useCallback(
        (connection: Connection) => {
            if (connection.source && connection.target) {
                onAddFlowEdge(connection.source, connection.target);
            }
        },
        [onAddFlowEdge],
    );

    const handleNodeDragStop: OnNodeDrag<Node<FlowNodeData>> = useCallback(
        (_event, node) => {
            onUpdateFlowNodePosition(node.id, node.position);
        },
        [onUpdateFlowNodePosition],
    );

    const handleSelectionChange = useCallback(
        ({ edges: selectedEdges }: { edges: Edge[] }) => {
            const nextIds = selectedEdges.map((edge) => edge.id);
            setSelectedEdgeIds((current) => {
                if (
                    current.length === nextIds.length &&
                    current.every((id, index) => id === nextIds[index])
                ) {
                    return current;
                }
                return nextIds;
            });
        },
        [],
    );

    const handleMoveEnd = useCallback(
        (
            _event: MouseEvent | TouchEvent | null,
            nextViewport: typeof viewport,
        ) => {
            setViewport((current) =>
                current.x === nextViewport.x &&
                current.y === nextViewport.y &&
                current.zoom === nextViewport.zoom
                    ? current
                    : nextViewport,
            );
        },
        [],
    );

    const getViewportCenterPosition = useCallback(() => {
        const bounds = flowCanvasRef.current?.getBoundingClientRect();
        if (!bounds) {
            return undefined;
        }

        return snapFlowPosition({
            x: (bounds.width / 2 - viewport.x) / viewport.zoom,
            y: (bounds.height / 2 - viewport.y) / viewport.zoom,
        });
    }, [viewport]);

    const orderedFlowNodes = useMemo(
        () => orderFlowNodes(flowNodes, flowEdges),
        [flowEdges, flowNodes],
    );

    const pathLastNode = orderedFlowNodes[orderedFlowNodes.length - 1];

    const getPathAppendPosition = useCallback(() => {
        if (pathLastNode) {
            return snapFlowPosition({
                x: pathLastNode.position_x + 320,
                y: pathLastNode.position_y,
            });
        }
        return getViewportCenterPosition();
    }, [getViewportCenterPosition, pathLastNode]);

    const handleAddFlowNode = useCallback(
        async (book: BookWithMeta) => {
            const node = await onAddFlowNode(book, {
                position:
                    mode === "path"
                        ? getPathAppendPosition()
                        : getViewportCenterPosition(),
            });
            if (mode === "path" && node && pathLastNode) {
                onAddFlowEdge(pathLastNode.id, node.id);
            }
        },
        [
            getPathAppendPosition,
            getViewportCenterPosition,
            mode,
            onAddFlowEdge,
            onAddFlowNode,
            pathLastNode,
        ],
    );

    const seriesGroups = useMemo(
        () =>
            series
                .map((item) => ({
                    series: item,
                    books: books
                        .filter((book) => book.series_id === item.id)
                        .sort(
                            (a, b) =>
                                a.sort_order - b.sort_order ||
                                a.title.localeCompare(b.title),
                        ),
                }))
                .filter((group) => group.books.length > 0),
        [books, series],
    );
    const suggestionItems = useMemo(() => {
        const items: SuggestionItem[] = [
            ...seriesGroups.map((group) => ({
                type: "series" as const,
                id: group.series.id,
                title: group.series.title,
                books: group.books,
                series: group.series,
            })),
            ...books
                .filter((book) => !book.series_id)
                .map((book) => ({
                    type: "standalone" as const,
                    id: book.id,
                    title: book.title,
                    book,
                })),
        ];

        return items.sort(
            (a, b) =>
                a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
        );
    }, [books, seriesGroups]);
    const visibleSuggestionItems = suggestionItems.slice(0, visibleSuggestions);

    useEffect(() => {
        setVisibleSuggestions((current) =>
            Math.min(
                Math.max(SUGGESTION_PAGE_SIZE, current),
                suggestionItems.length,
            ),
        );
    }, [suggestionItems.length]);

    const getDefaultSeriesBookIndex = useCallback(
        (group: SeriesSuggestionItem) => {
            const unreadIndex = group.books.findIndex(
                (book) => book.readCount === 0 && !activeBookIds.has(book.id),
            );
            if (unreadIndex >= 0) {
                return unreadIndex;
            }
            const readingIndex = group.books.findIndex((book) =>
                activeBookIds.has(book.id),
            );
            if (readingIndex >= 0) {
                return readingIndex;
            }
            return Math.max(0, group.books.length - 1);
        },
        [activeBookIds],
    );

    const tidyFlowChart = useCallback(() => {
        const tidyPositions = alignFlowPositions(flowNodes);

        flowNodes.forEach((node) => {
            const position = tidyPositions.get(node.id);
            if (
                position &&
                (position.x !== node.position_x ||
                    position.y !== node.position_y)
            ) {
                onUpdateFlowNodePosition(node.id, position);
            }
        });
    }, [flowNodes, onUpdateFlowNodePosition]);

    return (
        <div className="flow-page chart-mode">
            <PageHero
                icon={<MapIcon size={16} />}
                kicker="Flow"
                title="Journey chart"
                metrics={[
                    { label: "Nodes", value: flowNodes.length },
                    { label: "Next", value: nextNodeIds.size },
                    { label: "Finished", value: stats.finishedEntries },
                    {
                        label: "Words",
                        value: formatNumber(stats.wordsRead),
                    },
                ]}
            />

            <div className="journey-chart-layout">
                <section className="journey-chart-panel">
                    <div className="flow-mode-switch" role="tablist">
                        <button
                            aria-selected={mode === "chart"}
                            className={mode === "chart" ? "active" : ""}
                            onClick={() => setMode("chart")}
                            role="tab"
                            type="button"
                        >
                            <GitBranch size={16} />
                            Chart
                        </button>
                        <button
                            aria-selected={mode === "path"}
                            className={mode === "path" ? "active" : ""}
                            onClick={() => setMode("path")}
                            role="tab"
                            type="button"
                        >
                            <ListOrdered size={16} />
                            Path
                        </button>
                    </div>
                    <div className="journey-flow-canvas" ref={flowCanvasRef}>
                        {mode === "path" ? (
                            <PathPlanner
                                flowNodes={orderedFlowNodes}
                                flowEdges={flowEdges}
                                bookById={bookById}
                                completedBookIds={completedBookIds}
                                activeBookIds={activeBookIds}
                                nextNodeIds={nextNodeIds}
                                onSelectBook={onSelectBook}
                                onStart={onStart}
                                onAddBook={() => setPickerOpen(true)}
                                onUpdateFlowNodeLabel={onUpdateFlowNodeLabel}
                                onDeleteFlowNode={onDeleteFlowNode}
                            />
                        ) : nodes.length ? (
                            <ReactFlow
                                nodes={nodes}
                                edges={flow.edges}
                                nodeTypes={flowNodeTypes}
                                onNodesChange={onNodesChange}
                                onConnect={handleConnect}
                                onEdgesDelete={(deletedEdges) =>
                                    deletedEdges.forEach((edge) =>
                                        onDeleteFlowEdge(edge.id),
                                    )
                                }
                                onEdgeDoubleClick={(_event, edge) =>
                                    onDeleteFlowEdge(edge.id)
                                }
                                onNodeDragStop={handleNodeDragStop}
                                onMoveEnd={handleMoveEnd}
                                onSelectionChange={handleSelectionChange}
                                proOptions={{ hideAttribution: true }}
                                defaultViewport={DEFAULT_VIEWPORT}
                                minZoom={0.28}
                                maxZoom={1.7}
                                snapToGrid
                                snapGrid={FLOW_GRID}
                                panOnDrag
                                panOnScroll
                                zoomOnScroll
                                zoomOnPinch
                                nodesDraggable
                                nodesConnectable
                                elementsSelectable
                                deleteKeyCode={null}
                            >
                                <div className="flow-grid-toggle">
                                    <label>
                                        <input
                                            checked={gridVisible}
                                            onChange={(event) =>
                                                setGridVisible(
                                                    event.target.checked,
                                                )
                                            }
                                            type="checkbox"
                                        />
                                        Grid
                                    </label>
                                </div>
                                <Controls
                                    position="bottom-center"
                                    showInteractive={false}
                                />
                                {gridVisible ? (
                                    <Background
                                        color="rgba(60, 45, 32, 0.1)"
                                        gap={FLOW_GRID[0]}
                                        lineWidth={1}
                                        variant={BackgroundVariant.Lines}
                                    />
                                ) : null}
                            </ReactFlow>
                        ) : (
                            <button
                                className="route-empty journey-empty"
                                onClick={() => setPickerOpen(true)}
                                type="button"
                            >
                                <Plus size={19} />
                                Start a reading path
                            </button>
                        )}
                    </div>
                </section>

                <aside className="journey-tray">
                    <section className="tray-panel tray-actions">
                        <IconButton
                            label="Find book"
                            onClick={() => setPickerOpen(true)}
                            className="w-full"
                        >
                            <Search size={16} />
                        </IconButton>
                        <IconButton
                            label="Tidy chart"
                            onClick={tidyFlowChart}
                            className="w-full"
                            disabled={!flowNodes.length}
                        >
                            <AlignHorizontalJustifyCenter size={16} />
                        </IconButton>
                    </section>

                    <section className="tray-panel">
                        <div>
                            <p className="eyebrow">Next in series</p>
                            <h3>Likely next reads</h3>
                        </div>
                        <div className="journey-candidates">
                            {visibleSuggestionItems.map((item) => {
                                if (item.type === "standalone") {
                                    const standaloneState = activeBookIds.has(
                                        item.book.id,
                                    )
                                        ? "reading"
                                        : item.book.readCount
                                          ? "read"
                                          : "unread";
                                    return (
                                        <BookListItem
                                            key={item.id}
                                            book={item.book}
                                            meta={`Standalone · ${standaloneState}`}
                                            onSelect={onSelectBook}
                                            actions={
                                                <>
                                                    <IconButton
                                                        label={
                                                            mode === "path"
                                                                ? "Add to path"
                                                                : "Add to chart"
                                                        }
                                                        onClick={() =>
                                                            handleAddFlowNode(
                                                                item.book,
                                                            )
                                                        }
                                                    >
                                                        <ListPlus size={15} />
                                                    </IconButton>
                                                    <StartReadingButton
                                                        book={item.book}
                                                        onStart={onStart}
                                                    />
                                                </>
                                            }
                                        />
                                    );
                                }

                                const index =
                                    seriesBookIndexes[item.id] ??
                                    getDefaultSeriesBookIndex(item);
                                const book = item.books[index] ?? item.books[0];
                                const unreadIndex = item.books.findIndex(
                                    (seriesBook) =>
                                        seriesBook.readCount === 0 &&
                                        !activeBookIds.has(seriesBook.id),
                                );
                                const readCount = item.books.filter(
                                    (seriesBook) => seriesBook.readCount > 0,
                                ).length;
                                const setIndex = (nextIndex: number) =>
                                    setSeriesBookIndexes((current) => ({
                                        ...current,
                                        [item.id]:
                                            (nextIndex + item.books.length) %
                                            item.books.length,
                                    }));

                                return (
                                    <div
                                        className="series-candidate"
                                        key={item.id}
                                    >
                                        <BookListItem
                                            book={book}
                                            meta={`${
                                                unreadIndex === index
                                                    ? "next unread"
                                                    : book.readCount
                                                      ? "read"
                                                      : activeBookIds.has(
                                                              book.id,
                                                          )
                                                        ? "reading"
                                                        : "unread"
                                            } · ${readCount}/${item.books.length} read`}
                                            onSelect={onSelectBook}
                                            actions={
                                                <>
                                                    <IconButton
                                                        label={
                                                            mode === "path"
                                                                ? "Add to path"
                                                                : "Add to chart"
                                                        }
                                                        onClick={() =>
                                                            handleAddFlowNode(
                                                                book,
                                                            )
                                                        }
                                                    >
                                                        <ListPlus size={15} />
                                                    </IconButton>
                                                    <StartReadingButton
                                                        book={book}
                                                        onStart={onStart}
                                                    />
                                                </>
                                            }
                                        />
                                        <div className="series-candidate-nav">
                                            <span>
                                                {item.series.title} ·{" "}
                                                {index + 1}/{item.books.length}
                                            </span>
                                            <div>
                                                <IconButton
                                                    label="Previous book"
                                                    onClick={() =>
                                                        setIndex(index - 1)
                                                    }
                                                >
                                                    <ChevronLeft size={15} />
                                                </IconButton>
                                                <IconButton
                                                    label="Next book"
                                                    onClick={() =>
                                                        setIndex(index + 1)
                                                    }
                                                >
                                                    <ChevronRight size={15} />
                                                </IconButton>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {visibleSuggestions < suggestionItems.length ? (
                                <button
                                    className="show-more-button"
                                    onClick={() =>
                                        setVisibleSuggestions((current) =>
                                            Math.min(
                                                current + SUGGESTION_PAGE_SIZE,
                                                suggestionItems.length,
                                            ),
                                        )
                                    }
                                    type="button"
                                >
                                    Show more
                                </button>
                            ) : null}
                        </div>
                    </section>

                    <section className="tray-panel">
                        <div>
                            <p className="eyebrow">Series map</p>
                            <h3>Progress at a glance</h3>
                        </div>
                        <div className="series-atlas compact">
                            {seriesGroups.map(
                                ({ series: item, books: group }) => {
                                    const read = group.filter(
                                        (book) => book.readCount > 0,
                                    ).length;
                                    return (
                                        <article
                                            className="series-atlas-card"
                                            key={item.id}
                                            style={
                                                {
                                                    "--series-color":
                                                        item.color,
                                                } as CSSProperties
                                            }
                                        >
                                            <div>
                                                <h4>{item.title}</h4>
                                                <p>
                                                    {read}/{group.length} read
                                                </p>
                                            </div>
                                            <SeriesProgressBar
                                                color={item.color}
                                                total={group.length}
                                                read={read}
                                                queued={
                                                    group.filter(
                                                        (book) =>
                                                            flowBookIds.has(
                                                                book.id,
                                                            ) &&
                                                            book.readCount ===
                                                                0,
                                                    ).length
                                                }
                                            />
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    </section>
                </aside>
            </div>

            {pickerOpen ? (
                <Modal onClose={() => setPickerOpen(false)}>
                    <LibraryPicker
                        books={books}
                        flowNodes={flowNodes}
                        onSelectBook={onSelectBook}
                        onAddFlowNode={(book) => {
                            handleAddFlowNode(book);
                            setPickerOpen(false);
                        }}
                        onStart={(book) => {
                            onStart(book);
                            setPickerOpen(false);
                        }}
                    />
                </Modal>
            ) : null}
        </div>
    );
}

type SeriesSuggestionItem = {
    type: "series";
    id: string;
    title: string;
    series: Series;
    books: BookWithMeta[];
};

type StandaloneSuggestionItem = {
    type: "standalone";
    id: string;
    title: string;
    book: BookWithMeta;
};

type SuggestionItem = SeriesSuggestionItem | StandaloneSuggestionItem;

function alignFlowPositions(flowNodes: FlowNode[]) {
    const alignedX = alignAxis(
        flowNodes.map((node) => ({ id: node.id, value: node.position_x })),
        FLOW_GRID[0],
    );
    const alignedY = alignAxis(
        flowNodes.map((node) => ({ id: node.id, value: node.position_y })),
        FLOW_GRID[1],
    );

    return new Map(
        flowNodes.map((node) => [
            node.id,
            {
                x:
                    alignedX.get(node.id) ??
                    snapToGrid(node.position_x, FLOW_GRID[0]),
                y:
                    alignedY.get(node.id) ??
                    snapToGrid(node.position_y, FLOW_GRID[1]),
            },
        ]),
    );
}

function alignAxis(
    positions: Array<{ id: string; value: number }>,
    gridSize: number,
) {
    const aligned = new Map<string, number>();
    const sorted = [...positions].sort((a, b) => a.value - b.value);
    const clusters: Array<Array<{ id: string; value: number }>> = [];

    for (const position of sorted) {
        const cluster = clusters[clusters.length - 1];
        if (
            cluster &&
            Math.abs(position.value - medianValue(cluster)) <=
                TIDY_ALIGNMENT_TOLERANCE
        ) {
            cluster.push(position);
        } else {
            clusters.push([position]);
        }
    }

    for (const cluster of clusters) {
        const target = snapToGrid(medianValue(cluster), gridSize);
        for (const position of cluster) {
            aligned.set(position.id, target);
        }
    }

    return aligned;
}

function medianValue(values: Array<{ value: number }>) {
    const sorted = values.map((item) => item.value).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
        return sorted[middle];
    }
    return (sorted[middle - 1] + sorted[middle]) / 2;
}

function snapToGrid(value: number, gridSize: number) {
    return Math.round(value / gridSize) * gridSize;
}

function orderFlowNodes(flowNodes: FlowNode[], flowEdges: FlowEdge[]) {
    const nodeById = new Map(flowNodes.map((node) => [node.id, node]));
    const incomingCount = new Map(flowNodes.map((node) => [node.id, 0]));
    const outgoing = new Map<string, string[]>();

    for (const edge of flowEdges) {
        if (!nodeById.has(edge.source_node_id) || !nodeById.has(edge.target_node_id)) {
            continue;
        }
        outgoing.set(edge.source_node_id, [
            ...(outgoing.get(edge.source_node_id) ?? []),
            edge.target_node_id,
        ]);
        incomingCount.set(
            edge.target_node_id,
            (incomingCount.get(edge.target_node_id) ?? 0) + 1,
        );
    }

    const byPosition = (a: FlowNode, b: FlowNode) =>
        a.position_y - b.position_y ||
        a.position_x - b.position_x ||
        a.node_order - b.node_order ||
        a.id.localeCompare(b.id);
    const queue = flowNodes
        .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
        .sort(byPosition);
    const ordered: FlowNode[] = [];
    const seen = new Set<string>();

    while (queue.length) {
        const node = queue.shift();
        if (!node || seen.has(node.id)) {
            continue;
        }
        seen.add(node.id);
        ordered.push(node);

        const nextIds = (outgoing.get(node.id) ?? []).sort((a, b) =>
            byPosition(nodeById.get(a)!, nodeById.get(b)!),
        );
        for (const nextId of nextIds) {
            incomingCount.set(nextId, (incomingCount.get(nextId) ?? 1) - 1);
            if ((incomingCount.get(nextId) ?? 0) <= 0) {
                const nextNode = nodeById.get(nextId);
                if (nextNode) {
                    queue.push(nextNode);
                    queue.sort(byPosition);
                }
            }
        }
    }

    const leftovers = flowNodes.filter((node) => !seen.has(node.id)).sort(byPosition);
    return [...ordered, ...leftovers];
}

type FlowNodeData = {
    flowNode: FlowNode;
    book: BookWithMeta;
    index: number;
    state: "read" | "reading" | "next" | "blocked";
    onSelectBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onUpdateFlowNodeLabel: (id: string, label: string) => void;
    onDeleteFlowNode: (id: string) => void;
};

function buildFlowElements(
    flowNodes: FlowNode[],
    flowEdges: FlowEdge[],
    bookById: Map<string, BookWithMeta>,
    completedBookIds: Set<string>,
    activeBookIds: Set<string>,
    nextNodeIds: Set<string>,
    onSelectBook: (id: string) => void,
    onStart: (book: BookWithMeta) => void,
    onUpdateFlowNodeLabel: (id: string, label: string) => void,
    onDeleteFlowNode: (id: string) => void,
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
    const nodeWidth = 280;
    const nodeHeight = 138;
    const validNodeIds = new Set(flowNodes.map((node) => node.id));
    const nodes = flowNodes.flatMap((flowNode, index) => {
        const book = bookById.get(flowNode.book_id);
        if (!book) {
            return [];
        }
        const state: FlowNodeData["state"] = completedBookIds.has(book.id)
            ? "read"
            : activeBookIds.has(book.id)
              ? "reading"
              : nextNodeIds.has(flowNode.id)
                ? "next"
                : "blocked";
        return {
            id: flowNode.id,
            type: "bookNode",
            width: nodeWidth,
            height: nodeHeight,
            initialWidth: nodeWidth,
            initialHeight: nodeHeight,
            position: {
                x: flowNode.position_x,
                y: flowNode.position_y,
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            data: {
                flowNode,
                book,
                state,
                index,
                onSelectBook,
                onStart,
                onUpdateFlowNodeLabel,
                onDeleteFlowNode,
            },
        };
    });

    const edges = flowEdges
        .filter(
            (edge) =>
                validNodeIds.has(edge.source_node_id) &&
                validNodeIds.has(edge.target_node_id),
        )
        .map((edge) => ({
            id: edge.id,
            source: edge.source_node_id,
            target: edge.target_node_id,
            sourceHandle: "source",
            targetHandle: "target",
            type: "smoothstep",
            deletable: true,
            animated: nextNodeIds.has(edge.target_node_id),
            interactionWidth: 18,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 14,
                height: 14,
            },
            style: { strokeWidth: 2 },
        }));

    return { nodes, edges };
}

const flowNodeTypes = {
    bookNode: FlowBookNode,
};

function FlowBookNode({ data }: NodeProps<Node<FlowNodeData>>) {
    const {
        book,
        flowNode,
        index,
        state,
        onSelectBook,
        onStart,
        onUpdateFlowNodeLabel,
        onDeleteFlowNode,
    } = data;
    const [note, setNote] = useState(flowNode.label);

    useEffect(() => {
        setNote(flowNode.label);
    }, [flowNode.label]);

    const saveNote = () => {
        const trimmed = note.trim();
        setNote(trimmed);
        onUpdateFlowNodeLabel(flowNode.id, trimmed);
    };
    const stateLabel =
        state === "read"
            ? "Read"
            : state === "reading"
              ? "Reading"
              : state === "next"
                ? "Next"
                : "Later";

    return (
        <article
            className={`journey-node ${state}`}
            style={{ "--accent": book.accent_color } as CSSProperties}
        >
            <Handle id="target" type="target" position={Position.Left} />
            <Handle id="source" type="source" position={Position.Right} />
            <span
                className={`node-state-glyph ${state}`}
                aria-label={stateLabel}
            >
                {state === "read" ? (
                    <Check size={13} />
                ) : state === "reading" ? (
                    <Play size={13} />
                ) : state === "next" ? (
                    <Star size={13} />
                ) : null}
            </span>
            <button
                className="node-cover nodrag"
                onClick={() => onSelectBook(book.id)}
                type="button"
            >
                <BookCover book={book} scale={0.54} />
            </button>
            <div className="node-copy">
                <span className="node-step">
                    {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{book.title}</h3>
                <input
                    className="node-note nodrag"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    onBlur={saveNote}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.currentTarget.blur();
                        }
                    }}
                    placeholder="Add note"
                />
            </div>
            <div className="node-actions nodrag">
                <StartReadingButton book={book} onStart={onStart} compact />
                <IconButton
                    label="Remove from flow"
                    onClick={() => onDeleteFlowNode(flowNode.id)}
                >
                    <Trash2 size={15} />
                </IconButton>
            </div>
        </article>
    );
}

function PathPlanner({
    flowNodes,
    flowEdges,
    bookById,
    completedBookIds,
    activeBookIds,
    nextNodeIds,
    onSelectBook,
    onStart,
    onAddBook,
    onUpdateFlowNodeLabel,
    onDeleteFlowNode,
}: {
    flowNodes: FlowNode[];
    flowEdges: FlowEdge[];
    bookById: Map<string, BookWithMeta>;
    completedBookIds: Set<string>;
    activeBookIds: Set<string>;
    nextNodeIds: Set<string>;
    onSelectBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onAddBook: () => void;
    onUpdateFlowNodeLabel: (id: string, label: string) => void;
    onDeleteFlowNode: (id: string) => void;
}) {
    const connectedPairs = new Set(
        flowEdges.map((edge) => `${edge.source_node_id}:${edge.target_node_id}`),
    );
    const pathItems = flowNodes.flatMap((flowNode) => {
        const book = bookById.get(flowNode.book_id);
        if (!book) {
            return [];
        }
        const state: FlowNodeData["state"] = completedBookIds.has(book.id)
            ? "read"
            : activeBookIds.has(book.id)
              ? "reading"
              : nextNodeIds.has(flowNode.id)
                ? "next"
                : "blocked";
        return [{ flowNode, book, state }];
    });
    const nextItem =
        pathItems.find((item) => item.state === "next") ??
        pathItems.find((item) => item.state === "reading") ??
        pathItems.find((item) => item.state === "blocked");

    if (!pathItems.length) {
        return (
            <button
                className="route-empty journey-empty"
                onClick={onAddBook}
                type="button"
            >
                <Plus size={19} />
                Start a reading path
            </button>
        );
    }

    return (
        <section className="path-planner">
            <div className="path-next-panel">
                <span className="eyebrow">Next Up</span>
                {nextItem ? (
                    <div className="path-next-book">
                        <BookCover book={nextItem.book} scale={0.58} />
                        <div>
                            <h2>{nextItem.book.title}</h2>
                            <p>
                                {nextItem.book.series?.title ??
                                    nextItem.book.category}
                            </p>
                        </div>
                        <StartReadingButton
                            book={nextItem.book}
                            onStart={onStart}
                        />
                    </div>
                ) : (
                    <p className="path-empty-copy">Everything here is read.</p>
                )}
            </div>

            <div className="path-list">
                {pathItems.map((item, index) => {
                    const next = pathItems[index + 1];
                    const isConnectedToNext = next
                        ? connectedPairs.has(
                              `${item.flowNode.id}:${next.flowNode.id}`,
                          )
                        : false;
                    return (
                        <PathRow
                            key={item.flowNode.id}
                            book={item.book}
                            flowNode={item.flowNode}
                            index={index}
                            state={item.state}
                            isConnectedToNext={isConnectedToNext}
                            onSelectBook={onSelectBook}
                            onStart={onStart}
                            onUpdateFlowNodeLabel={onUpdateFlowNodeLabel}
                            onDeleteFlowNode={onDeleteFlowNode}
                        />
                    );
                })}
                <button className="path-add-button" onClick={onAddBook} type="button">
                    <Plus size={16} />
                    Add another book
                </button>
            </div>
        </section>
    );
}

function PathRow({
    book,
    flowNode,
    index,
    state,
    isConnectedToNext,
    onSelectBook,
    onStart,
    onUpdateFlowNodeLabel,
    onDeleteFlowNode,
}: {
    book: BookWithMeta;
    flowNode: FlowNode;
    index: number;
    state: FlowNodeData["state"];
    isConnectedToNext: boolean;
    onSelectBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onUpdateFlowNodeLabel: (id: string, label: string) => void;
    onDeleteFlowNode: (id: string) => void;
}) {
    const [note, setNote] = useState(flowNode.label);

    useEffect(() => {
        setNote(flowNode.label);
    }, [flowNode.label]);

    const saveNote = () => {
        const trimmed = note.trim();
        setNote(trimmed);
        onUpdateFlowNodeLabel(flowNode.id, trimmed);
    };

    return (
        <article className={`path-row ${state}`}>
            <div className="path-step">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {isConnectedToNext ? <i /> : null}
            </div>
            <button
                className="path-cover"
                onClick={() => onSelectBook(book.id)}
                type="button"
            >
                <BookCover book={book} scale={0.54} />
            </button>
            <div className="path-copy">
                <div>
                    <h3>{book.title}</h3>
                    <p>{book.series?.title ?? book.category}</p>
                </div>
                <input
                    className="node-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    onBlur={saveNote}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.currentTarget.blur();
                        }
                    }}
                    placeholder={state === "next" ? "Next Up:" : "Plan note"}
                />
            </div>
            <div className="path-actions">
                <StartReadingButton book={book} onStart={onStart} compact />
                <IconButton
                    label="Remove from path"
                    onClick={() => onDeleteFlowNode(flowNode.id)}
                >
                    <Trash2 size={15} />
                </IconButton>
            </div>
        </article>
    );
}

function LibraryPicker({
    books,
    flowNodes,
    onSelectBook,
    onAddFlowNode,
    onStart,
}: {
    books: BookWithMeta[];
    flowNodes: FlowNode[];
    onSelectBook: (id: string) => void;
    onAddFlowNode: (book: BookWithMeta) => void;
    onStart: (book: BookWithMeta) => void;
}) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const categories = Array.from(
        new Set(books.map((book) => book.category)),
    ).sort();
    const filtered = books.filter((book) => {
        const matchesQuery =
            `${book.title} ${book.series?.author || book.author} ${book.series?.title ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase());
        const matchesCategory =
            category === "all" || book.category === category;
        return matchesQuery && matchesCategory;
    });

    return (
        <section className="library-picker">
            <div className="modal-heading">
                <span>{<Search size={20} />}</span>
                <h2>Find a book</h2>
            </div>
            <div className="grid gap-2">
                <label className="search-field">
                    <Search size={17} />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search shelves"
                    />
                </label>
                <label className="select-field">
                    <SlidersHorizontal size={17} />
                    <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
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
            <div className="picker-grid">
                {filtered.map((book) => (
                    <BookListItem
                        key={book.id}
                        book={book}
                        meta={`${book.series?.title ?? book.category} · ${flowNodes.filter((node) => node.book_id === book.id).length} in chart · ${book.readCount ? `${book.readCount} read` : "Unread"}`}
                        onSelect={onSelectBook}
                        actions={
                            <>
                                <IconButton
                                    label="Add to chart"
                                    onClick={() => onAddFlowNode(book)}
                                >
                                    <ListPlus size={15} />
                                </IconButton>
                                <StartReadingButton
                                    book={book}
                                    onStart={onStart}
                                />
                            </>
                        }
                    />
                ))}
            </div>
        </section>
    );
}
