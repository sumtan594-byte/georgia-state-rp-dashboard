const fs = require('fs');
const content = fs.readFileSync('lib/ridealong-scenarios.js', 'utf8');

// Find all scenarios in SCENARIO_BANK
const scenarioRegex = /id:\s*'([^']+)'[\s\S]*?(?=(id:\s*'|];))/g;
let match;
while ((match = scenarioRegex.exec(content)) !== null) {
  const block = match[0];
  const id = match[1];
  const hasOptions = block.includes('options:');
  const isPLog = block.includes("type: 'p-log'");
  const isRpLog = block.includes("type: 'rp-log'");
  
  // if it's part of SCENARIO_BANK (roughly, before MOCK_USERS)
  if (!hasOptions && !isPLog && !isRpLog && !id.startsWith('gen_pl_')) {
    console.log("BAD SCENARIO:", id);
  }
}
