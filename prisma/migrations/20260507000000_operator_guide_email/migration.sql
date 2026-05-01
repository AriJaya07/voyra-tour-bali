-- Operator
CREATE TABLE "Operator" (
    "id" SERIAL NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "description" TEXT,
    "licenseNo" TEXT NOT NULL,
    "insurance" BOOLEAN NOT NULL DEFAULT false,
    "yearsActive" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Operator_ownerUserId_key" ON "Operator"("ownerUserId");
CREATE UNIQUE INDEX "Operator_slug_key" ON "Operator"("slug");
CREATE INDEX "Operator_status_idx" ON "Operator"("status");

ALTER TABLE "Operator" ADD CONSTRAINT "Operator_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Guide
CREATE TABLE "Guide" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverImage" TEXT,
    "region" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");
CREATE INDEX "Guide_status_publishedAt_idx" ON "Guide"("status", "publishedAt");
CREATE INDEX "Guide_region_status_idx" ON "Guide"("region", "status");

-- EmailCampaign
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- EmailDelivery
CREATE TABLE "EmailDelivery" (
    "id" SERIAL NOT NULL,
    "campaignId" TEXT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDelivery_userId_idx" ON "EmailDelivery"("userId");
CREATE INDEX "EmailDelivery_type_sentAt_idx" ON "EmailDelivery"("type", "sentAt");
