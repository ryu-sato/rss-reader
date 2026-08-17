import { NextResponse } from 'next/server'
import { fetchAllFeedsEntries } from '@/domain/entry/entry-sync'

export async function POST() {
  try {
    await fetchAllFeedsEntries()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Refresh] Feed refresh failed:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
