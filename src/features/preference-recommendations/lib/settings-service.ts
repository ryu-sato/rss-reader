import { prisma } from '@/lib/db'

const DEFAULT_SCORE_THRESHOLD = 0.5

interface AppSettingsRow {
  id: string
  preferredScoreThreshold: number
  updatedAt: string
}

export async function getAppSettings() {
  const rows = await prisma.$queryRaw<AppSettingsRow[]>`
    SELECT id, preferredScoreThreshold, updatedAt FROM app_settings WHERE id = 'singleton'
  `
  if (rows.length === 0) {
    return { id: 'singleton', preferredScoreThreshold: DEFAULT_SCORE_THRESHOLD }
  }
  return rows[0]
}

export async function updatePreferredScoreThreshold(threshold: number) {
  await prisma.$executeRaw`
    INSERT INTO app_settings (id, preferredScoreThreshold, updatedAt)
    VALUES ('singleton', ${threshold}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      preferredScoreThreshold = ${threshold},
      updatedAt = CURRENT_TIMESTAMP
  `
  return getAppSettings()
}
