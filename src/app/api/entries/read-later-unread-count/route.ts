import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const count = await prisma.entryMeta.count({
      where: { isReadLater: true, isRead: false },
    })
    return NextResponse.json({ success: true, data: { count } })
  } catch (error) {
    console.error('GET /api/entries/read-later-unread-count error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
