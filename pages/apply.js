import { useState, useEffect, useRef } from 'react'; // Re-triggering build
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  MousePointer2, 
  Keyboard, 
  ShieldCheck, 
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import LoginScreen from '../components/auth/LoginScreen';

const QuestionLabel = ({ children, required = true, subtitle, sentences = 0 }) => (
  <label className="block mb-3">
    <div className="flex justify-between items-center">
      <span className="text-sm font-black uppercase tracking-widest text-white/90 ml-1">
        {children} {required && <span className="text-gsrp-orange">*</span>}
      </span>
      <span className="flex items-center gap-1 opacity-60 text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light">
        <Keyboard size={10} /> Monitoring Active
      </span>
    </div>
    {subtitle && <p className="text-xs text-gsrp-teal-light/70 ml-1 mt-1 font-medium">{subtitle}</p>}
    {sentences > 0 && <p className="text-[10px] text-gsrp-orange ml-1 mt-0.5 font-black uppercase tracking-widest">({sentences} Sentences Required)</p>}
  </label>
);

const TextArea = ({ name, placeholder, trackEvent, sentences = 0, value, onChange }) => (
  <textarea 
    name={name}
    required 
    rows={5}
    value={value}
    onChange={onChange}
    onKeyDown={(e) => trackEvent(name, 'keystroke', e.key)}
    onPaste={(e) => trackEvent(name, 'paste', e.clipboardData.getData('text'))}
    placeholder={placeholder}
    className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium resize-none mb-8 text-lg placeholder:text-white/10 shadow-inner"
  />
);

const Input = ({ name, type = "text", placeholder, trackEvent, required = true, value, onChange }) => (
  <input 
    name={name}
    type={type}
    required={required}
    value={value}
    onChange={onChange}
    onKeyDown={(e) => trackEvent(name, 'keystroke', e.key)}
    onPaste={(e) => trackEvent(name, 'paste', e.clipboardData.getData('text'))}
    placeholder={placeholder}
    className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium mb-8 text-lg placeholder:text-white/10 shadow-inner"
  />
);

const RadioGroup = ({ name, options, value, onChange }) => (
  <div className="space-y-3 mb-8">
    {options.map((opt, i) => (
      <label key={i} className={`flex items-center gap-4 p-6 rounded-2xl cursor-pointer transition-all border-2 ${value === opt ? 'bg-gsrp-orange/10 border-gsrp-orange shadow-lg shadow-gsrp-orange/5' : 'bg-gsrp-dark-surface/50 border-gsrp-dark-border/50 hover:bg-gsrp-dark-surface hover:border-gsrp-dark-border'} group`}>
        <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} required className="accent-gsrp-orange w-6 h-6" />
        <span className={`text-lg font-bold ${value === opt ? 'text-white' : 'text-gsrp-teal-light/70 group-hover:text-white'} transition-colors`}>{opt}</span>
      </label>
    ))}
  </div>
);

