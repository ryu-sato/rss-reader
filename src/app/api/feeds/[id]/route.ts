import { NextRequest, NextResponse } from 'next/server'
import { getFeedById, updateFeed, deleteFeed } from '@/lib/feed-service'
import { AppError } from '@/lib/errors'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const feed = await getFeedById(id)
    return NextResponse.json({ success: true, data: feed })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, memo } = body

    if (title !== undefined && title.trim() === '') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title cannot be empty' } },
        { status: 400 }
      )
    }

    const feed = await updateFeed(id, { title, description, memo })
    return NextResponse.json({ success: true, data: feed })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await deleteFeed(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    )
  }
  console.error('Unexpected error:', error)
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
    { status: 500 }
  )
}
