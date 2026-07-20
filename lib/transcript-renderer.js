const { generateDiscordTranscript } = require('./discord-transcript');

function generateTranscriptHTML({
  messages,
  channelName,
  channelId,
  channelCreatedTimestamp,
  guildName,
  guildId,
  guildIconUrl,
  generatedAt,
}) {
  return Promise.resolve({
    fullHtml: generateDiscordTranscript({
      messages,
      channelName,
      channelId,
      channelCreatedTimestamp,
      guildName,
      guildId,
      guildIconUrl,
      generatedAt,
    }),
  });
}

module.exports = { generateTranscriptHTML };
