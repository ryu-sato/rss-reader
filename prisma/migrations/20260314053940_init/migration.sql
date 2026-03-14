-- CreateTable
CREATE TABLE "feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastFetchedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "feeds_url_key" ON "feeds"("url");
