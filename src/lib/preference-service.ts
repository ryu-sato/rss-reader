import { prisma } from '@/lib/db'

export async function getAllPreferences() {
  return prisma.userPreference.findMany({
    orderBy: { createdAt: 'asc' },
  })
}

export async function createPreference(text: string) {
  return prisma.userPreference.create({
    data: { text },
  })
}

export async function updatePreference(id: string, text: string) {
  return prisma.userPreference.update({
    where: { id },
    data: { text },
  })
}

export async function deletePreference(id: string) {
  return prisma.userPreference.delete({
    where: { id },
  })
}