const STEP_TITLES = [
  "Basic Information",
  "Game Rules Knowledge",
  "Reaction Scenarios",
  "Serious Infractions",
  "Agreements & Submission"
];

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  // Controlled form state to persist across steps
  const [answers, setAnswers] = useState({});
  
  // Monitoring data
  const [keystrokes, setKeystrokes] = useState({});
  const [pastes, setPastes] = useState({});

  const trackEvent = (fieldName, type, data) => {
    if (type === 'keystroke') {
      setKeystrokes(prev => {
        const field = prev[fieldName] || [];
        return { ...prev, [fieldName]: [...field, { timestamp: Date.now(), key: data }] };
      });
    } else if (type === 'paste') {
      setPastes(prev => {
        const field = prev[fieldName] || [];
        return { ...prev, [fieldName]: [...field, { timestamp: Date.now(), content: data }] };
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);

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
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gsrp-teal/10 mb-8 border border-gsrp-teal/20">
          <CheckCircle2 className="w-12 h-12 text-gsrp-teal" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">Application Sent!</h1>
        <p className="text-gsrp-teal-light text-xl mb-10 max-w-md mx-auto leading-relaxed">
          Your application has been successfully recorded. It will be reviewed by High Command soon. Do not ask for updates.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-10 py-4 bg-gsrp-orange hover:bg-gsrp-orange-light text-white font-black rounded-2xl transition-all shadow-xl shadow-gsrp-orange/20 scale-105 hover:scale-110"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up pb-24 px-6">
      <Head>
        <title>Apply for Staff | GSRP Dashboard</title>
      </Head>

      <div className="mb-12 p-12 rounded-[2.5rem] bg-card-gradient border border-white/20 relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/20 to-gsrp-teal/20 opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-white font-black text-4xl md:text-5xl flex items-center gap-6">
              <FileText className="text-gsrp-orange w-12 h-12" />
              Staff Application
            </h1>
            <div className="bg-gsrp-dark-surface px-6 py-3 rounded-2xl border border-white/20 shadow-xl">
              <span className="text-gsrp-orange font-black text-2xl">{step}</span>
              <span className="text-white/20 font-black text-2xl mx-2">/</span>
              <span className="text-white/60 font-black text-2xl">{totalSteps}</span>
            </div>
          </div>
          
          <div className="w-full bg-gsrp-dark-surface h-3 rounded-full overflow-hidden mb-8 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-gsrp-orange to-gsrp-warm transition-all duration-700 ease-out shadow-[0_0_15px_rgba(255,100,0,0.5)]" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="px-4 py-1.5 rounded-full bg-gsrp-orange/20 border border-gsrp-orange/30 text-gsrp-orange text-[10px] font-black uppercase tracking-[0.2em]">
              Section {step}
            </div>
            <h2 className="text-white font-black text-xl uppercase tracking-widest">
              {STEP_TITLES[step-1]}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
              <ShieldCheck className="text-gsrp-teal w-6 h-6 shrink-0" />
              <p className="text-white/70 text-sm font-bold leading-tight">Rank Lieutenant+ required in-game for eligibility.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
              <HelpCircle className="text-gsrp-orange w-6 h-6 shrink-0" />
              <p className="text-white/70 text-sm font-bold leading-tight">Strict SPaG & Professionalism is mandatory on duty.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gsrp-dark-card rounded-[3rem] border border-white/20 p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-gsrp-orange" />
        
        {step === 1 && (
          <div className="animate-fade-in-right">
            <QuestionLabel subtitle="Discord account currently logged in.">Discord username</QuestionLabel>
            <input type="text" value={session.user.name} disabled className="w-full bg-gsrp-dark-surface border border-white/10 rounded-2xl px-5 py-4 text-white font-black opacity-40 cursor-not-allowed mb-8 text-lg" />

            <QuestionLabel subtitle="Username, not display name.">Roblox username</QuestionLabel>
            <Input name="roblox_username" placeholder="Enter your Roblox username" trackEvent={trackEvent} value={answers.roblox_username || ''} onChange={handleInputChange} />

            <QuestionLabel subtitle="What rank are you in game (e.g. Major, Commander etc.)">In game PD rank?</QuestionLabel>
            <Input name="pd_rank" placeholder="Enter your PD rank" trackEvent={trackEvent} value={answers.pd_rank || ''} onChange={handleInputChange} />
            
            <QuestionLabel>What is your Time zone?</QuestionLabel>
            <TextArea name="timezone" placeholder="e.g. EST, GMT-5, GMT+1" trackEvent={trackEvent} value={answers.timezone || ''} onChange={handleInputChange} />
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-right">
            <QuestionLabel sentences={2} subtitle="Elaborate, What is RDM? What may be a valid punishment?">Explain RDM</QuestionLabel>
            <TextArea name="explain_rdm" placeholder="Detailed response here..." sentences={2} trackEvent={trackEvent} value={answers.explain_rdm || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="Elaborate, What is VDM? What may be a valid punishment?">Explain VDM</QuestionLabel>
            <TextArea name="explain_vdm" placeholder="Detailed response here..." sentences={2} trackEvent={trackEvent} value={answers.explain_vdm || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="Elaborate, What is FRP? What may be a valid punishment?">Explain FRP</QuestionLabel>
            <TextArea name="explain_frp" placeholder="Detailed response here..." sentences={2} trackEvent={trackEvent} value={answers.explain_frp || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="Elaborate, What is LTAP? What may be a valid punishment?">Explain LTAP</QuestionLabel>
            <TextArea name="explain_ltap" placeholder="Detailed response here..." sentences={2} trackEvent={trackEvent} value={answers.explain_ltap || ''} onChange={handleInputChange} />
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-right">
            <QuestionLabel sentences={2} subtitle="A player is shooting inside civilian spawn safezone. What would you do?">Scenario 1: Safezone Shooting</QuestionLabel>
            <TextArea name="scenario_1" placeholder="Describe your actions..." sentences={2} trackEvent={trackEvent} value={answers.scenario_1 || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="A police officer is arresting criminals via the 'arrest' button only. What is this?">Scenario 2: Button Arresting</QuestionLabel>
            <TextArea name="scenario_2" placeholder="Describe your actions..." sentences={2} trackEvent={trackEvent} value={answers.scenario_2 || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="A sniper on a roof is killing people for no reason. What would you do?">Scenario 3: RDM Sniper</QuestionLabel>
            <TextArea name="scenario_3" placeholder="Describe your actions..." sentences={2} trackEvent={trackEvent} value={answers.scenario_3 || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="A player is spamming stop sticks. What is this and what would you do?">Scenario 4: Stop Stick Spam</QuestionLabel>
            <TextArea name="scenario_4" placeholder="Describe your actions..." sentences={2} trackEvent={trackEvent} value={answers.scenario_4 || ''} onChange={handleInputChange} />

            <QuestionLabel sentences={2} subtitle="A player does not respond for 2+ minutes on a mod call. Decision?">Scenario 5: No Response</QuestionLabel>
            <TextArea name="scenario_5" placeholder="Describe your actions..." sentences={2} trackEvent={trackEvent} value={answers.scenario_5 || ''} onChange={handleInputChange} />
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in-right">
            <QuestionLabel subtitle="A player is threatening to jump off a building, first instinct?">Scenario 6: Life Threats</QuestionLabel>
            <Input name="scenario_6" placeholder="Your immediate action..." trackEvent={trackEvent} value={answers.scenario_6 || ''} onChange={handleInputChange} />

            <QuestionLabel subtitle="A player is bypassing the roblox filter with swear words. Decision?">Scenario 7: Filter Bypass</QuestionLabel>
            <Input name="scenario_7" placeholder="Your decision..." trackEvent={trackEvent} value={answers.scenario_7 || ''} onChange={handleInputChange} />

            <QuestionLabel subtitle="You see a player clearly exploiting. What would you do?">Scenario 8: Exploiting</QuestionLabel>
            <Input name="scenario_8" placeholder="Your action..." trackEvent={trackEvent} value={answers.scenario_8 || ''} onChange={handleInputChange} />
          </div>
        )}

        {step === 5 && (
          <div className="animate-fade-in-right">
            <QuestionLabel>Do you understand that moderation can become tiring and frustrating?</QuestionLabel>
            <RadioGroup name="agree_workload" options={["Yes I do, and I am ready for it.", "I don't think I can do that"]} value={answers.agree_workload} onChange={(val) => handleRadioChange('agree_workload', val)} />

            <QuestionLabel>Utmost SPaG and professionalism is strictly required. Do you understand?</QuestionLabel>
            <RadioGroup name="agree_spag" options={["I do", "I cannot do that."]} value={answers.agree_spag} onChange={(val) => handleRadioChange('agree_spag', val)} />

            <QuestionLabel>Do you understand the 4 hour weekly quota requirement?</QuestionLabel>
            <RadioGroup name="agree_quota" options={["Yes", "No"]} value={answers.agree_quota} onChange={(val) => handleRadioChange('agree_quota', val)} />

            <QuestionLabel required={false} subtitle="Optional. Updates result in blacklist.">Final Questions or Comments?</QuestionLabel>
            <Input name="final_questions" placeholder="Optional..." required={false} trackEvent={trackEvent} value={answers.final_questions || ''} onChange={handleInputChange} />

            <QuestionLabel>Do you agree to NOT ask when your application will be read?</QuestionLabel>
            <RadioGroup name="agree_no_ask" options={["Yes", "No"]} value={answers.agree_no_ask} onChange={(val) => handleRadioChange('agree_no_ask', val)} />

            <QuestionLabel>Melonly Familiarity (1 = Beginner, 5 = Expert)</QuestionLabel>
            <div className="grid grid-cols-5 gap-4 mb-10">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleRadioChange('melonly_familiarity', num.toString())}
                  className={`py-6 rounded-2xl font-black text-2xl transition-all border-2 ${answers.melonly_familiarity === num.toString() ? 'bg-gsrp-orange border-gsrp-orange text-white shadow-xl shadow-gsrp-orange/20 scale-105' : 'bg-gsrp-dark-surface border-white/5 text-white/40 hover:text-white hover:border-white/20'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            <div className="p-8 rounded-[2rem] bg-gsrp-orange/5 border-2 border-gsrp-orange/20 mb-8 shadow-inner">
              <p className="text-sm text-gsrp-orange font-black uppercase tracking-[0.2em] text-center leading-relaxed">
                This is the end of the application. Please ensure all your responses are final before submitting.
              </p>
            </div>
            
            <QuestionLabel>Final Confirmation</QuestionLabel>
            <RadioGroup name="proceed" options={["I am ready to submit!"]} value={answers.proceed} onChange={(val) => handleRadioChange('proceed', val)} />
          </div>
        )}

        <div className="flex items-center justify-between mt-16 pt-10 border-t border-white/10">
          {step > 1 ? (
            <button 
              type="button"
              onClick={prevStep}
              className="flex items-center gap-4 px-10 py-5 bg-gsrp-dark-surface border border-white/20 text-white font-black rounded-2xl hover:bg-gsrp-dark-surface/80 transition-all hover:-translate-x-2 shadow-xl"
            >
              <ArrowLeft size={24} />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button 
              type="button"
              onClick={nextStep}
              className="flex items-center gap-4 px-10 py-5 bg-gsrp-orange text-white font-black rounded-2xl hover:bg-gsrp-orange-light transition-all hover:translate-x-2 shadow-[0_10px_25px_rgba(255,100,0,0.3)]"
            >
              Next Step
              <ArrowRight size={24} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting || !answers.proceed}
              className={`flex items-center gap-4 px-12 py-5 font-black rounded-2xl transition-all shadow-2xl
                ${isSubmitting || !answers.proceed
                  ? 'bg-gsrp-dark-surface text-white/20 cursor-not-allowed border border-white/10' 
                  : 'bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white hover:shadow-gsrp-orange/40 hover:scale-105 active:scale-95'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={24} />
                  Submit Application
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-5 p-6 rounded-2xl bg-red-500/10 border-2 border-red-500/20 text-red-500 text-base font-black mt-10 animate-bounce">
            <AlertCircle size={24} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
