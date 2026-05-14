import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const ERLC_KEY = process.env.ERLC_API_KEY;
const CMD_INTERVAL_MS = 5500; // PRC command limit is 1 per 5s

// Global state for dashboard status monitoring
globalThis.__gsrpReminderState ??= {
  status: 'idle', // 'idle', 'waiting', 'sending'
  nextReminder: null,
  nextRunAt: 0,
  playerCount: 0,
  lastError: null,
  isStarted: false,
  needsRestart: false,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitWithCheck(targetTime) {
  while (Date.now() < targetTime) {
    if (globalThis.__gsrpReminderState.needsRestart) {
      return true; // We need to break out and restart
    }
    // Don't wait too long if targetTime is close
    const remaining = targetTime - Date.now();
    await sleep(Math.min(2000, remaining));
  }
  return false;
}

async function updateState(updates) {
  Object.assign(globalThis.__gsrpReminderState, updates);
}

export async function startReminderWorker() {
  if (globalThis.__gsrpReminderState.isStarted) {
    return;
  }
  
  globalThis.__gsrpReminderState.isStarted = true;
  runReminders().catch(err => {
    console.error('[Reminders] Worker crashed:', err);
    globalThis.__gsrpReminderState.isStarted = false;
    globalThis.__gsrpReminderState.status = 'crashed';
  });
}

async function runReminders() {
  console.log('[Reminders] Service started.');
  
  if (!uri || !ERLC_KEY) {
    console.error('[Reminders] Missing MONGODB_URI or ERLC_API_KEY. Exiting.');
    return;
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('reminders');

    while (true) {
      // Clear the restart flag at the start of each fetch
      await updateState({ needsRestart: false });
      
      const reminders = await collection.find({}).sort({ order: 1 }).toArray();
      
      if (reminders.length === 0) {
        await updateState({ status: 'idle', nextReminder: 'None configured' });
        // Still check for restart during idle sleep
        const shouldRestart = await waitWithCheck(Date.now() + 30000);
        if (shouldRestart) continue;
        continue;
      }

      for (let i = 0; i < reminders.length; i++) {
        const reminder = reminders[i];
        const nextRunAt = Date.now() + (reminder.delayMinutes * 60000);
        
        await updateState({
          status: 'waiting',
          nextReminder: reminder.message,
          nextRunAt: nextRunAt,
        });

        console.log(`[Reminders] Waiting ${reminder.delayMinutes} minutes before sending: ${reminder.type} ${reminder.message}`);
        
        const shouldRestart = await waitWithCheck(nextRunAt);
        if (shouldRestart) {
          console.log('[Reminders] Change detected, restarting loop...');
          break; // Break the FOR loop to refetch at WHILE loop
        }

        try {
          await updateState({ status: 'sending' });
          
          // Fetch fresh data directly from ERLC API
          const serverRes = await fetch('https://api.erlc.gg/v2/server', {
            headers: { 'server-key': ERLC_KEY }
          });
          const serverData = await serverRes.json().catch(() => ({}));
          
          const playerCount = serverData.CurrentPlayers || 0;
          await updateState({ playerCount });

          if (playerCount === 0) {
            console.log(`[Reminders] Skipping command (0 players online): ${reminder.message}`);
            const shouldRestartEmpty = await waitWithCheck(Date.now() + 10000);
            if (shouldRestartEmpty) break;
            continue;
          }

          const command = `:${reminder.type} ${reminder.message}`;
          console.log(`[Reminders] Executing command: ${command}`);

          const response = await fetch('https://api.erlc.gg/v1/server/command', {
            method: 'POST',
            headers: {
              'server-key': ERLC_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command }),
          });

          if (response.status === 429) {
            const body = await response.json().catch(() => ({}));
            const retryAfter = (parseFloat(body.retry_after) || 5) * 1000;
            console.warn(`[Reminders] Rate limited. Retrying after ${retryAfter}ms`);
            const shouldRestartRetry = await waitWithCheck(Date.now() + retryAfter + 500);
            if (shouldRestartRetry) break;
            i--; // Retry same reminder
            continue;
          } else if (response.status !== 200) {
            const errorText = await response.text();
            console.error(`[Reminders] Command failed (${response.status}): ${errorText}`);
            await updateState({ lastError: `HTTP ${response.status}: ${errorText}` });
          } else {
            console.log(`[Reminders] Successfully sent reminder.`);
          }

          const shouldRestartInterval = await waitWithCheck(Date.now() + CMD_INTERVAL_MS);
          if (shouldRestartInterval) break;
        } catch (err) {
          console.error(`[Reminders] Error in loop: ${err.message}`);
          await updateState({ lastError: err.message });
          const shouldRestartError = await waitWithCheck(Date.now() + 10000);
          if (shouldRestartError) break;
        }
      }
    }
  } catch (err) {
    console.error(`[Reminders] Fatal error: ${err.message}`);
    await updateState({ status: 'crashed', lastError: err.message });
  } finally {
    await client.close();
    globalThis.__gsrpReminderState.isStarted = false;
  }
}

