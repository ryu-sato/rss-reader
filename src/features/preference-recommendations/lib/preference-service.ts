import { prisma } from '@/lib/db'

const NAME_MAX_LENGTH = 20

function truncateName(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (normalized.length <= NAME_MAX_LENGTH) return normalized
  return `${normalized.slice(0, NAME_MAX_LENGTH)}…`
}

/** テキストから端的な名前を生成し、既存の名前と重複しないようにする */
async function generateUniqueName(text: string, excludeId?: string): Promise<string> {
  const base = truncateName(text) || '無題の好み'
  const existing = await prisma.userPreference.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { name: true },
  })
  const existingNames = new Set(existing.map((p) => p.name))
  if (!existingNames.has(base)) return base

  let counter = 2
  while (existingNames.has(`${base} (${counter})`)) counter++
  return `${base} (${counter})`
}

export async function getAllPreferences() {
  return prisma.userPreference.findMany({
    orderBy: { createdAt: 'asc' },
  })
}

export async function createPreference(text: string) {
  const name = await generateUniqueName(text)
  return prisma.userPreference.create({
    data: { text, name },
  })
}

export async function updatePreference(id: string, text: string) {
  const name = await generateUniqueName(text, id)
  return prisma.userPreference.update({
    where: { id },
    data: { text, name },
  })
}

export async function deletePreference(id: string) {
  return prisma.userPreference.delete({
    where: { id },
  })
}
