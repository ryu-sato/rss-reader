-- Create app_settings table for storing application-wide settings
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "preferredScoreThreshold" REAL NOT NULL DEFAULT 0.5,
    "updatedAt" DATETIME NOT NULL
);

-- Insert default singleton row
INSERT INTO "app_settings" ("id", "preferredScoreThreshold", "updatedAt")
VALUES ('singleton', 0.5, CURRENT_TIMESTAMP);
