PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS flow_nodes (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  node_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flow_edges (
  id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_node_id, target_node_id),
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_flow_nodes_book ON flow_nodes(book_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_source ON flow_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_target ON flow_edges(target_node_id);
