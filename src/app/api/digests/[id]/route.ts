import { NextRequest, NextResponse } from 'next/server'
import { getDigestById, deleteDigest } from '@/lib/digest-service'
import { AppError } from '@/lib/errors'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const digest = await getDigestById(id)
    return NextResponse.json({ success: true, data: digest })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteDigest(id)
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
