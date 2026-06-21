import { json } from "./utils";
import { routeRequest } from "./api";

export interface Env {
    DB: D1Database;
    BOOK_COVERS?: R2Bucket;
}

export type JsonRecord = Record<string, unknown>;

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export const TABLES = new Set([
    "series",
    "books",
    "reading_entries",
    "flow_nodes",
    "flow_edges",
]);

const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#8d3b46',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    series_id TEXT REFERENCES series(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    pages INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'Fantasy',
    format TEXT NOT NULL DEFAULT 'Novel',
    cover_image_url TEXT NOT NULL DEFAULT '',
    accent_color TEXT NOT NULL DEFAULT '#c79650',
    publication_year INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS reading_entries (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('planned', 'reading', 'finished', 'paused', 'dnf')),
    read_kind TEXT NOT NULL DEFAULT 'first' CHECK (read_kind IN ('first', 'reread')),
    start_value TEXT NOT NULL DEFAULT '',
    start_precision TEXT NOT NULL DEFAULT 'unknown' CHECK (start_precision IN ('unknown', 'year', 'month', 'exact')),
    end_value TEXT NOT NULL DEFAULT '',
    end_precision TEXT NOT NULL DEFAULT 'unknown' CHECK (end_precision IN ('unknown', 'year', 'month', 'exact')),
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
    review TEXT NOT NULL DEFAULT '',
    period_label TEXT NOT NULL DEFAULT '',
    entry_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS flow_nodes (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT '',
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    node_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS flow_edges (
    id TEXT PRIMARY KEY,
    source_node_id TEXT NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_node_id, target_node_id),
    CHECK (source_node_id <> target_node_id)
  )`,
    "CREATE INDEX IF NOT EXISTS idx_books_series ON books(series_id, sort_order)",
    "CREATE INDEX IF NOT EXISTS idx_entries_book ON reading_entries(book_id)",
    "CREATE INDEX IF NOT EXISTS idx_entries_status ON reading_entries(status)",
    "CREATE INDEX IF NOT EXISTS idx_entries_dates ON reading_entries(end_value, start_value)",
    "CREATE INDEX IF NOT EXISTS idx_flow_nodes_book ON flow_nodes(book_id)",
    "CREATE INDEX IF NOT EXISTS idx_flow_edges_source ON flow_edges(source_node_id)",
    "CREATE INDEX IF NOT EXISTS idx_flow_edges_target ON flow_edges(target_node_id)",
];

let schemaReady: Promise<void> | undefined;

export default {
    async fetch(request, env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204 });
        }

        if (!url.pathname.startsWith("/api/")) {
            return new Response(null, { status: 404 });
        }

        try {
            await ensureDatabase(env.DB);
            return await routeRequest(request, env, url);
        } catch (error) {
            if (error instanceof ApiError) {
                return json({ error: error.message }, error.status);
            }
            console.error(error);
            return json({ error: "The library hit a database snag." }, 500);
        }
    },
} satisfies ExportedHandler<Env>;

async function ensureDatabase(db: D1Database): Promise<void> {
    schemaReady ??= initializeDatabase(db);
    return schemaReady;
}

async function initializeDatabase(db: D1Database): Promise<void> {
    for (const statement of schemaStatements) {
        await db.prepare(statement).run();
    }
}
