-- Drop Review subsystem. Reviews live on Viator (third-party) — no need for our own.
DROP TABLE IF EXISTS "Review";
DROP TYPE IF EXISTS "ReviewStatus";
