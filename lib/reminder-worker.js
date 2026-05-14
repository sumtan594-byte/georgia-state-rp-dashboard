import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const ERLC_KEY = process.env.ERLC_API_KEY;
const CMD_INTERVAL_MS = 5500; // PRC command limit is 1 per 5s

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        // No reminders, check again in 30 seconds
        await sleep(30000);
        continue;
      }

      for (const reminder of reminders) {
        // Wait for the configured delay before sending
        console.log(`[Reminders] Waiting ${reminder.delayMinutes} minutes before sending: ${reminder.type} ${reminder.message}`);
        await sleep(reminder.delayMinutes * 60000);

        try {
          // Check if anyone is in the server first
          // We use the global cache if available, which is updated by the dashboard UI
          let playerCount = 0;
          const cache = globalThis.__gsrpErlcCache;
          const CACHE_TTL_MS = 10000; // Use a slightly longer TTL for the worker

          if (cache && cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
            playerCount = (cache.data.Players || cache.data.players)?.length || 0;
          } else {
            // Fallback to direct fetch if cache is stale
            const serverRes = await fetch('https://api.erlc.gg/v2/server', {
              headers: { 'server-key': ERLC_KEY }
            });
            const serverData = await serverRes.json().catch(() => ({}));
            playerCount = (serverData.Players || serverData.players)?.length || 0;
            
            // Update global cache for other components
            if (serverRes.ok) {
              globalThis.__gsrpErlcCache = {
                data: serverData,
                fetchedAt: Date.now(),
                fetching: null
              };
            }
          }

          if (playerCount === 0) {
            console.log(`[Reminders] Skipping command (0 players online): ${reminder.message}`);
            continue;
          }

          const command = `:${reminder.type} ${reminder.message}`;
          console.log(`[Reminders] Executing command: ${command}`);

          const response = await fetch('https://api.erlc.gg/v2/server/command', {
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
            console.warn(`[Reminders] Rate limited. Waiting ${retryAfter}ms...`);
            await sleep(retryAfter + 500);
          } else if (response.status !== 204 && response.status !== 200) {
            const errorText = await response.text();
            console.error(`[Reminders] Command failed with status ${response.status}: ${errorText}`);
          }

          // Always wait at least the command interval to respect rate limits
          await sleep(CMD_INTERVAL_MS);

        } catch (err) {
          console.error(`[Reminders] Error executing command: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error(`[Reminders] Fatal error: ${err.message}`);
  } finally {
    await client.close();
  }
}

// Start the service
runReminders();
