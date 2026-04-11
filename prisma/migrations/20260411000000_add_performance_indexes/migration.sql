-- Add index on effectedDate DESC for findManyEntriesDedup ORDER BY
CREATE INDEX "entries_effectedDate_idx" ON "entries"("effectedDate" DESC);

-- Add index on link for DISTINCT deduplication and sibling lookup in updateEntryMeta
CREATE INDEX "entries_link_idx" ON "entries"("link");

-- Add compound index on (feedId, publishedAt DESC) for MAX(publishedAt) GROUP BY feedId query
CREATE INDEX "entries_feedId_publishedAt_idx" ON "entries"("feedId", "publishedAt" DESC);

-- Add index on isRead for unread count subquery in getAllFeeds
CREATE INDEX "entry_metas_isRead_idx" ON "entry_metas"("isRead");
