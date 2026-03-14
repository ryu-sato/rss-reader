import { NextRequest, NextResponse } from 'next/server'
import { getEntryById, updateEntryMeta } from '@/lib/entry-service'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const entry = await getEntryById(id)
    if (!entry) {
      return NextResponse.json(
        { success: false, error: { code: 'ENTRY_NOT_FOUND', message: 'Entry not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { isRead, isReadLater } = body

    const data: { isRead?: boolean; isReadLater?: boolean } = {}
    if (typeof isRead === 'boolean') data.isRead = isRead
    if (typeof isReadLater === 'boolean') data.isReadLater = isReadLater

    const meta = await updateEntryMeta(id, data)
    return NextResponse.json({ success: true, data: meta })
  } catch (error) {
    console.error('PUT /api/entries/[id]/meta error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
