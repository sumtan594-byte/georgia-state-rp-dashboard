const QuestionLabel = ({ children, required = true, subtitle, sentences = 0 }) => (
  <label className="block mb-2">
    <div className="flex justify-between items-center">
      <span className="text-xs font-black uppercase tracking-widest text-gsrp-teal-light/40 ml-1">
        {children} {required && <span className="text-red-500">*</span>}
      </span>
      <span className="flex items-center gap-1 opacity-20 text-[10px] font-bold uppercase tracking-widest">
        <Keyboard size={10} /> Active
      </span>
    </div>
    {subtitle && <p className="text-[10px] text-gsrp-teal-light/30 ml-1 mt-1 font-medium">{subtitle}</p>}
    {sentences > 0 && <p className="text-[10px] text-gsrp-orange/60 ml-1 mt-0.5 font-black uppercase tracking-tighter">({sentences} Sentences Required)</p>}
  </label>
);

const TextArea = ({ name, placeholder, trackEvent, sentences = 0 }) => (
  <textarea 
    name={name}
    required 
    rows={4}
    onKeyDown={(e) => trackEvent(name, 'keystroke', e.key)}
    onPaste={(e) => trackEvent(name, 'paste', e.clipboardData.getData('text'))}
    placeholder={placeholder}
    className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl px-4 py-3 text-white focus:border-gsrp-orange/50 focus:outline-none transition-colors font-medium resize-none mb-6"
  />
);

const Input = ({ name, type = "text", placeholder, trackEvent, required = true }) => (
  <input 
    name={name}
    type={type}
    required={required}
    onKeyDown={(e) => trackEvent(name, 'keystroke', e.key)}
    onPaste={(e) => trackEvent(name, 'paste', e.clipboardData.getData('text'))}
    placeholder={placeholder}
    className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl px-4 py-3 text-white focus:border-gsrp-orange/50 focus:outline-none transition-colors font-medium mb-6"
  />
);

