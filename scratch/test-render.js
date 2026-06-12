const mysql = require('/Users/pradyunkabra/Desktop/gsrp-dashboard/node_modules/mysql2/promise');
const { generateTranscriptHTML } = require('../lib/transcript-renderer');
const fs = require('fs');

async function main() {
  const connection = await mysql.createConnection({
    host: "db0.fps.ms",
    user: "u70223_eY1Luivp9c",
    password: "fp+9sN..uudmcE52lSlv.KNe",
    database: "s70223_Bots",
    port: 3306
  });

  // Find a transcript that has Component V2 (type 17)
  const [rows] = await connection.query(
    `SELECT transcript_id FROM transcript_messages WHERE message_data LIKE '%type":17%' OR message_data LIKE '%type": 17%' LIMIT 1`
  );

  if (rows.length === 0) {
    console.log("No V2 transcripts found in database.");
    await connection.end();
    return;
  }

  const transcriptId = rows[0].transcript_id;
  console.log("Found V2 Transcript ID:", transcriptId);

  const [msgRows] = await connection.query(
    'SELECT message_data FROM transcript_messages WHERE transcript_id = ? ORDER BY sort_order ASC',
    [transcriptId]
  );

  const messages = msgRows.map(r => JSON.parse(r.message_data));

  console.log("Rendering...");
  const { fullHtml } = await generateTranscriptHTML({
    messages,
    channelName: 'test-v2-channel',
    guildName: 'GSRP',
  });

  fs.writeFileSync('scratch-transcript.html', fullHtml);
  console.log("Done! Saved to scratch-transcript.html");

  await connection.end();
}

main().catch(console.error);
