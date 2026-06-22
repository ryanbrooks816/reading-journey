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
        if (request.method === "POST" && id === "bulk") {
            return json(await createBooksBulk(db, await readBody(request)), 201);
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

    if (resource === "covers") {
        if (request.method === "POST" && !id) {
            return json(await uploadCover(request, env), 201);
        }
        if (request.method === "GET" && id) {
            return getCover(env, id);
        }
    }

    if (resource === "flow") {
        if (id === "nodes") {
            if (request.method === "POST" && !action) {
                return json(
                    await createFlowNode(db, await readBody(request)),
                    201,
                );
            }
            if (request.method === "PUT" && action) {
                return json(
                    await updateFlowNode(db, action, await readBody(request)),
                );
            }
            if (request.method === "DELETE" && action) {
                await db
                    .prepare("DELETE FROM flow_nodes WHERE id = ?")
                    .bind(action)
                    .run();
                return json({ ok: true });
            }
        }

        if (id === "edges") {
            if (request.method === "POST" && !action) {
                return json(
                    await createFlowEdge(db, await readBody(request)),
                    201,
                );
            }
            if (request.method === "DELETE" && action) {
                await db
                    .prepare("DELETE FROM flow_edges WHERE id = ?")
                    .bind(action)
                    .run();
                return json({ ok: true });
            }
        }
    }

    throw new ApiError(404, "That library route does not exist.");
}

async function getState(db: D1Database) {
    const [series, books, entries, flowNodes, flowEdges] = await Promise.all([
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

        db
            .prepare(
                "SELECT * FROM flow_nodes ORDER BY node_order ASC, created_at ASC",
            )
            .all(),
        db.prepare("SELECT * FROM flow_edges ORDER BY created_at ASC").all(),
    ]);

    return {
        series: series.results,
        books: books.results,
        entries: entries.results,
        flowNodes: flowNodes.results,
        flowEdges: flowEdges.results,
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
        series_name: nullableText(body.series_name ?? body.series),
        title,
        author: text(body.author),
        sort_order: integer(body.sort_order),
        word_count: Math.max(0, integer(body.word_count ?? body.pages)),
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
    const payload = await resolveBookPayload(db, bookPayload(body));
    const author = await resolveBookAuthor(db, payload.series_id, payload.author);
    await prepareBookInsert(db, id, payload, author).run();
    return fetchOne(db, "books", id);
}

async function createBooksBulk(db: D1Database, body: JsonRecord) {
    const rows = body.books;
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new ApiError(400, "Upload at least one book row.");
    }

    const inserts: D1PreparedStatement[] = [];
    const ids: string[] = [];

    for (const [index, row] of rows.entries()) {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
            throw new ApiError(400, `Row ${index + 2}: Expected a book object.`);
        }

        try {
            const id = makeId("book");
            const payload = await resolveBookPayload(
                db,
                bookPayload(row as JsonRecord),
            );
            const author = await resolveBookAuthor(
                db,
                payload.series_id,
                payload.author,
            );
            ids.push(id);
            inserts.push(prepareBookInsert(db, id, payload, author));
        } catch (error) {
            if (error instanceof ApiError) {
                throw new ApiError(400, `Row ${index + 2}: ${error.message}`);
            }
            throw error;
        }
    }

    await db.batch(inserts);
    const books = await Promise.all(ids.map((id) => fetchOne(db, "books", id)));

    return { count: books.length, books };
}

async function resolveBookPayload(
    db: D1Database,
    payload: ReturnType<typeof bookPayload>,
) {
    const seriesId = await resolveBookSeriesId(
        db,
        payload.series_id,
        payload.series_name,
    );
    return { ...payload, series_id: seriesId };
}

async function resolveBookSeriesId(
    db: D1Database,
    seriesId: string | null,
    seriesName: string | null,
) {
    if (seriesId && seriesName) {
        throw new ApiError(400, "Use series_name or series_id, not both.");
    }
    if (seriesId) {
        const series = await db
            .prepare("SELECT id FROM series WHERE id = ?")
            .bind(seriesId)
            .first<{ id: string }>();
        if (!series) {
            throw new ApiError(400, "Selected series was not found.");
        }
        return series.id;
    }
    if (!seriesName) {
        return null;
    }

    const matches = await db
        .prepare("SELECT id FROM series WHERE LOWER(title) = LOWER(?)")
        .bind(seriesName)
        .all<{ id: string }>();
    if (matches.results.length === 0) {
        throw new ApiError(400, `Series "${seriesName}" was not found.`);
    }
    if (matches.results.length > 1) {
        throw new ApiError(
            400,
            `Series "${seriesName}" matches more than one series.`,
        );
    }
    return matches.results[0].id;
}

