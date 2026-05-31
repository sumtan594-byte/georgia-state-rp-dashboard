const fs = require('fs');
let content = fs.readFileSync('lib/ridealong-scenarios.js', 'utf8');

const newScenarios = `
  {
    id: 'ra_invalid_rdm_02',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: 'Store_Clerk_99',
      reason: 'I was just standing behind the counter and got shot by a robber! RDM!',
      location: 'Gas Station'
    },
    sceneDescription: 'You arrive at the Gas Station. "Store_Clerk_99" is dead behind the counter. The shooter, "Robber_X", is still inside looting the register. The caller is very angry in the report.',
    videoEvidence: {
      summary: 'A player submitted video clip from the caller shows "Robber_X" walking in with a gun drawn, pointing it at the clerk, and saying "Give me the cash or I shoot" in chat. The clerk pulls out a baseball bat and swings at the robber. The robber immediately shoots the clerk. This is a valid roleplay scenario, not RDM.'
    },
    options: [
      { id: 'a', text: 'No action — self-defence during active robbery', correct: true, command: 'N/A' },
      { id: 'b', text: 'Warn the shooter for RDM', correct: false, wrongReason: 'The clerk initiated the fight by swinging a weapon during an active hold-up. The shooter defended themselves.' },
      { id: 'c', text: 'Kick the shooter for RDM', correct: false, wrongReason: 'This is not RDM. It is a legitimate roleplay outcome.' }
    ],
    explanation: 'If a player initiates a fight or refuses to comply during an active hold-up and gets killed, it is not RDM. It is a valid RP scenario.',
    handbookRef: { chapter: 9, section: '9.3' }
  },
  {
    id: 'ra_invalid_vdm_02',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: 'Angry_Pedestrian',
      reason: 'This guy ran me over on the sidewalk! VDM!',
      location: 'Downtown Sidewalk'
    },
    sceneDescription: 'You find "Angry_Pedestrian" dead on the sidewalk. "Bad_Driver_11" is crashed into a nearby streetlight.',
    videoEvidence: {
      summary: 'A player submitted video clip shows "Bad_Driver_11" speeding down the road, losing control of their vehicle while taking a sharp turn, sliding onto the sidewalk, and accidentally hitting the pedestrian before crashing into the pole. They say "oh shoot sorry man lag" in chat immediately after.'
    },
    options: [
      { id: 'a', text: 'No action — accidental collision', correct: true, command: 'N/A' },
      { id: 'b', text: 'Warn for VDM', correct: false, wrongReason: 'VDM requires intent. This was clearly an accidental loss of vehicle control due to speed or lag.' },
      { id: 'c', text: 'Kick for VDM', correct: false, wrongReason: 'Kicking is for intentional vehicular assault. This was an accident.' }
    ],
    explanation: 'VDM stands for Vehicle Death Match, which means intentionally using a vehicle to kill players. Accidental collisions, even due to reckless driving, are not VDM.',
    handbookRef: { chapter: 9, section: '9.3' }
  },
  {
    id: 'ra_invalid_cop_baiting_01',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: 'Sheriff_Deputy_01',
      reason: 'This guy is driving past me repeatedly to get me to chase him! Cop Baiting!',
      location: 'Highway 12'
    },
    sceneDescription: 'You arrive to observe the situation. "Fast_Car_Go_Vroom" is driving a fast sports car up and down Highway 12 at high speeds.',
    videoEvidence: {
      summary: 'A player submitted video clip shows the deputy running a speed trap. "Fast_Car_Go_Vroom" speeds past them going 120mph. The deputy does not pursue. Two minutes later, the same car speeds past in the opposite direction. They are not honking, stopping, or taunting the officer—just speeding back and forth on the highway.'
    },
    options: [
      { id: 'a', text: 'No action — speeding is an in-game crime, not cop baiting', correct: true, command: 'N/A' },
      { id: 'b', text: 'Warn for Cop Baiting', correct: false, wrongReason: 'Simply speeding on a highway, even repeatedly, is an in-game traffic violation, not a server rule break.' },
      { id: 'c', text: 'Kick for Cop Baiting', correct: false, wrongReason: 'Cop baiting involves intentional provocation (donuts at the station, honking at cops). Speeding is a regular crime for police to handle.' }
    ],
    explanation: 'Committing regular traffic violations (like speeding) is a matter for police roleplay, not staff moderation. Cop baiting requires clear, intentional OOC provocation of law enforcement.',
    handbookRef: { chapter: 9, section: '9.3' }
  },
`;

// Insert before the last closing bracket of SCENARIOS array
const targetIndex = content.indexOf('];\n\n// ── Mock Data');
if (targetIndex !== -1) {
    // we need to find the end of the SCENARIOS array, wait, it's `]\n\n// ── Mock Data`
    // Actually let's just do a regex replace
}
content = content.replace(/  \},\n\]\n\n\/\//g, '  },\n' + newScenarios + ']\n\n//');

fs.writeFileSync('lib/ridealong-scenarios.js', content);
console.log('Added inconclusive scenarios.');
