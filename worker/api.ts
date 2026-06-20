import type { Env, JsonRecord } from ".";
import { ApiError } from ".";
import {
    json,
    readBody,
    makeId,
    fetchOne,
    text,
    nullableText,
    integer,
    nullableInteger,
} from "./utils";

export async function routeRequest(
    request: Request,
    env: Env,
    url: URL,
): Promise<Response> {
    const db = env.DB;
    const segments = url.pathname
        .replace(/^\/api\/?/, "")
        .split("/")
        .filter(Boolean);
    const [resource, id, action] = segments;

    if (resource === "series") {
        if (request.method === "POST" && !id) {
            return json(await createSeries(db, await readBody(request)), 201);
        }

        if (request.method === "PUT" && id) {
            return json(await updateSeries(db, id, await readBody(request)));
        }

        if (request.method === "DELETE" && id) {
            await db.prepare("DELETE FROM series WHERE id = ?").bind(id).run();
            return json({ ok: true });
        }
    }

    if (resource === "books") {
        if (request.method === "POST" && !id) {
            return json(await createBook(db, await readBody(request)), 201);
        }
        if (request.method === "PUT" && id) {
            return json(await updateBook(db, id, await readBody(request)));
        }
        if (request.method === "DELETE" && id) {
            await db.prepare("DELETE FROM books WHERE id = ?").bind(id).run();
            return json({ ok: true });
        }
    }

    throw new ApiError(404, "That library route does not exist.");
}

function seriesPayload(body: JsonRecord) {
    const title = text(body.title).trim();
    if (!title) {
        throw new ApiError(400, "Series title is required.");
    }

    return {
        title,
        author: text(body.author),
        description: text(body.description),
        cover_image_url: text(body.cover_image_url),
        color: text(body.color) || "#8d3b46",
        sort_order: integer(body.sort_order),
    };
}

async function createSeries(db: D1Database, body: JsonRecord) {
    const id = makeId("series");
    const payload = seriesPayload(body);
    await db
        .prepare(
            `INSERT INTO series
        (id, title, author, description, cover_image_url, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            id,
            payload.title,
            payload.author,
            payload.description,
            payload.cover_image_url,
            payload.color,
            payload.sort_order,
        )
        .run();
    return fetchOne(db, "series", id);
}

async function updateSeries(db: D1Database, id: string, body: JsonRecord) {
    const payload = seriesPayload(body);
    await db
        .prepare(
            `UPDATE series SET
        title = ?,
        author = ?,
        description = ?,
        cover_image_url = ?,
        color = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
        )
        .bind(
            payload.title,
            payload.author,
            payload.description,
            payload.cover_image_url,
            payload.color,
            payload.sort_order,
            id,
        )
        .run();
    return fetchOne(db, "series", id);
}

function bookPayload(body: JsonRecord) {
    const title = text(body.title).trim();
    if (!title) {
        throw new ApiError(400, "Book title is required.");
    }

    return {
        series_id: nullableText(body.series_id),
        title,
        author: text(body.author),
        sort_order: integer(body.sort_order),
        pages: Math.max(0, integer(body.pages)),
        category: text(body.category) || "Fantasy",
        format: text(body.format) || "Novel",
        cover_image_url: text(body.cover_image_url),
        accent_color: text(body.accent_color) || "#c79650",
        publication_year: nullableInteger(body.publication_year),
        notes: text(body.notes),
    };
}

async function createBook(db: D1Database, body: JsonRecord) {
    const id = makeId("book");
    const payload = bookPayload(body);
    await db
        .prepare(
            `INSERT INTO books
        (id, series_id, title, author, sort_order, pages, category, format, cover_image_url, accent_color, publication_year, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            id,
            payload.series_id,
            payload.title,
            payload.author,
            payload.sort_order,
            payload.pages,
            payload.category,
            payload.format,
            payload.cover_image_url,
            payload.accent_color,
            payload.publication_year,
            payload.notes,
        )
        .run();
    return fetchOne(db, "books", id);
}

async function updateBook(db: D1Database, id: string, body: JsonRecord) {
    const payload = bookPayload(body);
    await db
        .prepare(
            `UPDATE books SET
        series_id = ?,
        title = ?,
        author = ?,
        sort_order = ?,
        pages = ?,
        category = ?,
        format = ?,
        cover_image_url = ?,
        accent_color = ?,
        publication_year = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
        )
        .bind(
            payload.series_id,
            payload.title,
            payload.author,
            payload.sort_order,
            payload.pages,
            payload.category,
            payload.format,
            payload.cover_image_url,
            payload.accent_color,
            payload.publication_year,
            payload.notes,
            id,
        )
        .run();
    return fetchOne(db, "books", id);
}
