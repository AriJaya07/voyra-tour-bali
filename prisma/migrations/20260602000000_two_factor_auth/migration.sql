-- 2FA columns on User
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret"     TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnrolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "twoFactorMethod"     TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEpoch"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totpLastWindow"      BIGINT;

-- Backup codes
CREATE TABLE "TwoFactorBackupCode" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL,
  "codeHash"  TEXT NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorBackupCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TwoFactorBackupCode_userId_idx" ON "TwoFactorBackupCode"("userId");

-- Challenges
CREATE TABLE "TwoFactorChallenge" (
  "id"           SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL,
  "purpose"      TEXT NOT NULL,
  "method"       TEXT NOT NULL,
  "emailOtpHash" TEXT,
  "emailSends"   INTEGER NOT NULL DEFAULT 0,
  "attempts"     INTEGER NOT NULL DEFAULT 0,
  "verified"     BOOLEAN NOT NULL DEFAULT false,
  "consumedAt"   TIMESTAMP(3),
  "mfaTokenHash" TEXT,
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "ipHash"       TEXT,
  "uaHash"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorChallenge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TwoFactorChallenge_mfaTokenHash_key" ON "TwoFactorChallenge"("mfaTokenHash");
CREATE INDEX "TwoFactorChallenge_userId_createdAt_idx" ON "TwoFactorChallenge"("userId", "createdAt");

-- Trusted devices
CREATE TABLE "TrustedDevice" (
  "id"             SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL,
  "tokenHash"      TEXT NOT NULL,
  "label"          TEXT,
  "uaHash"         TEXT,
  "ipHash"         TEXT,
  "twoFactorEpoch" INTEGER NOT NULL,
  "lastUsedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustedDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrustedDevice_tokenHash_key" ON "TrustedDevice"("tokenHash");
CREATE INDEX "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");

-- Audit log
CREATE TABLE "AuditLog" (
  "id"        SERIAL PRIMARY KEY,
  "actorId"   INTEGER,
  "targetId"  INTEGER,
  "event"     TEXT NOT NULL,
  "ipHash"    TEXT,
  "uaHash"    TEXT,
  "meta"      JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AuditLog_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_targetId_createdAt_idx" ON "AuditLog"("targetId", "createdAt");
CREATE INDEX "AuditLog_event_createdAt_idx"    ON "AuditLog"("event", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx"  ON "AuditLog"("actorId", "createdAt");
