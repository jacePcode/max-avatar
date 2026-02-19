-- =============================================================================
-- NEXUS — PostgreSQL Database Schema
-- Covers all 10 modules: Entries, Entities, Timeline, Graph, AI, Search,
-- Map, Document Viewer, Collaboration, Export
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- MODULE 9: AUTH & COLLABORATION — Users, Roles, Invites
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'editor',
  display_name  VARCHAR(128),
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invite_codes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         VARCHAR(64) UNIQUE NOT NULL,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  used_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  role         user_role NOT NULL DEFAULT 'editor',
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MODULE 1: ENTRY SYSTEM
-- =============================================================================

CREATE TYPE entry_type AS ENUM (
  'url', 'pdf', 'image', 'text', 'video', 'audio', 'document'
);

CREATE TYPE credibility_rating AS ENUM ('1', '2', '3', '4', '5');

CREATE TABLE entries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  type              entry_type NOT NULL,
  -- For URL entries
  url               TEXT,
  -- For file entries (path relative to uploads/)
  file_path         TEXT,
  file_name         TEXT,
  file_size_bytes   BIGINT,
  mime_type         VARCHAR(128),
  -- Core content
  content_text      TEXT,           -- raw text / notes / body for text entries
  event_date        DATE,           -- when the event described happened
  source_url        TEXT,           -- original source URL (for citations)
  credibility       credibility_rating,
  notes             TEXT,
  -- AI-generated content (Module 5)
  ai_summary        TEXT,
  ai_processed_at   TIMESTAMPTZ,
  -- Status
  is_flagged        BOOLEAN NOT NULL DEFAULT false,
  flag_reason       TEXT,
  -- Search vector (full text)
  search_vector     TSVECTOR,
  -- Authorship
  added_by          UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index on entries
CREATE INDEX entries_search_idx ON entries USING GIN(search_vector);
CREATE INDEX entries_event_date_idx ON entries(event_date);
CREATE INDEX entries_type_idx ON entries(type);
CREATE INDEX entries_added_by_idx ON entries(added_by);
CREATE INDEX entries_credibility_idx ON entries(credibility);

-- Trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION entries_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.ai_summary, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_search_vector_trigger
BEFORE INSERT OR UPDATE ON entries
FOR EACH ROW EXECUTE FUNCTION entries_search_vector_update();

-- Version history for entries (Module 9)
CREATE TABLE entry_versions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  version_num  INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,  -- full entry state at this version
  changed_by   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  change_note  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX entry_versions_entry_idx ON entry_versions(entry_id, version_num);

-- =============================================================================
-- TAGS
-- =============================================================================

CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(128) UNIQUE NOT NULL,
  color      VARCHAR(7) DEFAULT '#f59e0b',  -- hex color
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entry_tags (
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);
CREATE INDEX entry_tags_tag_idx ON entry_tags(tag_id);

-- =============================================================================
-- MODULE 2: ENTITY SYSTEM
-- =============================================================================

CREATE TYPE entity_type AS ENUM ('person', 'organization', 'location');

-- Unified entities table with type-specific JSONB payload
CREATE TABLE entities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        entity_type NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  -- Person-specific
  aliases     TEXT[],             -- array of known aliases
  photo_url   TEXT,
  date_of_birth DATE,
  date_of_death DATE,
  nationality VARCHAR(128),
  roles       TEXT[],             -- e.g. ['Financier', 'Convicted sex offender']
  -- Organization-specific
  org_type    VARCHAR(128),       -- e.g. 'Corporation', 'NGO', 'Government'
  founded_date DATE,
  dissolved_date DATE,
  -- Location-specific
  latitude    DECIMAL(10, 7),
  longitude   DECIMAL(10, 7),
  address     TEXT,
  place_type  VARCHAR(128),       -- e.g. 'Island', 'Residence', 'Office'
  -- Extra structured metadata
  metadata    JSONB DEFAULT '{}',
  -- Search
  search_vector TSVECTOR,
  -- Authorship
  added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX entities_type_idx ON entities(type);
CREATE INDEX entities_name_idx ON entities USING GIN(name gin_trgm_ops);
CREATE INDEX entities_search_idx ON entities USING GIN(search_vector);
CREATE INDEX entities_location_idx ON entities(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE OR REPLACE FUNCTION entities_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.aliases, ' '), '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entities_search_vector_trigger
BEFORE INSERT OR UPDATE ON entities
FOR EACH ROW EXECUTE FUNCTION entities_search_vector_update();

-- Entry <-> Entity linking (many-to-many)
CREATE TABLE entry_entities (
  entry_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  context     TEXT,  -- e.g. "Named in document", "Location of event"
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entry_id, entity_id)
);
CREATE INDEX entry_entities_entity_idx ON entry_entities(entity_id);

-- Direct entity-to-entity relationships (not just via shared entries)
CREATE TYPE entity_relationship_type AS ENUM (
  'associate_of', 'employed_by', 'owns', 'founded', 'member_of',
  'located_at', 'funded_by', 'parent_of', 'child_of', 'spouse_of',
  'known_contact', 'other'
);

CREATE TABLE entity_relationships (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id     UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship  entity_relationship_type NOT NULL DEFAULT 'other',
  label         TEXT,       -- custom label overriding enum
  description   TEXT,
  date_from     DATE,
  date_to       DATE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_loop CHECK (source_id != target_id)
);
CREATE INDEX entity_relationships_source_idx ON entity_relationships(source_id);
CREATE INDEX entity_relationships_target_idx ON entity_relationships(target_id);

-- =============================================================================
-- MODULE 4: CONNECTION GRAPH — Entry-to-Entry Connections
-- =============================================================================

