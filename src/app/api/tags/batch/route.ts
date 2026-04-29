import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { name, entryIds } = await request.json()

    if (!name || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'name and entryIds are required' } },
        { status: 400 }
      )
    }

    const normalizedName = (name as string).toLowerCase().trim()

    const tag = await prisma.tag.upsert({
      where: { name: normalizedName },
      create: { name: normalizedName },
      update: {},
    })

    const rows = (entryIds as string[]).map((entryId) => Prisma.sql`(${entryId}, ${tag.id})`)
    await prisma.$executeRaw`INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES ${Prisma.join(rows)}`

    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tags/batch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
