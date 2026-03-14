export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // CronScheduler は TASK-0008 で実装
    // await import('./lib/cron')
  }
}