CREATE TYPE connection_type AS ENUM (
  'linked_to', 'contradicts', 'confirms', 'preceded',
  'funded_by', 'associate_of', 'present_at', 'other'
);

CREATE TABLE entry_connections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  type         connection_type NOT NULL DEFAULT 'linked_to',
  label        TEXT,     -- optional custom label
  description  TEXT,
  strength     SMALLINT DEFAULT 1 CHECK (strength BETWEEN 1 AND 5),
  is_ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_loop CHECK (source_id != target_id)
);
CREATE INDEX entry_connections_source_idx ON entry_connections(source_id);
CREATE INDEX entry_connections_target_idx ON entry_connections(target_id);

-- =============================================================================
-- MODULE 5: AI LAYER
-- =============================================================================

-- Extracted entities / suggestions from document AI analysis
CREATE TABLE ai_extractions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id      UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  extraction_type VARCHAR(64) NOT NULL,  -- 'person', 'org', 'location', 'date', 'claim', 'financial'
  value         TEXT NOT NULL,
  context       TEXT,      -- surrounding passage from document
  confidence    DECIMAL(4,3),  -- 0.000–1.000
  status        VARCHAR(32) NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
  reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  -- If accepted, link to the created entity
  entity_id     UUID REFERENCES entities(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ai_extractions_entry_idx ON ai_extractions(entry_id, status);

-- AI-suggested entry-to-entry connections
CREATE TABLE ai_suggested_connections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,      -- Gemini's explanation of the connection
  confidence   DECIMAL(4,3),
  status       VARCHAR(32) NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
  reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ai_suggested_conn_status_idx ON ai_suggested_connections(status);

-- Per-entry document Q&A chat history
CREATE TABLE entry_chats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(16) NOT NULL,  -- 'user' | 'assistant'
  content    TEXT NOT NULL,
  citations  JSONB DEFAULT '[]',    -- [{passage, page, offset}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX entry_chats_entry_user_idx ON entry_chats(entry_id, user_id, created_at);

-- Global database Q&A chat sessions
CREATE TABLE global_chat_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX global_chat_sessions_user_idx ON global_chat_sessions(user_id);

CREATE TABLE global_chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES global_chat_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(16) NOT NULL,  -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  -- Entries used as context for this assistant message
  context_entry_ids UUID[] DEFAULT '{}',
  -- Clickable citations in the answer
  citations   JSONB DEFAULT '[]',  -- [{entry_id, title, excerpt}]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX global_chat_messages_session_idx ON global_chat_messages(session_id, created_at);

-- Contradiction analysis results
CREATE TABLE contradiction_analyses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_a    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  entry_b    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  result     TEXT NOT NULL,         -- Gemini's analysis
  verdict    VARCHAR(32),           -- 'contradicts' | 'consistent' | 'inconclusive'
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX contradiction_analyses_entries_idx ON contradiction_analyses(entry_a, entry_b);

-- =============================================================================
-- MODULE 8: DOCUMENT VIEWER — Annotations & Highlights
-- =============================================================================

CREATE TABLE annotations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Location in document
  page_number  INTEGER,
  start_offset INTEGER,
  end_offset   INTEGER,
  -- The highlighted text
  selected_text TEXT NOT NULL,
  -- Optional note on the annotation
  note         TEXT,
  color        VARCHAR(7) DEFAULT '#f59e0b',
  -- If this annotation spawned a new entry
  spawned_entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX annotations_entry_idx ON annotations(entry_id);
CREATE INDEX annotations_user_idx ON annotations(user_id);

-- =============================================================================
-- MODULE 9: COLLABORATION — Comments, Activity Feed, Flags
-- =============================================================================

CREATE TABLE comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES comments(id) ON DELETE CASCADE,  -- thread support
  content      TEXT NOT NULL,
  is_edited    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX comments_entry_idx ON comments(entry_id, created_at);

-- @mentions in comments
CREATE TABLE comment_mentions (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);

-- Activity feed
CREATE TABLE activity_feed (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type  VARCHAR(64) NOT NULL,  -- 'entry.created', 'entry.updated', 'comment.added',
                                      -- 'entity.created', 'connection.added', 'ai.run', etc.
  target_type  VARCHAR(32),           -- 'entry', 'entity', 'comment', etc.
  target_id    UUID,                  -- ID of the affected object
  metadata     JSONB DEFAULT '{}',    -- additional context (entry title, entity name, etc.)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX activity_feed_created_idx ON activity_feed(created_at DESC);
CREATE INDEX activity_feed_user_idx ON activity_feed(user_id, created_at DESC);

-- =============================================================================
-- MODULE 6: SEARCH — Saved Searches
-- =============================================================================

CREATE TABLE saved_searches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  query       TEXT NOT NULL,
  filters     JSONB DEFAULT '{}',   -- {type, tags, entities, dateRange, credibility, ...}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX saved_searches_user_idx ON saved_searches(user_id);

-- =============================================================================
-- MODULE 10: EXPORT & REPORTING — Shareable Links
-- =============================================================================

CREATE TABLE shareable_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       VARCHAR(128) UNIQUE NOT NULL,
  link_type   VARCHAR(32) NOT NULL,  -- 'entry', 'timeline', 'graph', 'entity_report'
  target_id   UUID,                  -- entry_id, entity_id, etc.
  filters     JSONB DEFAULT '{}',    -- for timeline / graph filtered views
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  views       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX shareable_links_token_idx ON shareable_links(token);

-- =============================================================================
-- HELPER: updated_at auto-update trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER entries_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER annotations_updated_at BEFORE UPDATE ON annotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER global_chat_sessions_updated_at BEFORE UPDATE ON global_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
