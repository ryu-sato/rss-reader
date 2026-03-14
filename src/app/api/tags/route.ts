import { NextRequest, NextResponse } from 'next/server'
import { getAllTags, upsertTagAndAssign } from '@/lib/tag-service'
import { getEntryById } from '@/lib/entry-service'

export async function GET() {
  try {
    const tags = await getAllTags()
    return NextResponse.json({ success: true, data: tags })
  } catch (error) {
    console.error('GET /api/tags error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, entryId } = await request.json()

    if (!name || !entryId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'name and entryId are required' } },
        { status: 400 }
      )
    }

    const entry = await getEntryById(entryId)
    if (!entry) {
      return NextResponse.json(
        { success: false, error: { code: 'ENTRY_NOT_FOUND', message: 'Entry not found' } },
        { status: 404 }
      )
    }

    const tag = await upsertTagAndAssign(name, entryId)
    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tags error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
