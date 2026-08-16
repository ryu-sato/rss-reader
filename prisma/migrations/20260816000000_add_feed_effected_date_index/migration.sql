-- Add compound index on (feedId, effectedDate DESC) for findManyEntries (feedId 指定モード)
-- ORDER BY / cursor conditions, which now sort by effectedDate instead of publishedAt
CREATE INDEX "entries_feedId_effectedDate_idx" ON "entries"("feedId", "effectedDate" DESC);
