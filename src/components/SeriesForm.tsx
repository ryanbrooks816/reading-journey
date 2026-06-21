import { Layers3, Upload } from "lucide-react";
import { useState, ChangeEvent, FormEvent } from "react";
import { libraryApi } from "../lib/api";
import { optimizeCoverFile } from "../lib/covers";
import type { Series } from "../lib/types";
import BookCover from "./BookCover";
import FormActions from "./FormActions";

export default function SeriesForm({
    series,
    saving,
    onCancel,
    onSubmit,
}: {
    series?: Series;
    saving: boolean;
    onCancel: () => void;
    onSubmit: (payload: Partial<Series>) => void;
}) {
    const [form, setForm] = useState({
        title: series?.title ?? "",
        author: series?.author ?? "",
        description: series?.description ?? "",
        cover_image_url: series?.cover_image_url ?? "",
        color: series?.color ?? "#8d3b46",
        sort_order: series?.sort_order ?? 0,
    });
    const [coverUpload, setCoverUpload] = useState({
        uploading: false,
        error: "",
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        onSubmit(form);
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
                <span className="kicker">
                    <Layers3 size={20} />
                </span>
                <h2>{series ? "Edit series" : "New series"}</h2>
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
                    <span>Order</span>
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
                    <span>Color</span>
                    <input
                        type="color"
                        value={form.color}
                        onChange={(event) =>
                            setForm({ ...form, color: event.target.value })
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
                                    accent_color: form.color,
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
                    <span>Description</span>
                    <textarea
                        value={form.description}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                description: event.target.value,
                            })
                        }
                    />
                </label>
            </div>
            <FormActions saving={saving} onCancel={onCancel} />
        </form>
    );
}
