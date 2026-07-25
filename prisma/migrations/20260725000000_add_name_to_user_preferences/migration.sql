-- Add name column for concise, auto-generated, unique display titles of preferences
ALTER TABLE "user_preferences" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
