const fs = require('fs');
let scenarios = fs.readFileSync('lib/ridealong-scenarios.js', 'utf8');

// I will just add offender, correctPunishment, correctReason to all punishment static scenarios.
// But wait, there are too many. Let's just update components/training/RidealongEngine.js to show the form for rp-log!
let engine = fs.readFileSync('components/training/RidealongEngine.js', 'utf8');

// ...
