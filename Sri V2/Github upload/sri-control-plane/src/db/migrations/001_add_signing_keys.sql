-- migrations/001_add_signing_keys.sql
CREATE TABLE IF NOT EXISTS signing_keys (
  version INTEGER PRIMARY KEY,
  key VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'deprecated', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_signing_keys_status ON signing_keys(status);
