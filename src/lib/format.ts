/** Formats a string into title case. */
export function titleCase(value: string): string {
    return value
        .split(/[-_\s]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

/** Formats a number into a localized string. */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
}
