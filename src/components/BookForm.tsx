import { BookPlus, Upload } from "lucide-react";
import { useState, ChangeEvent, FormEvent } from "react";
import { libraryApi } from "../lib/api";
import { optimizeCoverFile } from "../lib/covers";
import type { Book, Series } from "../lib/types";
import BookCover from "./BookCover";
import FormActions from "./FormActions";

export default function BookForm({
    book,
    series,
    saving,
    onCancel,
    onSubmit,
}: {
    book?: Book;
    series: Series[];
    saving: boolean;
    onCancel: () => void;
    onSubmit: (payload: Partial<Book>) => void;
}) {
    const [form, setForm] = useState({
        series_id: book?.series_id ?? "",
        title: book?.title ?? "",
        author: book?.author ?? "",
        sort_order: book?.sort_order ?? 0,
        pages: book?.pages ?? 0,
        category: book?.category ?? "Fantasy",
        format: book?.format ?? "Novel",
        cover_image_url: book?.cover_image_url ?? "",
        accent_color: book?.accent_color ?? "#c79650",
        publication_year: book?.publication_year ?? "",
        notes: book?.notes ?? "",
    });
    const [coverUpload, setCoverUpload] = useState({
        uploading: false,
        error: "",
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        onSubmit({
            ...form,
            publication_year: form.publication_year
                ? Number(form.publication_year)
                : null,
        });
    }

    async function chooseCover(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setCoverUpload({ uploading: true, error: "" });
        try {
            const optimized = await optimizeCoverFile(file);
            const upload = await libraryApi.uploadCover(optimized);
            setForm((current) => ({
                ...current,
                cover_image_url: upload.url,
            }));
            setCoverUpload({ uploading: false, error: "" });
        } catch (error) {
            setCoverUpload({
                uploading: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to upload cover.",
            });
        } finally {
            event.target.value = "";
        }
    }

    return (
        <form onSubmit={submit}>
            <div className="modal-heading">
                <span>
                    <BookPlus size={20} />
                </span>
                <h2>{book ? "Edit book" : "New book"}</h2>
            </div>
            <div className="form-grid two">
                <label>
                    <span>Title</span>
                    <input
                        required
                        value={form.title}
                        onChange={(event) =>
                            setForm({ ...form, title: event.target.value })
                        }
                    />
                </label>
                <label>
                    <span>Author</span>
                    <input
                        value={form.author}
                        onChange={(event) =>
                            setForm({ ...form, author: event.target.value })
                        }
                    />
                </label>
                <label>
                    <span>Series</span>
                    <select
                        value={form.series_id}
                        onChange={(event) =>
                            setForm({ ...form, series_id: event.target.value })
                        }
                    >
                        <option value="">Standalone</option>
                        {series.map((item) => (
                            <option value={item.id} key={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>Series order</span>
                    <input
                        type="number"
                        value={form.sort_order}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                sort_order: Number(event.target.value),
                            })
                        }
                    />
                </label>
                <label>
                    <span>Pages</span>
                    <input
                        type="number"
                        min="0"
                        value={form.pages}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                pages: Number(event.target.value),
                            })
                        }
                    />
                </label>
                <label>
                    <span>Publication year</span>
                    <input
                        type="number"
                        value={form.publication_year}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                publication_year: event.target.value,
                            })
                        }
                    />
                </label>
                <label>
                    <span>Category</span>
                    <input
                        value={form.category}
                        onChange={(event) =>
                            setForm({ ...form, category: event.target.value })
                        }
                    />
                </label>
                <label>
                    <span>Format</span>
                    <input
                        value={form.format}
                        onChange={(event) =>
                            setForm({ ...form, format: event.target.value })
                        }
                    />
                </label>
                <label>
                    <span>Accent</span>
                    <input
                        type="color"
                        value={form.accent_color}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                accent_color: event.target.value,
                            })
                        }
                    />
                </label>
                <label className="two-span">
                    <span>Cover image</span>
                    <div className="cover-upload-field">
                        <label className="file-button">
                            <Upload size={16} />
                            <span>
                                {coverUpload.uploading
                                    ? "Uploading..."
                                    : "Choose file"}
                            </span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={chooseCover}
                                disabled={coverUpload.uploading || saving}
                            />
                        </label>
                        {form.cover_image_url ? (
                            <BookCover
                                book={{
                                    title: form.title || "Cover preview",
                                    cover_image_url: form.cover_image_url,
                                    accent_color: form.accent_color,
                                }}
                                scale={0.46}
                            />
                        ) : null}
                    </div>
                    {coverUpload.error ? (
                        <span className="field-error">{coverUpload.error}</span>
                    ) : null}
                </label>
                <label className="two-span">
                    <span>Notes</span>
                    <textarea
                        value={form.notes}
                        onChange={(event) =>
                            setForm({ ...form, notes: event.target.value })
                        }
                    />
                </label>
            </div>
            <FormActions saving={saving} onCancel={onCancel} />
        </form>
    );
}
