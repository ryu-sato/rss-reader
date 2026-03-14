import { NextRequest, NextResponse } from 'next/server'
import { getEntryById } from '@/lib/entry-service'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const entry = await getEntryById(id)
    if (!entry) {
      return NextResponse.json(
        { success: false, error: { code: 'ENTRY_NOT_FOUND', message: 'Entry not found' } },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, data: entry })
  } catch (error) {
    console.error('GET /api/entries/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
