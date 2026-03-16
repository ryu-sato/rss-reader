import { NextRequest, NextResponse } from 'next/server'
import { renameTag, deleteTag } from '@/lib/tag-service'

type Params = { params: Promise<{ tagId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { tagId } = await params
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } },
        { status: 400 }
      )
    }

    const tag = await renameTag(tagId, name)
    return NextResponse.json({ success: true, data: tag })
  } catch (error) {
    console.error('PATCH /api/tags/[tagId] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { tagId } = await params
    await deleteTag(tagId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tags/[tagId] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
