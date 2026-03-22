-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "entry_preference_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "preferenceId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "entry_preference_scores_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entry_preference_scores_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "entry_preference_scores_entryId_idx" ON "entry_preference_scores"("entryId");

-- CreateIndex
CREATE INDEX "entry_preference_scores_preferenceId_idx" ON "entry_preference_scores"("preferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "entry_preference_scores_entryId_preferenceId_key" ON "entry_preference_scores"("entryId", "preferenceId");
