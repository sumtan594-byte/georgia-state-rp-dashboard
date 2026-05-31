const fs = require('fs');
let content = fs.readFileSync('components/training/RidealongEngine.js', 'utf8');

// Add state
content = content.replace(
  /const \[pFormError, setPFormError\] = useState\(''\)/,
  `const [pFormError, setPFormError] = useState('')
  const [rpLogData, setRpLogData] = useState({ location: '', duration: '', peopleCount: '' })
  const [rpLogFormOpen, setRpLogFormOpen] = useState(false)
  const [rpLogError, setRpLogError] = useState('')`
);

// Reset state in handleNext
content = content.replace(
  /setPFormError\(''\)/g,
  `setPFormError('')
      setRpLogData({ location: '', duration: '', peopleCount: '' })
      setRpLogFormOpen(false)
      setRpLogError('')`
);

// Add handleRpLogSubmit
const handleRpLogSubmit = `
  const handleRpLogSubmit = useCallback(() => {
    if (!scenario || answered) return

    if (!rpLogData.location.trim() || !rpLogData.duration.trim() || !rpLogData.peopleCount.trim()) {
      setRpLogError('Please fill in all fields before submitting.')
      return
    }
    setRpLogError('')

    const locationMatch = rpLogData.location.trim().toLowerCase() === scenario.location.toLowerCase()
    const durationMatch = rpLogData.duration.trim().toLowerCase() === scenario.duration.toLowerCase()
    const peopleMatch = rpLogData.peopleCount.trim() === String(scenario.peopleCount)

    const isCorrect = locationMatch && durationMatch && peopleMatch && !scenario.hasOngoing

    let wrongReason = null
    if (scenario.hasOngoing) {
      wrongReason = 'There is already an active RP. You should have informed the caller to wait.'
    } else if (!isCorrect) {
      wrongReason = 'One or more fields were incorrect. Please check the location, duration, and people count.'
    }

    if (isCorrect) setScore(prev => prev + 1)

    const result = {
      scenarioId: scenario.id,
      evidenceValid: true,
      correct: isCorrect,
      chosenOption: 'log',
      chosenText: \`Logged: \${rpLogData.location}, \${rpLogData.duration}, \${rpLogData.peopleCount} people\`,
      correctAnswer: scenario.hasOngoing
        ? 'Inform the caller that this RP is already being handled'
        : \`Logged: \${scenario.location}, \${scenario.duration}, \${scenario.peopleCount} people\`,
      correctCommand: scenario.hasOngoing ? 'N/A' : ';log_rp',
      explanation: scenario.explanation,
      wrongReason,
      evidenceViewed,
      type: 'rp-log'
    }

    const newResults = [...results, result]
    setResults(newResults)
    setAnswered(true)

    if (onSaveProgress) {
      onSaveProgress({
        currentQ,
        score: score + (isCorrect ? 1 : 0),
        results: newResults,
        phase: 'result',
      })
    }
  }, [scenario, answered, rpLogData, results, score, evidenceViewed, onSaveProgress])
`;

content = content.replace(
  /const handlePFormSubmit = useCallback\(\(\) => \{/,
  handleRpLogSubmit + '\n\n  const handlePFormSubmit = useCallback(() => {'
);

// Update the RP Logging UI where the buttons are
const newRpLogUI = `
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gsrp-teal/10 text-gsrp-teal-light">
                      Logs Viewed
                    </span>
                    <button
                      onClick={() => setRpLogOpen(true)}
                      className="text-[10px] text-gsrp-teal-light/40 underline hover:text-gsrp-teal-light/60 cursor-pointer"
                    >
                      Re-open logs
                    </button>
                  </div>
                  
                  {!rpLogFormOpen ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRpLogFormOpen(true)}
                        disabled={!evidenceViewed}
                        className={\`p-4 rounded-xl border text-left transition-all cursor-pointer \${
                          !evidenceViewed
                            ? 'border-gsrp-dark-border/30 bg-gsrp-dark-surface/30 opacity-50 cursor-not-allowed'
                            : 'border-gsrp-teal/30 bg-gsrp-teal/5 hover:bg-gsrp-teal/10 hover:border-gsrp-teal/50'
                        }\`}
                      >
                        <span className="block text-sm font-bold text-white mb-1">Log the RP</span>
                        <span className="block text-[11px] text-gsrp-teal-light/50">
                          Fill out the RP log form
                        </span>
                      </button>
                      <button
                        onClick={() => handleRpLogDecision('inform')}
                        disabled={!evidenceViewed}
                        className={\`p-4 rounded-xl border text-left transition-all cursor-pointer \${
                          !evidenceViewed
                            ? 'border-gsrp-dark-border/30 bg-gsrp-dark-surface/30 opacity-50 cursor-not-allowed'
                            : 'border-gsrp-orange/30 bg-gsrp-orange/5 hover:bg-gsrp-orange/10 hover:border-gsrp-orange/50'
                        }\`}
                      >
                        <span className="block text-sm font-bold text-white mb-1">Inform Caller to Wait</span>
                        <span className="block text-[11px] text-gsrp-teal-light/50">
                          There is already an active RP
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4 bg-gsrp-dark-surface/50 p-4 rounded-xl border border-gsrp-dark-border/50">
                      <h4 className="text-xs font-bold text-gsrp-teal-light/60 uppercase tracking-wider mb-2">RP Logging Form</h4>
                      <div>
                        <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">Location</label>
                        <input
                          type="text"
                          value={rpLogData.location}
                          onChange={e => setRpLogData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g. Bank of River City"
                          className="w-full px-4 py-2 bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">Duration</label>
                        <input
                          type="text"
                          value={rpLogData.duration}
                          onChange={e => setRpLogData(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="e.g. 20m"
                          className="w-full px-4 py-2 bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">Amount of People</label>
                        <input
                          type="number"
                          value={rpLogData.peopleCount}
                          onChange={e => setRpLogData(prev => ({ ...prev, peopleCount: e.target.value }))}
                          placeholder="e.g. 5"
                          className="w-full px-4 py-2 bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl text-sm text-white"
                        />
                      </div>
                      {rpLogError && <p className="text-xs text-gsrp-sunset">{rpLogError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRpLogFormOpen(false)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold bg-gsrp-dark-surface border border-gsrp-dark-border text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRpLogSubmit}
                          className="flex-1 py-2 rounded-xl text-sm font-bold bg-gsrp-teal text-white hover:bg-gsrp-teal/90"
                        >
                          Submit Log
                        </button>
                      </div>
                    </div>
                  )}
`;

content = content.replace(
  /<div className="flex items-center gap-2 mb-4">[\s\S]*?<\/div>\s*<\/div>\s*\)\}\s*<\/div>/,
  newRpLogUI + '\n                </div>\n              )}\n            </div>'
);

fs.writeFileSync('components/training/RidealongEngine.js', content);
console.log('Patched RidealongEngine.js');
