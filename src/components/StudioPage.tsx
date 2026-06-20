import { Layers3, Palette } from "lucide-react";
import type { Preferences } from "../lib/preferences";
import { PageHero } from "./PageHero";

export default function StudioPage({
    preferences,
    setPreferences,
}: {
    preferences: Preferences;
    setPreferences: (next: Preferences) => void;
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
                    </div>
                </section>
            </div>
        </>
    );
}
