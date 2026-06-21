import { ReactNode, CSSProperties } from "react";
import type { BookWithMeta } from "../lib/types";
import BookCover from "./BookCover";

export default function BookListItem({
    book,
    meta,
    onSelect,
    actions,
}: {
    book: BookWithMeta;
    meta: string;
    onSelect: (id: string) => void;
    actions?: ReactNode;
}) {
    return (
        <article
            className="book-list-item"
            style={{ "--accent": book.accent_color } as CSSProperties}
        >
            <button
                className="book-list-cover"
                onClick={() => onSelect(book.id)}
                type="button"
            >
                <BookCover book={book} scale={0.62} />
            </button>
            <button
                className="book-list-copy"
                onClick={() => onSelect(book.id)}
                type="button"
            >
                <h3>{book.title}</h3>
                <p>{meta}</p>
            </button>
            {actions ? (
                <div className="book-list-actions">{actions}</div>
            ) : null}
        </article>
    );
}
