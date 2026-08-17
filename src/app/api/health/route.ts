import { NextResponse } from 'next/server'
import { prisma } from '@/domain/shared/db'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('GET /api/health error:', error)
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
