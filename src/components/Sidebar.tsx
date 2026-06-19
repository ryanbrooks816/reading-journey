import {
    BookOpen,
    BookPlus,
    Compass,
    Archive,
    BarChart3,
    Palette,
    Layers3,
} from "lucide-react";
import type { Preferences } from "../lib/preferences";
import { IconTextButton } from "./ui/IconTextButton";
import { ModalState } from "./Modal";

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
        <aside className="library-sidebar">
            <div className="library-brand">
                <span className="library-brand-icon">
                    <BookOpen size={19} />
                </span>

                <div className="library-brand-content">
                    <p className="library-brand-subtitle">Reading Log</p>

                    <h1 className="library-brand-title">
                        {preferences.libraryName}
                    </h1>
                </div>
            </div>

            <nav className="library-nav" aria-label="Reading views">
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

            <div className="library-actions">
                <IconTextButton
                    label="Book"
                    onClick={() => setModal({ type: "book" })}
                >
                    <BookPlus size={17} />
                </IconTextButton>

                <IconTextButton
                    label="Series"
                    onClick={() => setModal({ type: "series" })}
                >
                    <Layers3 size={17} />
                </IconTextButton>
            </div>
        </aside>
    );
}
