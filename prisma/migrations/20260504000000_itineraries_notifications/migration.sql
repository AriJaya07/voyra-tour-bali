-- SavedItinerary
CREATE TABLE "SavedItinerary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "party" JSONB,
    "itemsJson" JSONB NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "shareSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedItinerary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedItinerary_shareSlug_key" ON "SavedItinerary"("shareSlug");
CREATE INDEX "SavedItinerary_userId_idx" ON "SavedItinerary"("userId");
CREATE INDEX "SavedItinerary_visibility_shareSlug_idx" ON "SavedItinerary"("visibility", "shareSlug");

ALTER TABLE "SavedItinerary" ADD CONSTRAINT "SavedItinerary_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NotificationPref
CREATE TABLE "NotificationPref" (
    "userId" INTEGER NOT NULL,
    "weatherAlerts" BOOLEAN NOT NULL DEFAULT false,
    "volcanoAlerts" BOOLEAN NOT NULL DEFAULT true,
    "nyepiAlert" BOOLEAN NOT NULL DEFAULT true,
    "tripReminders" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPref_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "NotificationPref" ADD CONSTRAINT "NotificationPref_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
