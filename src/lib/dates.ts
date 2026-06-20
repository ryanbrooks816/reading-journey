import { DatePrecision, ReadingEntry } from "./types";

/**
 * Converts a partially known date into a sortable timestamp.
 *
 * Precision controls which fallback values are used:
 * - year: uses the middle of the year, June 15
 * - month: uses the middle of the month, the 15th
 * - exact: uses the provided year, month, and day
 * - unknown: sorts as 0
 */
export function sortableDate(value: string, precision: DatePrecision): number {
    if (!value || precision === "unknown") {
        return 0;
    }

    // Default to mid-year / mid-month values so broad dates sort predictably.
    const [year = "0", month = "6", day = "15"] = value.split("-");

    const safeMonth = precision === "year" ? "6" : month;
    const safeDay = precision === "exact" ? day : "15";

    const date = new Date(Number(year), Number(safeMonth) - 1, Number(safeDay));

    // Invalid dates should not break sorting.
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Returns the best available sort value for a reading entry.
 *
 * Completed entries sort by end date first, then start date.
 * Entries without usable dates fall back to the manual entry order.
 */
export function entrySortValue(entry: ReadingEntry): number {
    return (
        sortableDate(entry.end_value, entry.end_precision) ||
        sortableDate(entry.start_value, entry.start_precision) ||
        entry.entry_order ||
        0
    );
}

/**
 * Formats a date for display based on how precise it is.
 *
 * Examples:
 * - unknown: "Date open"
 * - year: "2025"
 * - month: "Jan 2025"
 * - exact: "Jan 15, 2025"
 */
export function displayFlexibleDate(
    value: string,
    precision: DatePrecision,
): string {
    if (!value || precision === "unknown") {
        return "Date open";
    }

    if (precision === "year") {
        return value.slice(0, 4);
    }

    if (precision === "month") {
        const [year, month] = value.split("-");

        // If the stored value is malformed, show the raw value rather than failing.
        if (!year || !month) {
            return value;
        }

        const date = new Date(Number(year), Number(month) - 1, 1);

        return date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
        });
    }

    const date = new Date(`${value}T00:00:00`);

    // Preserve the original value if it cannot be parsed as a valid date.
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * Builds the human-readable date/range label for a reading entry.
 *
 * Explicit period labels always win. Otherwise the label is derived from the
 * entry status and available start/end dates.
 */
export function displayEntryRange(entry: ReadingEntry): string {
    const start = displayFlexibleDate(entry.start_value, entry.start_precision);
    const end = displayFlexibleDate(entry.end_value, entry.end_precision);

    // Custom labels like "Summer 2025" should override computed ranges.
    if (entry.period_label) {
        return entry.period_label;
    }

    if (start === "Date open" && end === "Date open") {
        return "Dates flexible";
    }

    if (entry.status === "planned") {
        return start === "Date open" ? "Queued" : `Queued for ${start}`;
    }

    if (start === "Date open") {
        return end;
    }

    if (end === "Date open") {
        return `${start} onward`;
    }

    return `${start} - ${end}`;
}
