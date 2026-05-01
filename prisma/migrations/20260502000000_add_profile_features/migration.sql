-- ImportedTrip
CREATE TABLE "ImportedTrip" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'viator',
    "externalRef" TEXT,
    "productTitle" TEXT NOT NULL,
    "productImage" TEXT,
    "travelDate" TIMESTAMP(3),
    "notes" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedTrip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportedTrip_userId_idx" ON "ImportedTrip"("userId");
CREATE INDEX "ImportedTrip_userId_travelDate_idx" ON "ImportedTrip"("userId", "travelDate");

ALTER TABLE "ImportedTrip" ADD CONSTRAINT "ImportedTrip_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserPreferences
CREATE TABLE "UserPreferences" (
    "userId" INTEGER NOT NULL,
    "partyAdults" INTEGER NOT NULL DEFAULT 2,
    "partyChildren" INTEGER NOT NULL DEFAULT 0,
    "partySeniors" INTEGER NOT NULL DEFAULT 0,
    "partyInfants" INTEGER NOT NULL DEFAULT 0,
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary" TEXT,
    "mobility" TEXT,
    "regionPref" TEXT,
    "tripLengthDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BaliNote
CREATE TABLE "BaliNote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "targetTitle" TEXT,
    "rating" INTEGER,
    "body" TEXT NOT NULL,
    "photos" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaliNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BaliNote_userId_idx" ON "BaliNote"("userId");
CREATE INDEX "BaliNote_targetType_targetKey_idx" ON "BaliNote"("targetType", "targetKey");
CREATE INDEX "BaliNote_visibility_status_idx" ON "BaliNote"("visibility", "status");

ALTER TABLE "BaliNote" ADD CONSTRAINT "BaliNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
