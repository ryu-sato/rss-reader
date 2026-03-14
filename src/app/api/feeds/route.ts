import { NextRequest, NextResponse } from 'next/server'
import { getAllFeeds, createFeed } from '@/lib/feed-service'
import { AppError } from '@/lib/errors'

export async function GET() {
  try {
    const feeds = await getAllFeeds()
    return NextResponse.json({ success: true, data: feeds })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'URL is required' } },
        { status: 400 }
      )
    }

    const feed = await createFeed(url)
    return NextResponse.json({ success: true, data: feed }, { status: 201 })
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
