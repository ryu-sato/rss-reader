import { NextRequest, NextResponse } from 'next/server'
import { createDigest, getDigests } from '@/lib/digest-service'
import { AppError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    const { data, total } = await getDigests(page, limit)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, title } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'content is required' } },
        { status: 400 }
      )
    }

    if (title !== undefined && typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'title must be a string' } },
        { status: 400 }
      )
    }

    const digest = await createDigest({ content, title })
    return NextResponse.json({ success: true, data: digest }, { status: 201 })
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
