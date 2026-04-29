import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    await prisma.entryTag.createMany({
      data: (entryIds as string[]).map((entryId) => ({ entryId, tagId: tag.id })),
      skipDuplicates: true,
    })

    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tags/batch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
