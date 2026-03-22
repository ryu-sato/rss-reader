-- Fix effectedDate for existing entries: set to publishedAt if not null, otherwise keep createdAt
UPDATE "entries" SET "effectedDate" = "publishedAt" WHERE "publishedAt" IS NOT NULL;
UPDATE "entries" SET "effectedDate" = "createdAt" WHERE "publishedAt" IS NULL;
