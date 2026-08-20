-- Enable pgvector extension for future semantic / vector search.
-- Runs automatically on first container initialization (empty data volume).
CREATE EXTENSION IF NOT EXISTS vector;
