const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const ERLC_KEY = process.env.ERLC_API_KEY;
const CMD_INTERVAL_MS = 5500;

const state = {
  status: 'idle',
  nextReminder: null,
  nextRunAt: 0,
  playerCount: 0,
  lastError: null,
  isStarted: false,
  updatedReminderId: null,
  updatedDelay: null,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateState(updates) {
  Object.assign(state, updates);
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

    let lastPlayerCheck = 0;
    let cachedPlayerCount = 0;

    async function getPlayerCount() {
      if (Date.now() - lastPlayerCheck < 30000) {
        return cachedPlayerCount;
      }
      try {
        const res = await fetch('https://api.erlc.gg/v2/server', {
          headers: { 'server-key': ERLC_KEY }
        });
        const data = await res.json();
        cachedPlayerCount = data.CurrentPlayers || 0;
        lastPlayerCheck = Date.now();
        await updateState({ playerCount: cachedPlayerCount });
        return cachedPlayerCount;
      } catch (e) {
        return cachedPlayerCount;
      }
    }

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
          updatedReminderId: null,
        });

        console.log(`[Reminders] Waiting ${reminder.delayMinutes} minutes for: ${reminder.message}`);

        while (Date.now() < targetTime) {
          const playerCount = await getPlayerCount();

          if (playerCount === 0) {
            await updateState({ status: 'paused', nextRunAt: targetTime });
            targetTime += 5000;
            await sleep(5000);
            continue;
          }

          if (state.status === 'paused') {
            await updateState({ status: 'waiting' });
          }

          if (state.updatedReminderId === reminder._id.toString()) {
            const newDelay = state.updatedDelay;
            targetTime = startTime + (newDelay * 60000);
            await updateState({ nextRunAt: targetTime, updatedReminderId: null });
            reminder.delayMinutes = newDelay;
          }

          const remaining = targetTime - Date.now();
          if (remaining <= 0) break;
          await sleep(Math.min(2000, remaining));
        }

        try {
          const playerCount = await getPlayerCount();
          if (playerCount === 0) {
            console.log('[Reminders] Player count dropped to 0 at send time, skipping.');
            continue;
          }

          await updateState({ status: 'sending' });

          const freshReminder = await collection.findOne({ _id: reminder._id });
          if (!freshReminder) continue;

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
          }

          await sleep(CMD_INTERVAL_MS);
        } catch (err) {
          console.error(`[Reminders] Error: ${err.message}`);
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
    state.isStarted = false;
  }
}

async function start() {
  if (state.isStarted) return;
  state.isStarted = true;
  runReminders().catch(err => {
    console.error('[Reminders] Worker crashed:', err);
    state.isStarted = false;
    state.status = 'crashed';
    state.lastError = err.message;
    console.log('[Reminders] Scheduling auto-restart in 30s...');
    setTimeout(async () => {
      try {
        await start();
        console.log('[Reminders] Auto-restart successful.');
      } catch (e) {
        console.error('[Reminders] Auto-restart failed:', e);
      }
    }, 30000);
  });
}

start();
