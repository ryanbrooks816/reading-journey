import { ReadingStatus } from "../lib/types";
import { titleCase } from "../lib/format";

export default function StatusBadge({ status }: { status: ReadingStatus }) {
    return <span className={`chip  ${status}`}>{titleCase(status)}</span>;
}