function prepareBookInsert(
    db: D1Database,
    id: string,
    payload: Awaited<ReturnType<typeof resolveBookPayload>>,
    author: string,
) {
    return db
        .prepare(
            `INSERT INTO books
        (id, series_id, title, author, sort_order, word_count, category, format, cover_image_url, accent_color, publication_year, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            id,
            payload.series_id,
            payload.title,
            author,
            payload.sort_order,
            payload.word_count,
            payload.category,
            payload.format,
            payload.cover_image_url,
            payload.accent_color,
            payload.publication_year,
            payload.notes,
        );
}

async function updateBook(db: D1Database, id: string, body: JsonRecord) {
    const payload = await resolveBookPayload(db, bookPayload(body));
    const author = await resolveBookAuthor(db, payload.series_id, payload.author);
    await db
        .prepare(
            `UPDATE books SET
        series_id = ?,
        title = ?,
        author = ?,
        sort_order = ?,
        word_count = ?,
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
            author,
            payload.sort_order,
            payload.word_count,
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

async function resolveBookAuthor(
    db: D1Database,
    seriesId: string | null,
    fallback: string,
) {
    if (!seriesId) {
        return fallback;
    }

    const series = await db
        .prepare("SELECT author FROM series WHERE id = ?")
        .bind(seriesId)
        .first<{ author: string }>();
    if (!series) {
        throw new ApiError(400, "Selected series was not found.");
    }
    return series?.author || fallback;
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

async function uploadCover(request: Request, env: Env) {
    if (!env.BOOK_COVERS) {
        throw new ApiError(500, "Book cover storage is not configured.");
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
        throw new ApiError(400, "Cover upload requires a file.");
    }
    if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
        throw new ApiError(
            400,
            "Cover uploads must be WebP, JPEG, or PNG images.",
        );
    }
    if (file.size > 1_500_000) {
        throw new ApiError(
            400,
            "Cover uploads must be 1.5 MB or smaller after optimization.",
        );
    }

    const extension =
        file.type === "image/png"
            ? "png"
            : file.type === "image/jpeg"
              ? "jpg"
              : "webp";
    const key = `${crypto.randomUUID()}.${extension}`;
    await env.BOOK_COVERS.put(key, file.stream(), {
        httpMetadata: {
            contentType: file.type,
            cacheControl: "public, max-age=31536000, immutable",
        },
    });

    return {
        key,
        url: `/api/covers/${key}`,
    };
}

async function getCover(env: Env, key: string): Promise<Response> {
    if (!env.BOOK_COVERS) {
        throw new ApiError(500, "Book cover storage is not configured.");
    }

    const object = await env.BOOK_COVERS.get(key);
    if (!object) {
        throw new ApiError(404, "That cover image was not found.");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new Response(object.body, { headers });
}

function flowNodePayload(body: JsonRecord) {
    const book_id = text(body.book_id).trim();
    if (!book_id) {
        throw new ApiError(400, "Book is required for a flow node.");
    }

    return {
        book_id,
        label: text(body.label),
        position_x: integer(body.position_x),
        position_y: integer(body.position_y),
        node_order: integer(body.node_order),
    };
}

function flowEdgePayload(body: JsonRecord) {
    const source_node_id = text(body.source_node_id).trim();
    const target_node_id = text(body.target_node_id).trim();

    if (!source_node_id || !target_node_id) {
        throw new ApiError(
            400,
            "Both flow nodes are required for a connection.",
        );
    }
    if (source_node_id === target_node_id) {
        throw new ApiError(400, "A flow node cannot connect to itself.");
    }

    return { source_node_id, target_node_id };
}

async function createFlowNode(db: D1Database, body: JsonRecord) {
    const id = makeId("flow");
    const payload = flowNodePayload(body);
    await db
        .prepare(
            `INSERT INTO flow_nodes
        (id, book_id, label, position_x, position_y, node_order)
      VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            id,
            payload.book_id,
            payload.label,
            payload.position_x,
            payload.position_y,
            payload.node_order,
        )
        .run();
    return fetchOne(db, "flow_nodes", id);
}

async function updateFlowNode(db: D1Database, id: string, body: JsonRecord) {
    const current = (await fetchOne(db, "flow_nodes", id)) as {
        book_id: string;
        label: string;
        position_x: number;
        position_y: number;
        node_order: number;
    };
    const payload = flowNodePayload({ ...current, ...body });
    await db
        .prepare(
            `UPDATE flow_nodes SET
        book_id = ?,
        label = ?,
        position_x = ?,
        position_y = ?,
        node_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
        )
        .bind(
            payload.book_id,
            payload.label,
            payload.position_x,
            payload.position_y,
            payload.node_order,
            id,
        )
        .run();
    return fetchOne(db, "flow_nodes", id);
}

async function createFlowEdge(db: D1Database, body: JsonRecord) {
    const payload = flowEdgePayload(body);
    const existing = await db
        .prepare(
            "SELECT * FROM flow_edges WHERE source_node_id = ? AND target_node_id = ?",
        )
        .bind(payload.source_node_id, payload.target_node_id)
        .first();

    if (existing) {
        return existing;
    }

    const id = makeId("edge");
    await db
        .prepare(
            `INSERT INTO flow_edges
        (id, source_node_id, target_node_id)
      VALUES (?, ?, ?)`,
        )
        .bind(id, payload.source_node_id, payload.target_node_id)
        .run();
    return fetchOne(db, "flow_edges", id);
}
