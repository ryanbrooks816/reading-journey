import { Star } from "lucide-react";

export default function RatingBadge({ rating }: { rating: number }) {
    return (
        <span className="chip">
            <Star size={13} fill="currentColor" />
            {rating}/10
        </span>
    );
}
