import { ApiError } from ".";
import type { JsonRecord } from ".";
import { TABLES } from ".";

// Request helpers

export function json(body: unknown, status = 200): Response {
    return Response.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

export async function readBody(request: Request): Promise<JsonRecord> {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError(400, "Expected a JSON object.");
    }
    return body as JsonRecord;
}

// DB helpers

export function makeId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}

export async function fetchOne(db: D1Database, table: string, id: string) {
    if (!TABLES.has(table)) {
        throw new ApiError(500, "Invalid table lookup.");
    }

    const record = await db
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .bind(id)
        .first();
    if (!record) {
        throw new ApiError(404, "That record was not found.");
    }
    return record;
}

// Type guards

export function text(value: unknown): string {
    return typeof value === "string"
        ? value
        : value == null
          ? ""
          : String(value);
}

export function nullableText(value: unknown): string | null {
    const result = text(value).trim();
    return result ? result : null;
}

export function nullableInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    return integer(value);
}

export function enumValue<T extends string>(value: unknown, allowed: T[]): T {
    return allowed.includes(value as T) ? (value as T) : allowed[0];
}

export function nullableRating(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const rating = Number(value);
    if (!Number.isFinite(rating)) {
        return null;
    }
    return Math.min(10, Math.max(1, Math.round(rating)));
}

export function integer(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : 0;
}
