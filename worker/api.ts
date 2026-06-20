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
    enumValue,
    nullableRating,
} from "./utils";
import type { DatePrecision, ReadingStatus, ReadKind } from "../src/lib/types";

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

    if (request.method === "GET" && resource === "state") {
        return json(await getState(db));
    }

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

    if (resource === "entries") {
        if (request.method === "POST" && !id) {
            return json(await createEntry(db, await readBody(request)), 201);
        }
        if (request.method === "PUT" && id) {
            return json(await updateEntry(db, id, await readBody(request)));
        }
        if (request.method === "DELETE" && id && !action) {
            await db
                .prepare("DELETE FROM reading_entries WHERE id = ?")
                .bind(id)
                .run();
            return json({ ok: true });
        }
    }

    throw new ApiError(404, "That library route does not exist.");
}

async function getState(db: D1Database) {
    const [series, books, entries] = await Promise.all([
        db
            .prepare("SELECT * FROM series ORDER BY sort_order ASC, title ASC")
            .all(),
        db
            .prepare(
                "SELECT * FROM books ORDER BY COALESCE(series_id, ''), sort_order ASC, title ASC",
            )
            .all(),
        db
            .prepare(
                "SELECT * FROM reading_entries ORDER BY entry_order ASC, created_at ASC",
            )
            .all(),
    ]);

    return {
        series: series.results,
        books: books.results,
        entries: entries.results,
        generatedAt: new Date().toISOString(),
    };
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

function entryPayload(body: JsonRecord) {
    const book_id = text(body.book_id).trim();
    if (!book_id) {
        throw new ApiError(400, "Book is required for a reading entry.");
    }

    return {
        book_id,
        status: enumValue<ReadingStatus>(body.status, [
            "planned",
            "reading",
            "finished",
            "paused",
            "dnf",
        ]),
        read_kind: enumValue<ReadKind>(body.read_kind, ["first", "reread"]),
        start_value: text(body.start_value),
        start_precision: enumValue<DatePrecision>(body.start_precision, [
            "unknown",
            "year",
            "month",
            "exact",
        ]),
        end_value: text(body.end_value),
        end_precision: enumValue<DatePrecision>(body.end_precision, [
            "unknown",
            "year",
            "month",
            "exact",
        ]),
        rating: nullableRating(body.rating),
        review: text(body.review),
        period_label: text(body.period_label),
        entry_order: integer(body.entry_order),
    };
}

async function createEntry(db: D1Database, body: JsonRecord) {
    const id = makeId("entry");
    const payload = entryPayload(body);
    await db
        .prepare(
            `INSERT INTO reading_entries
        (id, book_id, status, read_kind, start_value, start_precision, end_value, end_precision, rating, review, period_label, entry_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            id,
            payload.book_id,
            payload.status,
            payload.read_kind,
            payload.start_value,
            payload.start_precision,
            payload.end_value,
            payload.end_precision,
            payload.rating,
            payload.review,
            payload.period_label,
            payload.entry_order,
        )
        .run();
    return fetchOne(db, "reading_entries", id);
}

async function updateEntry(db: D1Database, id: string, body: JsonRecord) {
    const payload = entryPayload(body);
    await db
        .prepare(
            `UPDATE reading_entries SET
        book_id = ?,
        status = ?,
        read_kind = ?,
        start_value = ?,
        start_precision = ?,
        end_value = ?,
        end_precision = ?,
        rating = ?,
        review = ?,
        period_label = ?,
        entry_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
        )
        .bind(
            payload.book_id,
            payload.status,
            payload.read_kind,
            payload.start_value,
            payload.start_precision,
            payload.end_value,
            payload.end_precision,
            payload.rating,
            payload.review,
            payload.period_label,
            payload.entry_order,
            id,
        )
        .run();
    return fetchOne(db, "reading_entries", id);
}
