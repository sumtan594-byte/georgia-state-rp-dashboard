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
  // We'll use this to communicate specific updates to the worker
  updatedReminderId: null,
  updatedDelay: null,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      const reminders = await collection.find({}).sort({ order: 1 }).toArray();
      
      if (reminders.length === 0) {
        await updateState({ status: 'idle', nextReminder: 'None configured', nextRunAt: 0 });
        await sleep(10000);
        continue;
      }

      for (let i = 0; i < reminders.length; i++) {
        let reminder = reminders[i];
        let startTime = Date.now();
        let targetTime = startTime + (reminder.delayMinutes * 60000);
        
        await updateState({
          status: 'waiting',
          nextReminder: reminder.message,
          nextRunAt: targetTime,
          updatedReminderId: null, // Reset tracking
        });

        console.log(`[Reminders] Waiting ${reminder.delayMinutes} minutes for: ${reminder.message}`);

        // Wait loop with dynamic adjustments
        while (Date.now() < targetTime) {
          // Check if this specific reminder was updated in the API
          if (globalThis.__gsrpReminderState.updatedReminderId === reminder._id.toString()) {
            const newDelay = globalThis.__gsrpReminderState.updatedDelay;
            console.log(`[Reminders] Dynamic delay update detected: ${reminder.delayMinutes}m -> ${newDelay}m`);
            
            // Update the target time based on the new delay from the original start time
            targetTime = startTime + (newDelay * 60000);
            
            await updateState({ 
              nextRunAt: targetTime,
              updatedReminderId: null // Clear the flag
            });
            
            // Update local reminder object for the send step
            reminder.delayMinutes = newDelay;
          }

          const remaining = targetTime - Date.now();
          if (remaining <= 0) break;
          await sleep(Math.min(2000, remaining));
        }

        try {
          await updateState({ status: 'sending' });
          
          // Re-fetch the message just in case it was edited during the wait
          const freshReminder = await collection.findOne({ _id: reminder._id });
          if (!freshReminder) {
            console.log('[Reminders] Reminder deleted during wait, skipping.');
            continue;
          }

          const serverRes = await fetch('https://api.erlc.gg/v2/server', {
            headers: { 'server-key': ERLC_KEY }
          });
          const serverData = await serverRes.json().catch(() => ({}));
          const playerCount = serverData.CurrentPlayers || 0;
          await updateState({ playerCount });

          if (playerCount === 0) {
            console.log(`[Reminders] Skipping command (0 players online)`);
            await sleep(10000);
            continue;
          }

          const command = `:${freshReminder.type} ${freshReminder.message}`;
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
            await sleep(retryAfter + 500);
            i--; 
            continue;
          } else if (response.status !== 200) {
            const errorText = await response.text();
            await updateState({ lastError: `HTTP ${response.status}: ${errorText}` });
          }

          await sleep(CMD_INTERVAL_MS);
        } catch (err) {
          console.error(`[Reminders] Error in loop: ${err.message}`);
          await updateState({ lastError: err.message });
          await sleep(10000);
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

