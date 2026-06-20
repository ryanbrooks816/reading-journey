import { useState, CSSProperties } from "react";
import { Book } from "../lib/types";

export default function BookCover({
    book,
    scale = 1,
}: {
    book: Pick<Book, "title" | "cover_image_url" | "accent_color">;
    scale?: number;
}) {
    const [error, setError] = useState(false);
    const showImage = book.cover_image_url && !error;

    return (
        <div
            className="book-cover"
            style={
                {
                    "--accent": book.accent_color,
                    "--cover-scale": scale,
                } as CSSProperties
            }
        >
            {showImage ? (
                <img
                    src={book.cover_image_url}
                    alt={`${book.title} cover`}
                    onError={() => setError(true)}
                />
            ) : (
                <div className="cover-fallback">
                    <span>{book.title}</span>
                </div>
            )}
            <i />
        </div>
    );
}
