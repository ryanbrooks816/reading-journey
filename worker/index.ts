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
