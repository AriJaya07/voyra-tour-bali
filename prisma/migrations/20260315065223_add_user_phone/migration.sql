-- AlterEnum: add USER value to UserRole.
-- Must live alone in its own migration — Postgres forbids using a newly-added
-- enum value in the same transaction. Follow-up migration uses it.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';
