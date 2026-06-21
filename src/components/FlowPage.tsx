import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Background,
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
    Check,
    ListPlus,
    Map as MapIcon,
    Play,
    Plus,
    Search,
    SlidersHorizontal,
    Star,
} from "lucide-react";
import type { CSSProperties } from "react";
import { BookWithMeta, Series, FlowNode, FlowEdge } from "../lib/types";
import type { LibraryStats } from "../lib/library";
import { formatNumber } from "../lib/format";
import { PageHero } from "./PageHero";
import IconButton from "./IconButton";
import BookCover from "./BookCover";
import Modal from "./Modal";
import SeriesProgressBar from "./SeriesProgressBar";
import BookListItem from "./BookListItem";
import StartReadingButton from "./StartReadingButton";

export const FLOW_GRID: [number, number] = [32, 32];

export function snapFlowPosition(position: { x: number; y: number }) {
    return {
        x: Math.round(position.x / FLOW_GRID[0]) * FLOW_GRID[0],
        y: Math.round(position.y / FLOW_GRID[1]) * FLOW_GRID[1],
    };
}

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
    onAddFlowEdge,
    onDeleteFlowEdge,
}: {
    books: BookWithMeta[];
    series: Series[];
    flowNodes: FlowNode[];
    flowEdges: FlowEdge[];
    stats: LibraryStats;
    onSelectBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
    onAddFlowNode: (book: BookWithMeta) => void;
    onUpdateFlowNodePosition: (
        id: string,
        position: { x: number; y: number },
    ) => void;
    onAddFlowEdge: (sourceId: string, targetId: string) => void;
    onDeleteFlowEdge: (id: string) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);

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
        ],
    );
    const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);

    useEffect(() => {
        setNodes(flow.nodes);
    }, [flow, setNodes]);

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

    const unreadSuggestions = series
        .map((item) => {
            const seriesBooks = books
                .filter((book) => book.series_id === item.id)
                .sort((a, b) => a.sort_order - b.sort_order);
            return seriesBooks.find((book) => book.readCount === 0);
        })
        .filter((book): book is BookWithMeta => Boolean(book));
    const rereadSuggestions = books
        .filter((book) => book.readCount > 0)
        .filter(
            (book, index, all) =>
                all.findIndex((item) => item.series_id === book.series_id) ===
                index,
        )
        .slice(0, 4);
    const suggestedNext = [...unreadSuggestions, ...rereadSuggestions]
        .filter(
            (book, index, all) =>
                all.findIndex((item) => item.id === book.id) === index,
        )
        .slice(0, 10);
    const seriesGroups = series
        .map((item) => ({
            series: item,
            books: books
                .filter((book) => book.series_id === item.id)
                .sort((a, b) => a.sort_order - b.sort_order),
        }))
        .filter((group) => group.books.length > 0);

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
                    <div className="journey-flow-canvas">
                        {nodes.length ? (
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
                                onNodeDragStop={handleNodeDragStop}
                                defaultViewport={{
                                    x: 36,
                                    y: 92,
                                    zoom: 0.82,
                                }}
                                minZoom={0.72}
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
                                deleteKeyCode={["Backspace", "Delete"]}
                            >
                                <Controls
                                    position="bottom-center"
                                    showInteractive={false}
                                />
                                <Background
                                    color="rgba(60, 45, 32, 0.18)"
                                    gap={34}
                                />
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
                    </section>

                    <section className="tray-panel">
                        <div>
                            <p className="eyebrow">Next in series</p>
                            <h3>Likely next reads</h3>
                        </div>
                        <div className="journey-candidates">
                            {suggestedNext.map((book) => (
                                <BookListItem
                                    key={book.id}
                                    book={book}
                                    meta={`${book.series?.title ?? "Standalone"} · ${book.readCount ? "reread" : "next unread"}`}
                                    onSelect={onSelectBook}
                                    actions={
                                        <>
                                            <IconButton
                                                label="Add to chart"
                                                onClick={() =>
                                                    onAddFlowNode(book)
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
                            ))}
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
                            onAddFlowNode(book);
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

type FlowNodeData = {
    flowNode: FlowNode;
    book: BookWithMeta;
    index: number;
    state: "read" | "reading" | "next" | "blocked";
    onSelectBook: (id: string) => void;
    onStart: (book: BookWithMeta) => void;
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
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
    const nodeWidth = 280;
    const nodeHeight = 126;
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
    const { book, flowNode, index, state, onSelectBook, onStart } = data;
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
                <p>{flowNode.label || book.series?.title || book.category}</p>
            </div>
            <div className="node-actions nodrag">
                <StartReadingButton book={book} onStart={onStart} compact />
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
