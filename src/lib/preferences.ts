import { useState } from "react";

export interface Preferences {
    libraryName: string;
    accent: string;
}

export const defaultPreferences: Preferences = {
    libraryName: "The Reading Room",
    accent: "#7f4432",
};

export function useStoredPreferences(): [
    Preferences,
    (next: Preferences) => void,
] {
    const [preferences, setPreferencesState] = useState<Preferences>(() => {
        const stored = window.localStorage.getItem("reading-log-preferences");
        if (!stored) {
            return defaultPreferences;
        }
        try {
            return { ...defaultPreferences, ...JSON.parse(stored) };
        } catch {
            return defaultPreferences;
        }
    });

    const setPreferences = (next: Preferences) => {
        setPreferencesState(next);
        window.localStorage.setItem(
            "reading-log-preferences",
            JSON.stringify(next),
        );
    };

    return [preferences, setPreferences];
}
