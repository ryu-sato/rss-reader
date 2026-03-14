import { NextResponse } from 'next/server'
import { fetchAllFeedsEntries } from '@/lib/entry-service'

export async function POST() {
  // Run in background without blocking the response
  fetchAllFeedsEntries().catch((err) =>
    console.error('[Refresh] Feed refresh failed:', err)
  )
  return NextResponse.json({ success: true }, { status: 202 })
}
