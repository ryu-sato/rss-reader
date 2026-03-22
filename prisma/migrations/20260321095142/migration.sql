-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "publishedAt" DATETIME,
    "effectedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "entries_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_entries" ("content", "createdAt", "description", "effectedDate", "feedId", "guid", "id", "imageUrl", "link", "publishedAt", "title", "updatedAt") SELECT "content", "createdAt", "description", COALESCE("publishedAt", "createdAt"), "feedId", "guid", "id", "imageUrl", "link", "publishedAt", "title", "updatedAt" FROM "entries";
DROP TABLE "entries";
ALTER TABLE "new_entries" RENAME TO "entries";
CREATE INDEX "entries_publishedAt_idx" ON "entries"("publishedAt" DESC);
CREATE INDEX "entries_feedId_idx" ON "entries"("feedId");
CREATE UNIQUE INDEX "entries_feedId_guid_key" ON "entries"("feedId", "guid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
