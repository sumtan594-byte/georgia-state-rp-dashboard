// lib/transcript-renderer.js
// Spawns transcript-worker.js as a child process to avoid React instance conflicts
// between discord-html-transcripts and Next.js.

const { spawn } = require('child_process');
const path = require('path');

const WORKER_PATH = path.join(__dirname, 'transcript-worker.js');

function generateTranscriptHTML({ messages, channelName, guildName }) {
  return new Promise((resolve, reject) => {
    const mentionUsers = {};
    const mentionRoles = {};
    const mentionChannels = {};

    for (const msg of messages) {
      const m = msg.mentions;
      if (!m) continue;
      if (m.users) Object.assign(mentionUsers, m.users);
      if (m.roles) Object.assign(mentionRoles, m.roles);
      if (m.channels) Object.assign(mentionChannels, m.channels);
    }

    const payload = JSON.stringify({ messages, channelName, guildName, mentionUsers, mentionRoles, mentionChannels });

    const child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Worker exited with code ${code}`));
      } else {
        resolve({ fullHtml: stdout });
      }
    });

    child.on('error', reject);

    child.stdin.write(payload);
    child.stdin.end();
  });
}

module.exports = { generateTranscriptHTML };