const RadioGroup = ({ name, options }) => (
  <div className="space-y-2 mb-6">
    {options.map((opt, i) => (
      <label key={i} className="flex items-center gap-3 p-4 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-xl cursor-pointer hover:bg-gsrp-dark-surface transition-colors group">
        <input type="radio" name={name} value={opt} required className="accent-gsrp-orange" />
        <span className="text-sm font-medium text-gsrp-teal-light/60 group-hover:text-white transition-colors">{opt}</span>
      </label>
    ))}
  </div>
);

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Monitoring data
  const [keystrokes, setKeystrokes] = useState({});
  const [pastes, setPastes] = useState({});
  const [totalKeys, setTotalKeys] = useState(0);

  const trackEvent = (fieldName, type, data) => {
    if (type === 'keystroke') {
      setKeystrokes(prev => {
        const field = prev[fieldName] || [];
        return { ...prev, [fieldName]: [...field, { timestamp: Date.now(), key: data }] };
      });
      setTotalKeys(prev => prev + 1);
    } else if (type === 'paste') {
      setPastes(prev => {
        const field = prev[fieldName] || [];
        return { ...prev, [fieldName]: [...field, { timestamp: Date.now(), content: data }] };
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const answers = Object.fromEntries(formData.entries());
    
    const data = {
      username: session.user.name,
      userId: session.user.id,
      answers: answers,
      keystrokeData: keystrokes,
      pasteData: pastes,
      submittedAt: new Date(),
    };

    try {
      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit application');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') return null;
  if (!session) return <LoginScreen />;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gsrp-teal/10 mb-8 border border-gsrp-teal/20">
          <CheckCircle2 className="w-10 h-10 text-gsrp-teal" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Application Sent!</h1>
        <p className="text-gsrp-teal-light/60 mb-8 max-w-md mx-auto">
          Your application has been sent, it will be reviewed soon. Do not ask when it will be reviewed as it will lead to an instant denial + Blacklist.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-gsrp-orange hover:bg-gsrp-orange-light text-white font-bold rounded-xl transition-all shadow-lg shadow-gsrp-orange/20"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up pb-20">
      <Head>
        <title>Apply for Staff | GSRP Dashboard</title>
      </Head>

      <div className="mb-10 p-8 rounded-2xl bg-card-gradient border border-gsrp-dark-border/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/5 to-gsrp-teal/5 opacity-50" />
        <div className="relative z-10">
          <h1 className="text-white font-black text-3xl mb-2 flex items-center gap-3">
            <FileText className="text-gsrp-orange" />
            GSRP | Staff Application
          </h1>
          <div className="space-y-1">
            <p className="text-gsrp-teal-light/60 text-sm font-medium">• You need to be rank Lieutenant+ in game to be accepted into the staff team.</p>
            <p className="text-gsrp-teal-light/60 text-sm font-medium">• Use SPaG. If you do not the application will be rejected instantly.</p>
            <p className="text-gsrp-orange/60 text-xs font-black uppercase tracking-widest mt-2">Asking when applications will be reviewed will result in a blacklist.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
          
          {/* Section 1: Basic Info */}
          <div className="mb-8">
            <h2 className="text-gsrp-orange font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-gsrp-orange/30" />
              Information
            </h2>
            
            <QuestionLabel subtitle="Username, not display name.">Discord username</QuestionLabel>
            <input type="text" name="discord_username" value={session.user.name} disabled className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl px-4 py-3 text-white font-bold opacity-50 cursor-not-allowed mb-6" />

            <QuestionLabel subtitle="Username, not display name.">Roblox username</QuestionLabel>
            <Input name="roblox_username" placeholder="Your Roblox username" trackEvent={trackEvent} />

            <QuestionLabel subtitle="What rank are you in game (e.g. Major, Commander etc.)">In game PD rank?</QuestionLabel>
            <Input name="pd_rank" placeholder="e.g. Commander" trackEvent={trackEvent} />
            
            <QuestionLabel>What is your Time zone?</QuestionLabel>
            <TextArea name="timezone" placeholder="e.g. EST, GMT+1" trackEvent={trackEvent} />
          </div>

          {/* Section 2: Game Rules */}
          <div className="mb-8">
            <h2 className="text-gsrp-orange font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-gsrp-orange/30" />
              Game Rules
            </h2>
            
            <QuestionLabel sentences={2} subtitle="Elaborate, What is RDM? What may be a valid punishment for offenders?">Explain RDM</QuestionLabel>
            <TextArea name="explain_rdm" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="Elaborate, What is VDM? What may be a valid punishment for offenders?">Explain VDM</QuestionLabel>
            <TextArea name="explain_vdm" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="Elaborate, What is FRP? What may be a valid punishment for offenders?">Explain FRP</QuestionLabel>
            <TextArea name="explain_frp" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="Elaborate, What is LTAP? What may be a valid punishment for offenders?">Explain LTAP</QuestionLabel>
            <TextArea name="explain_ltap" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />
          </div>

          {/* Section 3: Scenarios */}
          <div className="mb-8">
            <h2 className="text-gsrp-orange font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-gsrp-orange/30" />
              Scenarios
            </h2>

            <QuestionLabel sentences={2} subtitle="A player is shooting inside civilian spawn, which is a safezone. What would you do to this player?">Scenario 1</QuestionLabel>
            <TextArea name="scenario_1" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="A police officer is arresting criminals through the 'arrest' button. What is this classified as and what will you do in this situation?">Scenario 2</QuestionLabel>
            <TextArea name="scenario_2" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="A sniper on a roof is killing people for no reason. What would you do?">Scenario 3</QuestionLabel>
            <TextArea name="scenario_3" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="A player is spamming stop sticks. What is this classified as and what would you do?">Scenario 4</QuestionLabel>
            <TextArea name="scenario_4" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="A player does not respond for more than 2 minutes on a mod call. What is your decision?">Scenario 5</QuestionLabel>
            <TextArea name="scenario_5" placeholder="Response here..." sentences={2} trackEvent={trackEvent} />
          </div>

          {/* Section 4: Serious Punishments */}
          <div className="mb-8">
            <h2 className="text-gsrp-orange font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-gsrp-orange/30" />
              Serious Punishments
            </h2>

            <QuestionLabel sentences={2} subtitle="A player is threatening to jump off a building, what is this classified as and what would your first instinct be?">Scenario 6</QuestionLabel>
            <Input name="scenario_6" placeholder="Response here..." trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="A player is saying swear words bypassing the roblox filter. What is your decision?">Scenario 7</QuestionLabel>
            <Input name="scenario_7" placeholder="Response here..." trackEvent={trackEvent} />

            <QuestionLabel sentences={2} subtitle="You see a player exploiting. What would you do?">Scenario 8</QuestionLabel>
            <Input name="scenario_8" placeholder="Response here..." trackEvent={trackEvent} />
          </div>

          {/* Section 5: Agreements */}
          <div className="mb-8">
            <h2 className="text-gsrp-orange font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-gsrp-orange/30" />
              Agreements
            </h2>

            <QuestionLabel>Do you understand that moderation can become tiring and frustrating, and there will be times when you are the only mod online?</QuestionLabel>
            <RadioGroup name="agree_workload" options={["Yes I do, and I am ready for it.", "I don't think I can do that"]} />

            <QuestionLabel>Utmost SPaG (Spelling Punctuation and Grammar) and immense professionalism is required. Do you understand?</QuestionLabel>
            <RadioGroup name="agree_spag" options={["I do", "I cannot do that."]} />

            <QuestionLabel>Do you understand that you Have to meet a 4 hour quota per Week?</QuestionLabel>
            <RadioGroup name="agree_quota" options={["Yes", "No"]} />

            <QuestionLabel subtitle="Note, asking for an update on your application will result in an instant denial + Blacklist.">Questions or Comments?</QuestionLabel>
            <Input name="final_questions" placeholder="Any questions?" required={false} trackEvent={trackEvent} />

            <QuestionLabel>Do you agree to not ask anyone when your application will be read?</QuestionLabel>
            <RadioGroup name="agree_no_ask" options={["Yes", "No"]} />

            <QuestionLabel>How familiar are you with melonly? (1 = What is that?, 5 = I'm an expert)</QuestionLabel>
            <div className="flex justify-between items-center px-4 mb-8">
              {[1, 2, 3, 4, 5].map(num => (
                <label key={num} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <input type="radio" name="melonly_familiarity" value={num} required className="accent-gsrp-orange" />
                  <span className="text-xs font-bold text-gsrp-teal-light/40 group-hover:text-gsrp-orange transition-colors">{num}</span>
                </label>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-gsrp-orange/5 border border-gsrp-orange/10 mb-6">
              <p className="text-[10px] text-gsrp-orange font-black uppercase tracking-widest text-center">
                This is the end of the GSRP Staff application. This is your last chance to check responses.
              </p>
            </div>
            
            <QuestionLabel>Proceed with submission?</QuestionLabel>
            <RadioGroup name="proceed" options={["Yes!"]} />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold mb-6">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all
              ${isSubmitting 
                ? 'bg-gsrp-dark-surface text-gsrp-teal-light/40 cursor-not-allowed' 
                : 'bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white hover:shadow-lg hover:shadow-gsrp-orange/20 hover:scale-[1.01]'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                Submit Application
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
