import type { Book, Series, ReadingEntry, FlowNode, FlowEdge } from "./types";
import type { LibraryState } from "./library";

type RequestOptions = Omit<RequestInit, "body"> & {
    body?: unknown;
};

async function request<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
        },
        body:
            options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            payload && typeof payload === "object" && "error" in payload
                ? String(payload.error)
                : "Something went wrong.";
        throw new Error(message);
    }

    return payload as T;
}

export const libraryApi = {
    getState: () => request<LibraryState>("/state"),

    createSeries: (body: Partial<Series>) =>
        request<Series>("/series", { method: "POST", body }),

    updateSeries: (id: string, body: Partial<Series>) =>
        request<Series>(`/series/${id}`, { method: "PUT", body }),

    deleteSeries: (id: string) =>
        request<{ ok: true }>(`/series/${id}`, { method: "DELETE" }),

    createBook: (body: Partial<Book>) =>
        request<Book>("/books", { method: "POST", body }),

    updateBook: (id: string, body: Partial<Book>) =>
        request<Book>(`/books/${id}`, { method: "PUT", body }),

    deleteBook: (id: string) =>
        request<{ ok: true }>(`/books/${id}`, { method: "DELETE" }),

    createEntry: (body: Partial<ReadingEntry>) =>
        request<ReadingEntry>("/entries", { method: "POST", body }),

    updateEntry: (id: string, body: Partial<ReadingEntry>) =>
        request<ReadingEntry>(`/entries/${id}`, { method: "PUT", body }),

    deleteEntry: (id: string) =>
        request<{ ok: true }>(`/entries/${id}`, { method: "DELETE" }),

    uploadCover: async (file: File) => {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/covers", {
            method: "POST",
            body,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            const message =
                payload && typeof payload === "object" && "error" in payload
                    ? String(payload.error)
                    : "Cover upload failed.";
            throw new Error(message);
        }

        return payload as { key: string; url: string };
    },

    createFlowNode: (body: Partial<FlowNode>) =>
        request<FlowNode>("/flow/nodes", { method: "POST", body }),

    updateFlowNode: (id: string, body: Partial<FlowNode>) =>
        request<FlowNode>(`/flow/nodes/${id}`, { method: "PUT", body }),

    deleteFlowNode: (id: string) =>
        request<{ ok: true }>(`/flow/nodes/${id}`, { method: "DELETE" }),

    createFlowEdge: (body: Partial<FlowEdge>) =>
        request<FlowEdge>("/flow/edges", { method: "POST", body }),

    deleteFlowEdge: (id: string) =>
        request<{ ok: true }>(`/flow/edges/${id}`, { method: "DELETE" }),
};
