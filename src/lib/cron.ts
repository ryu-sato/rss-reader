import cron from 'node-cron'
import { spawn } from 'child_process'
import path from 'path'
import { fetchAllFeedsEntries } from './entry-service'

function runScoreEntries(): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/scoring/score_entries.py')
    const child = spawn('python3', [scriptPath], { stdio: 'inherit', env: process.env })
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        const detail = signal ? `killed by signal ${signal}` : `code ${code}`
        reject(new Error(`score_entries.py exited with ${detail}`))
      }
    })
    child.on('error', reject)
  })
}

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

  cron.schedule('30 * * * *', async () => {
    console.log('[Cron] Starting scheduled entry scoring...')
    try {
      await runScoreEntries()
      console.log('[Cron] Scheduled entry scoring completed.')
    } catch (error) {
      console.error('[Cron] Scheduled entry scoring failed:', error)
    }
  })

  console.log('[Cron] Scheduler started (entry fetch: every hour at :00, scoring: every hour at :30)')
}
