import { NextRequest, NextResponse } from 'next/server'
import { findManyEntries } from '@/domain/entry/entry-repository'
import { parseEntryListQuery, parseEntryPageParams } from '@/domain/entry/entry-list-query'

export async function GET(request: NextRequest) {
  try {
    // クエリの解釈はコアロジック層に一本化する（クライアント側のシリアライザと対になる）
    const searchParams = request.nextUrl.searchParams
    const query = parseEntryListQuery(searchParams)
    const pageParams = parseEntryPageParams(searchParams)
    const { limit = 20, afterId, beforeId } = pageParams
    const page = pageParams.page ?? 1

    // 数値として読めない page は parse 時に undefined になるので、指定の有無で不正を切り分ける
    if ((searchParams.has('page') && pageParams.page === undefined) || page < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid page parameter' } },
        { status: 400 }
      )
    }

    const result = await findManyEntries({ ...query, page, limit, afterId, beforeId })
    return NextResponse.json({ success: true, data: result.entries, pagination: result.pagination })
  } catch (error) {
    console.error('GET /api/entries error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
