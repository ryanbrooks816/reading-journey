export type ModalState =
    | { type: "book"; book?: Book }
    | { type: "series"; series?: Series }
    | { type: "entry"; entry?: ReadingEntry; bookId?: string };
