ALTER TABLE books ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0;
UPDATE books SET word_count = pages WHERE word_count = 0 AND pages > 0;
