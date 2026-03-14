import cron from 'node-cron'
import { fetchAllFeedsEntries } from './entry-service'

export function startCronScheduler(): void {
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Starting scheduled entry fetch...')
    try {
      await fetchAllFeedsEntries()
      console.log('[Cron] Scheduled entry fetch completed.')
    } catch (error) {
      console.error('[Cron] Scheduled entry fetch failed:', error)
    }
  })
  console.log('[Cron] Scheduler started (every hour at :00)')
}
