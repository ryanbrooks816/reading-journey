import { X } from "lucide-react";
import { CSSProperties, useState, useEffect, useCallback } from "react";
import { useStoredPreferences } from "./lib/preferences";
import Sidebar from "./components/Sidebar";
import { View } from "./components/Sidebar";
import { LoadingPanel } from "./components/LoadingPanel";
import { ModalState } from "./lib/types";
import StudioPage from "./components/StudioPage";

export default function App() {
    const [view, setView] = useState<View>("flow");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [modal, setModal] = useState<ModalState | null>(null);
    const [preferences, setPreferences] = useStoredPreferences();

    const loadLibrary = useCallback(async () => {
        setLoading(true);
        setError("");

        // Load library state

        setLoading(false);
    }, []);

    useEffect(() => {
        void loadLibrary();
    }, [loadLibrary]);

    return (
        <div
            className={
                "min-h-screen bg-[linear-gradient(180deg,rgba(255,249,236,0.82),rgba(239,232,214,0.96)),linear-gradient(90deg,rgba(83,62,35,0.035)_1px,transparent_1px),linear-gradient(rgba(83,62,35,0.026)_1px,transparent_1px),var(--paper)] bg-[length:auto,30px_30px,30px_30px,auto] text-ink"
            }
            style={{ "--user-accent": preferences.accent } as CSSProperties}
        >
            <div
                className={
                    "grid min-h-screen w-full max-w-[1840px] grid-cols-[14.25rem_minmax(0,1fr)] gap-3 p-3 max-lg:grid-cols-[5rem_minmax(0,1fr)] max-md:flex max-md:flex-col max-md:p-2 has-[.flow-page]:h-screen has-[.flow-page]:min-h-0 has-[.flow-page]:overflow-hidden"
                }
            >
                <Sidebar
                    view={view}
                    setView={setView}
                    modal={modal}
                    setModal={setModal}
                    preferences={preferences}
                />

                <div
                    className={
                        "flex min-w-0 flex-col gap-3 has-[.flow-page]:min-h-0 has-[.flow-page]:overflow-hidden [&:has(.flow-page)_main]:min-h-0 [&:has(.flow-page)_main]:overflow-hidden"
                    }
                >
                    {error ? (
                        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-[rgba(141,59,70,0.24)] bg-[#fff4f0] px-4 py-3 text-[#7c2835]">
                            <span>{error}</span>
                            <button
                                onClick={() => setError("")}
                                type="button"
                                aria-label="Dismiss"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : null}

                    {loading ? (
                        <LoadingPanel />
                    ) : (
                        <main className={"min-w-0"}>
                            {view === "studio" ? (
                                <StudioPage
                                    preferences={preferences}
                                    setPreferences={setPreferences}
                                />
                            ) : null}
                        </main>
                    )}
                </div>
            </div>
        </div>
    );
}
