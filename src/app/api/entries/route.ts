import { NextRequest, NextResponse } from 'next/server'
import { findManyEntries } from '@/lib/entry-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const feedId = searchParams.get('feedId') ?? undefined
    const tagId = searchParams.get('tagId') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const page = Number(searchParams.get('page') ?? '1')
    const limit = Number(searchParams.get('limit') ?? '20')
    const afterId = searchParams.get('afterId') ?? undefined
    const beforeId = searchParams.get('beforeId') ?? undefined
    const isReadLater = searchParams.get('isReadLater') === 'true' ? true : undefined
    const isUnread = searchParams.get('isUnread') === 'true' ? true : undefined

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid page parameter' } },
        { status: 400 }
      )
    }

    const result = await findManyEntries({ feedId, tagId, search, page, limit, afterId, beforeId, isReadLater, isUnread })
    return NextResponse.json({ success: true, data: result.entries, pagination: result.pagination })
  } catch (error) {
    console.error('GET /api/entries error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
