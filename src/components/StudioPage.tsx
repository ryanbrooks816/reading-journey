import { Layers3, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { Series } from "../lib/types";
import type { Preferences } from "../lib/preferences";
import IconButton from "./IconButton";
import { PageHero } from "./PageHero";

export default function StudioPage({
    preferences,
    setPreferences,
    series,
    onAddSeries,
    onEditSeries,
    onDeleteSeries,
}: {
    preferences: Preferences;
    setPreferences: (next: Preferences) => void;
    series: Series[];
    onAddSeries: () => void;
    onEditSeries: (series: Series) => void;
    onDeleteSeries: (id: string) => void;
}) {
    const accents = [
        "#8d3b46",
        "#315a6b",
        "#516653",
        "#9a6b45",
        "#5b5368",
        "#22251f",
    ];

    return (
        <>
            <PageHero
                icon={<Palette size={16} />}
                kicker="Studio"
                title="Preferences"
            />
            <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3 mt-3 max-[1180px]:grid-cols-1">
                <section className="panel col-span-full">
                    <div className="form-grid">
                        <label className="form-label">
                            <span className="field-label">Library name</span>
                            <input
                                className="form-control"
                                value={preferences.libraryName}
                                onChange={(event) =>
                                    setPreferences({
                                        ...preferences,
                                        libraryName: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <div>
                            <span className="field-label">Accent</span>
                            <div className="swatches flex flex-wrap gap-2 mt-2">
                                {accents.map((accent) => (
                                    <button
                                        key={accent}
                                        className={
                                            preferences.accent === accent
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setPreferences({
                                                ...preferences,
                                                accent,
                                            })
                                        }
                                        style={{ background: accent }}
                                        type="button"
                                        aria-label={`Use accent ${accent}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <span className="kicker">
                                <Layers3 size={16} />
                                Series
                            </span>
                            <h2>Manage series</h2>
                        </div>
                        <IconButton label="Series" onClick={onAddSeries}>
                            <Plus size={16} />
                        </IconButton>
                    </div>
                    <div className="panel-list">
                        {series.map((item) => (
                            <article key={item.id}>
                                <i style={{ background: item.color }} />
                                <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.author}</p>
                                </div>
                                <IconButton
                                    label="Edit series"
                                    onClick={() => onEditSeries(item)}
                                >
                                    <Pencil size={16} />
                                </IconButton>
                                <IconButton
                                    label="Delete series"
                                    onClick={() => onDeleteSeries(item.id)}
                                >
                                    <Trash2 size={16} />
                                </IconButton>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}
