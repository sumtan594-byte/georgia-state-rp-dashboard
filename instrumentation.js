import { startReminderWorker } from './lib/reminder-worker';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Reminders] Starting reminder worker at server boot...');
    await startReminderWorker();
  }
}
