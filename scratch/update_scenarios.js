const fs = require('fs');
let content = fs.readFileSync('lib/ridealong-scenarios.js', 'utf8');

// Terminology replacements
content = content.replace(/bodycams?/gi, 'player clips');
content = content.replace(/dashcams?/gi, 'player clips');
content = content.replace(/trail cams?/gi, 'player clips');
content = content.replace(/security cameras?/gi, 'player clips');
content = content.replace(/exterior camera timelapse/gi, 'player submitted video clip');
content = content.replace(/admin log replay/gi, 'video clip');
content = content.replace(/chatlogs?/gi, 'screenshots of the chat');
content = content.replace(/chat logs?/gi, 'screenshots of the chat');

// Simplify language - AI-isms
content = content.replace(/enduring testament/g, 'sign');
content = content.replace(/pivotal moment/g, 'important time');
content = content.replace(/intricate interplay/g, 'connection');
content = content.replace(/groundbreaking/g, 'new');
content = content.replace(/highlighting/g, 'showing');
content = content.replace(/showcasing/g, 'showing');
content = content.replace(/underscoring/g, 'showing');
content = content.replace(/reflecting/g, 'showing');
content = content.replace(/contributing to/g, 'adding to');
content = content.replace(/Due to its unique characteristics/g, 'Because of this');

fs.writeFileSync('lib/ridealong-scenarios.js', content);
console.log('Done basic replacements.');
