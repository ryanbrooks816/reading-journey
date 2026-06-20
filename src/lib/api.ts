import type { Series } from "./types";
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
};
