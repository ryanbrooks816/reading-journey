import { ChangeEvent, FormEvent, useState } from "react";
import {
    AlertCircle,
    Columns3,
    FileSpreadsheet,
    Info,
    ListChecks,
    Upload,
} from "lucide-react";
import type { BookUploadRow } from "../lib/api";
import type { Series } from "../lib/types";
import FormActions from "./FormActions";

const requiredColumns = ["title"];
const optionalColumns = [
    "author",
    "series_name",
    "sort_order",
    "word_count",
    "pages",
    "category",
    "format",
    "cover_image_url",
    "accent_color",
    "publication_year",
    "notes",
];
const headerAliases = new Map([["series", "series_name"]]);
const allowedColumns = new Set([
    ...requiredColumns,
    ...optionalColumns,
    "series",
    "series_id",
]);
const numericColumns = new Set([
    "sort_order",
    "word_count",
    "pages",
    "publication_year",
]);

export default function BookCsvUploadForm({
    series,
    saving,
    onCancel,
    onSubmit,
}: {
    series: Series[];
    saving: boolean;
    onCancel: () => void;
    onSubmit: (rows: BookUploadRow[]) => Promise<void>;
}) {
    const [rows, setRows] = useState<BookUploadRow[]>([]);
    const [fileName, setFileName] = useState("");
    const [parseError, setParseError] = useState("");
    const [submitError, setSubmitError] = useState("");

    async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }

        setFileName(file.name);
        setRows([]);
        setParseError("");
        setSubmitError("");

        try {
            const text = await file.text();
            setRows(parseBookCsv(text));
        } catch (err) {
            setParseError(
                err instanceof Error ? err.message : "Unable to read CSV.",
            );
        }
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSubmitError("");
        try {
            await onSubmit(rows);
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Unable to upload books.",
            );
        }
    }

    return (
        <form onSubmit={submit}>
            <div className="modal-heading">
                <span>
                    <FileSpreadsheet size={20} />
                </span>
                <h2>Upload books CSV</h2>
            </div>

            <div className="csv-upload-guide">
                <section>
                    <span className="field-label">
                        <Columns3 size={15} />
                        Columns
                    </span>
                    <p>
                        The first row must be headers. The only required column
                        is <code>title</code>. Optional columns mirror the
                        manual book form. Use <code>series_name</code> for a
                        series, or <code>series</code> as a short alias.
                    </p>
                    <div className="csv-column-list">
                        {requiredColumns.map((column) => (
                            <code key={column}>{column}</code>
                        ))}
                        {optionalColumns.map((column) => (
                            <code key={column}>{column}</code>
                        ))}
                    </div>
                </section>

                <section>
                    <span className="field-label">
                        <Info size={15} />
                        Values
                    </span>
                    <p>
                        Series names must match an existing series exactly,
                        ignoring letter case. Use whole numbers for{" "}
                        <code>sort_order</code>,{" "}
                        <code>word_count</code>, <code>pages</code>, and{" "}
                        <code>publication_year</code>. Blank cells use the same
                        defaults as the manual form.
                    </p>
                </section>

                {series.length ? (
                    <details className="csv-series-detail">
                        <summary>Available series names</summary>
                        <div className="csv-series-list">
                            {series.map((item) => (
                                <span key={item.id}>
                                    <strong>{item.title}</strong>
                                    {item.author ? <em>{item.author}</em> : null}
                                </span>
                            ))}
                        </div>
                    </details>
                ) : null}
            </div>

            <label className="csv-file-drop">
                <Upload size={18} />
                <span>{fileName || "Choose CSV file"}</span>
                <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
            </label>

            {parseError || submitError ? (
                <div className="form-alert error">
                    <AlertCircle size={16} />
                    <span>{parseError || submitError}</span>
                </div>
            ) : null}

            {rows.length ? (
                <div className="csv-preview">
                    <strong>
                        <ListChecks size={16} />
                        {rows.length} book rows ready
                    </strong>
                    <span>
                        Uploads are all-or-nothing: if any row fails validation,
                        no books are added.
                    </span>
                </div>
            ) : null}

            <FormActions
                saving={saving}
                onCancel={onCancel}
                disabled={!rows.length || Boolean(parseError)}
                saveLabel="Upload"
            />
        </form>
    );
}

function parseBookCsv(input: string): BookUploadRow[] {
    const table = parseCsv(input).filter((row) =>
        row.some((cell) => cell.trim()),
    );
    if (table.length < 2) {
        throw new Error("CSV must include a header row and at least one book.");
    }

    const headers = table[0].map((header, index) =>
        index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim(),
    );
    const normalizedHeaders = headers.map((header) => {
        const normalized = header.toLowerCase();
        return headerAliases.get(normalized) ?? normalized;
    });
    const missing = requiredColumns.filter(
        (column) => !normalizedHeaders.includes(column),
    );
    if (missing.length) {
        throw new Error(`Missing required column: ${missing.join(", ")}.`);
    }

    const duplicates = normalizedHeaders.filter(
        (header, index) => header && normalizedHeaders.indexOf(header) !== index,
    );
    if (duplicates.length) {
        throw new Error(`Duplicate column: ${duplicates.join(", ")}.`);
    }

    const unknown = normalizedHeaders.filter(
        (header) => header && !allowedColumns.has(header),
    );
    if (unknown.length) {
        throw new Error(`Unknown column: ${unknown.join(", ")}.`);
    }

    return table.slice(1).map((cells, index) => {
        const row: Record<string, string | number> = {};
        for (const [cellIndex, header] of normalizedHeaders.entries()) {
            const value = cells[cellIndex]?.trim() ?? "";
            if (!header || !value) {
                continue;
            }
            if (numericColumns.has(header)) {
                const number = Number(value);
                if (!Number.isFinite(number) || !Number.isInteger(number)) {
                    throw new Error(
                        `Row ${index + 2}: ${header} must be a whole number.`,
                    );
                }
                row[header] = number;
            } else {
                row[header] = value;
            }
        }
        if (!row.title || typeof row.title !== "string") {
            throw new Error(`Row ${index + 2}: title is required.`);
        }
        return row as BookUploadRow;
    });
}

function parseCsv(input: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index];
        const next = input[index + 1];

        if (char === '"') {
            if (quoted && next === '"') {
                cell += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
            continue;
        }

        if (char === "," && !quoted) {
            row.push(cell);
            cell = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !quoted) {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            if (char === "\r" && next === "\n") {
                index += 1;
            }
            continue;
        }

        cell += char;
    }

    if (quoted) {
        throw new Error("CSV has an unclosed quoted value.");
    }

    row.push(cell);
    rows.push(row);
    return rows;
}
