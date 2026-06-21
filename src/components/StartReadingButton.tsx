import { Play } from "lucide-react";
import { isReading } from "../lib/library";
import type { BookWithMeta } from "../lib/types";
import IconButton from "./IconButton";

export default function StartReadingButton({
    book,
    onStart,
    compact = false,
}: {
    book: BookWithMeta;
    onStart: (book: BookWithMeta) => void;
    compact?: boolean;
}) {
    const reading = isReading(book);

    return (
        <div
            className={`start-action ${compact ? "compact" : ""} ${reading ? "blocked" : ""}`}
        >
            <IconButton
                label={reading ? "Already reading" : "Start reading"}
                onClick={() => onStart(book)}
                disabled={reading}
            >
                <Play size={15} />
            </IconButton>
            {reading && !compact ? <span>Reading</span> : null}
        </div>
    );
}
