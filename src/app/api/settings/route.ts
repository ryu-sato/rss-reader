import { NextRequest, NextResponse } from 'next/server'
import { getAppSettings, updatePreferredScoreThreshold } from '@/lib/settings-service'

export async function GET() {
  try {
    const settings = await getAppSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { preferredScoreThreshold } = body

    if (
      typeof preferredScoreThreshold !== 'number' ||
      preferredScoreThreshold < 0 ||
      preferredScoreThreshold > 1
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'preferredScoreThreshold must be a number between 0 and 1' } },
        { status: 400 }
      )
    }

    const settings = await updatePreferredScoreThreshold(preferredScoreThreshold)
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('PATCH /api/settings error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
