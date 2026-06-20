import { Loader2 } from "lucide-react";

export function LoadingPanel() {
    return (
        <div className="panel message-panel">
            <Loader2 className="animate-spin" size={24} />
            <span>Opening the shelves</span>
        </div>
    );
}
