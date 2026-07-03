-- Hot-path indexes: Booking (user history, cron status sweeps, Viator failure
-- recovery) and the polymorphic Image FKs (joined on every catalog page).
CREATE INDEX IF NOT EXISTS "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_status_travelDate_idx" ON "Booking"("status", "travelDate");
CREATE INDEX IF NOT EXISTS "Booking_viatorBookingStatus_idx" ON "Booking"("viatorBookingStatus");

CREATE INDEX IF NOT EXISTS "Image_destinationId_idx" ON "Image"("destinationId");
CREATE INDEX IF NOT EXISTS "Image_packageId_idx" ON "Image"("packageId");
CREATE INDEX IF NOT EXISTS "Image_contentId_idx" ON "Image"("contentId");
CREATE INDEX IF NOT EXISTS "Image_locationId_idx" ON "Image"("locationId");
