import { NextRequest, NextResponse } from 'next/server'
import { getAllPreferences, createPreference } from '@/lib/preference-service'
import { AppError } from '@/lib/errors'

export async function GET() {
  try {
    const preferences = await getAllPreferences()
    return NextResponse.json({ success: true, data: preferences })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'text is required' } },
        { status: 400 }
      )
    }

    const preference = await createPreference(text.trim())
    return NextResponse.json({ success: true, data: preference }, { status: 201 })
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
