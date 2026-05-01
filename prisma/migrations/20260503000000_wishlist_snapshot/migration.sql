ALTER TABLE "WishlistItem"
  ADD COLUMN "priceAtSave" DOUBLE PRECISION,
  ADD COLUMN "currencyAtSave" TEXT,
  ADD COLUMN "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows: savedAt = createdAt; priceAtSave = price; currencyAtSave = currency
UPDATE "WishlistItem"
SET "savedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "priceAtSave" = "price",
    "currencyAtSave" = "currency";
