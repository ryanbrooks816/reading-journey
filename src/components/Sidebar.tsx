import {
    BookOpen,
    BookPlus,
    Compass,
    Archive,
    BarChart3,
    Palette,
    Layers3,
} from "lucide-react";
import { ModalState } from "../lib/types";
import type { Preferences } from "../lib/preferences";
import IconButton from "./IconButton";

export type View = "flow" | "library" | "history" | "stats" | "studio";

const views: Array<{ id: View; label: string; icon: typeof BookOpen }> = [
    { id: "flow", label: "Flow", icon: Compass },
    { id: "library", label: "Library", icon: BookOpen },
    { id: "history", label: "History", icon: Archive },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "studio", label: "Studio", icon: Palette },
];

interface SidebarProps {
    view: View;
    setView: (view: View) => void;
    modal: ModalState | null;
    setModal: (modal: ModalState | null) => void;
    preferences: Preferences;
}

export default function Sidebar(props: SidebarProps) {
    const { view, setView, modal, setModal, preferences } = props;

    return (
        <aside
            className="library-sidebar sticky top-3 grid h-[calc(100vh-1.5rem)] grid-rows-[auto_1fr_auto] gap-4 p-3 max-md:static max-md:z-40 max-md:h-auto max-md:w-full max-md:min-w-0 max-md:grid-cols-[auto_minmax(0,1fr)_auto] max-md:grid-rows-none max-md:items-center max-md:gap-2 max-md:overflow-hidden"
        >
            <div className="grid grid-cols-[2.4rem_minmax(0,1fr)] items-center gap-3 p-1.5 max-lg:grid-cols-1 max-lg:justify-items-center max-md:hidden">
                <span className="library-brand-icon grid size-10 place-items-center">
                    <BookOpen size={19} />
                </span>

                <div className="min-w-0 max-lg:hidden">
                    <p className="library-brand-subtitle">Reading Log</p>

                    <h1 className="library-brand-title">
                        {preferences.libraryName}
                    </h1>
                </div>
            </div>

            <nav
                className="flex min-w-0 flex-col gap-1 max-md:flex-row max-md:overflow-x-auto"
                aria-label="Reading views"
            >
                {views.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            className={`library-nav-button ${view === item.id ? "library-nav-button-active" : ""}`}
                            onClick={() => setView(item.id)}
                            type="button"
                            title={item.label}
                        >
                            <Icon size={18} />

                            <span className="library-nav-label">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <div className="grid shrink-0 gap-2 max-md:flex">
                <IconButton
                    label="Book"
                    onClick={() => setModal({ type: "book" })}
                    className="max-lg:aspect-square max-lg:min-h-10 max-lg:w-10 max-lg:px-0 max-lg:[&_span]:hidden"
                >
                    <BookPlus size={17} />
                </IconButton>

                <IconButton
                    label="Series"
                    onClick={() => setModal({ type: "series" })}
                    className="max-lg:aspect-square max-lg:min-h-10 max-lg:w-10 max-lg:px-0 max-lg:[&_span]:hidden"
                >
                    <Layers3 size={17} />
                </IconButton>
            </div>
        </aside>
    );
}
