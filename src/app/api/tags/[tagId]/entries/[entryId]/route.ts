import { NextRequest, NextResponse } from 'next/server'
import { removeTagFromEntry } from '@/lib/tag-service'

type Params = { params: Promise<{ tagId: string; entryId: string }> }

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { tagId, entryId } = await params
    await removeTagFromEntry(tagId, entryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tags/[tagId]/entries/[entryId] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'TAG_NOT_FOUND', message: 'Tag not found on this entry' } },
      { status: 404 }
    )
  }
}
