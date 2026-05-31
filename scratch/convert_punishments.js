const fs = require('fs');
let content = fs.readFileSync('lib/ridealong-scenarios.js', 'utf8');

// We will find all objects with category: 'punishments' and convert them to p-log
content = content.replace(/\{[\s\S]*?category:\s*'punishments'[\s\S]*?\},/g, (match) => {
    // extract correct command and reason
    let commandMatch = match.match(/command:\s*'([^']+)'/);
    let command = commandMatch ? commandMatch[1] : '';
    
    // figure out punishment type
    let punishment = 'Warn';
    if (command === ';kick' || match.toLowerCase().includes('kick the player') || command.includes('kick')) punishment = 'Kick';
    if (command === ';ban' || match.toLowerCase().includes('ban the player') || command.includes('ban')) punishment = 'Ban';
    if (match.toLowerCase().includes('warn') && !punishment) punishment = 'Warn';
    
    // figure out offender
    let offenderMatch = match.match(/"([^"]+)"/);
    let offender = offenderMatch ? offenderMatch[1] : 'Unknown_Player';
    
    // correct reason
    let reasonMatch = match.match(/text:\s*'([^']+)'\s*,\s*correct:\s*true/);
    let reason = reasonMatch ? reasonMatch[1] : 'Rule Violation';
    
    // we must preserve id, evidenceValid, difficulty, category, modCall, sceneDescription, videoEvidence, explanation
    let idMatch = match.match(/id:\s*'([^']+)'/);
    let id = idMatch ? idMatch[1] : '';
    
    let replacement = match;
    replacement = replacement.replace(/id:\s*'[^']+',/, `id: '${id}',\n    type: 'p-log',\n    offender: '${offender}',\n    correctPunishment: '${punishment}',\n    correctReason: '${reason}',`);
    
    // remove options array
    replacement = replacement.replace(/options:\s*\[[\s\S]*?\],/, '');
    
    return replacement;
});

fs.writeFileSync('lib/ridealong-scenarios.js', content);
console.log('Converted punishment scenarios.');
