import { DatePrecision, ReadingEntry } from "./types";

/**
 * Converts a date string and its precision into a sortable timestamp.
 */
export function sortableDate(value: string, precision: DatePrecision): number {
    if (!value || precision === "unknown") {
        return 0;
    }

    const [year = "0", month = "6", day = "15"] = value.split("-");
    const safeMonth = precision === "year" ? "6" : month;
    const safeDay = precision === "exact" ? day : "15";
    const date = new Date(Number(year), Number(safeMonth) - 1, Number(safeDay));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Calculates a sort value for a reading entry based on its date and order.
 */
export function entrySortValue(entry: ReadingEntry): number {
    return (
        sortableDate(entry.end_value, entry.end_precision) ||
        sortableDate(entry.start_value, entry.start_precision) ||
        entry.entry_order ||
        0
    );
}
