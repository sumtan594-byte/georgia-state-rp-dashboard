import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import LoginScreen from '../../../components/auth/LoginScreen';
import {
  MessageSquare, Send, Loader2, Brain, Target, CheckCircle,
  XCircle, AlertTriangle, ChevronRight, RotateCcw, Star,
  Trophy, Lightbulb, Shield, ArrowLeft, Play, Award
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const RANDOM_USERNAMES = [
  'xXDragonSlayer99Xx', 'ProGamer_2024', 'NoobMaster69', 'CoolKid_RBLX',
  'SpeedRacer_EU', 'ShadowKnight_X', 'LunaStar_2024', 'BlazeFury',
  'IceQueen_RP', 'ThunderBolt_77', 'NightHawk_RBLX', 'SilverWolf_99',
  'CrimsonTide_X', 'GoldenEagle_21', 'StormBreaker_RP', 'PhantomRider',
  'DarkViper_2024', 'CrystalMage_X', 'FireStorm_77', 'AquaMarine_RP'
];

const SCENARIO_TYPES = [
  {
    type: 'RDM',
    label: 'Random Deathmatch',
    openers: [
      "Hey officer! This guy just shot me outta nowhere! I was literally just walking to my car and BAM he pulls out an AK and starts firing!",
      "MOD CALL! Someone is RDMing in the city! They're just running around shooting everyone with no RP reason at all!",
      "Officer I need help, this player killed me without any roleplay. I was doing a proper traffic stop RP and he just spawned behind me and shot me.",
    ],
    correctActions: ['Ask for video proof/clip', 'Ask if they are in comms', 'Tell them to submit proof in reports channel'],
    wrongActions: ['Ban immediately without proof', 'Accept kill logs as proof', 'Ignore the report'],
  },
  {
    type: 'VDM',
    label: 'Vehicle Deathmatch',
    openers: [
      "Hey! This guy keeps running me over with his truck! Like 5 times already! He's just driving around the parking lot intentionally hitting people!",
      "Can someone help? There's a player in a Chevlon Corbeta just VDMing everyone on the highway. They're not stopping at all!",
      "Officer this person is using their vehicle as a weapon! They keep ramming into players at the dealership. Please do something!",
    ],
    correctActions: ['Ask for video proof', 'Teleport to observe', 'Ask for the suspect username'],
    wrongActions: ['Ban without checking', 'Tell them to just avoid the player', 'Accept screenshots only'],
  },
  {
    type: 'FRP',
    label: 'Fail Roleplay',
    openers: [
      "Hey mod, this guy is driving his supercar straight up a vertical mountain. That's not even possible in real life! Total FRP.",
      "Can someone check this player? They're flying around on a motorcycle doing tricks in the sky. That's not realistic RP at all.",
      "Officer! Someone is roleplaying as a superhero with laser eyes and flying. This is a realistic RP server, this is FRP!",
    ],
    correctActions: ['Ask for proof/clip', 'Ask what specifically they are doing', 'Explain the FRP rule to the reporter'],
    wrongActions: ['Ban immediately', 'Tell them it is fine', 'Ignore because it seems harmless'],
  },
  {
    type: 'NITRP',
    label: 'No Intent to Roleplay',
    openers: [
      "Hey there's this player who keeps chasing cops and trolling. They're not doing any RP at all, just running around making noise and disrupting everyone.",
      "MOD! This guy joined and is just spamming in chat, following people around, and ruining RP scenes. No intent to RP at all.",
      "Officer can you help? Someone is just driving around blasting music and running through RP scenes. They're clearly here to troll.",
    ],
    correctActions: ['Ask for proof', 'Ask suspect username', 'Tell them to submit in reports channel'],
    wrongActions: ['Ban without evidence', 'Tell them to ignore it', 'Kick the reporter by mistake'],
  },
  {
    type: 'LTAP',
    label: 'Leave To Avoid Punishment',
    openers: [
      "Hey! This guy just left the server right before you were gonna arrest him! He combat logged to avoid the punishment!",
      "Officer the suspect just disconnected! They left to avoid being banned. Can you still action them?",
      "MOD CALL - the player I was reporting just left the server. They clearly LTAP'd to avoid getting punished.",
    ],
    correctActions: ['Check server logs', 'Ask for the username', 'Ban if logs confirm'],
    wrongActions: ['Ignore because they left', 'Ask for video proof only', 'Tell them nothing can be done'],
  },
  {
    type: 'NLR',
    label: 'New Life Rule',
    openers: [
      "Hey this guy died and then immediately came back to the same spot for revenge! That's breaking the New Life Rule!",
      "Officer! Someone just respawned and ran straight back to where they died to continue fighting. NLR violation!",
      "Can you check this? Player died, respawned, and is now back at the exact same location trying to kill the same person. NLR!",
    ],
    correctActions: ['Ask for proof', 'Explain NLR to the reporter', 'Warn the offending player'],
    wrongActions: ['Ban immediately', 'Say NLR is not a rule', 'Ignore the report'],
  },
  {
    type: 'VOL',
    label: 'Value of Life',
    openers: [
      "Hey this guy has a gun pointed at him and he's just running away laughing! No value of life at all!",
      "Officer! Someone pulled a gun on this player and they just pulled out their own gun and started shooting. No VOL!",
      "MOD! This person is being robbed and instead of putting their hands up they're fighting back with no fear. VOL violation!",
    ],
    correctActions: ['Ask for proof/clip', 'Ask for suspect username', 'Warn about VOL rules'],
    wrongActions: ['Ignore it', 'Say VOL is not enforced', 'Ban without checking'],
  },
  {
    type: 'TROLLING',
    label: 'Trolling',
    openers: [
      "Hey there's a player who's just trolling in the server. They're spamming emotes, blocking roads, and ruining everyone's RP.",
      "MOD CALL! Someone is intentionally disrupting RP scenes by making loud noises and driving recklessly. Pure trolling.",
      "Officer this guy is just here to cause chaos. He's spawning cars in the middle of the road and blocking traffic. Please help!",
    ],
    correctActions: ['Ask for proof', 'Ask suspect username', 'Kick if confirmed'],
    wrongActions: ['Ban immediately without proof', 'Tell them to deal with it', 'Ignore'],
  },
];

const COMMON_QUESTIONS = [
  {
    keywords: ['can i get mod', 'how to get mod', 'become mod', 'apply mod', 'mod perms'],
    response: "Oh I don't handle applications, but you can apply in our Discord! The code is GSRP7 to get in.",
  },
  {
    keywords: ['how do i join staff', 'join staff team', 'become staff', 'staff application', 'how to apply'],
    response: "You can apply for staff in our Discord server! Use the code GSRP7 to join the comms and look for the application channel.",
  },
  {
    keywords: ['rp perms', 'roleplay perms', 'rp permissions', 'can i get rp'],
    response: "Yes! Just tell me how long you need and what kind of RP, and I'll log it for you.",
  },
  {
    keywords: ['what is rdm', 'rdm rule', 'what does rdm mean'],
    response: "RDM is Random Deathmatch - killing or shooting players without any prior roleplay context or valid reason. It's against the rules!",
  },
  {
    keywords: ['what is vdm', 'vdm rule', 'what does vdm mean'],
    response: "VDM is Vehicle Deathmatch - using a vehicle as a weapon to repeatedly ram or run over players. Not allowed here!",
  },
  {
    keywords: ['what is frp', 'frp rule', 'fail rp', 'what does frp mean'],
    response: "FRP is Fail Roleplay - performing actions unrealistic to real life. Like driving a supercar up a vertical mountain!",
  },
  {
    keywords: ['what is nlr', 'nlr rule', 'new life', 'what does nlr mean'],
    response: "NLR is New Life Rule - when you die, you must forget your past life and cannot return to your death location for revenge.",
  },
  {
    keywords: ['what is vol', 'vol rule', 'value of life', 'what does vol mean'],
    response: "VOL is Value of Life - acting realistically when threatened. Like putting your hands up if someone has a gun pointed at you.",
  },
  {
    keywords: ['what is nitrp', 'nitrp rule', 'no intent', 'what does nitrp mean'],
    response: "NITRP is No Intent to Roleplay - joining a dedicated RP server purely to troll, chase, or disrupt players.",
  },
  {
    keywords: ['what is ltap', 'ltap rule', 'leave to avoid', 'what does ltap mean'],
    response: "LTAP is Leave To Avoid Punishment - combat logging or leaving the server right before a cop arrests you or a mod bans you.",
  },
  {
    keywords: ['what is sts', 'shoulder to shoulder', 'sts meaning'],
    response: "STS is Shoulder to Shoulder - a command for players/officers to line up side-by-side for briefings or inspections.",
  },
  {
    keywords: ['what is pts', 'permission to speak', 'pts meaning'],
    response: "PTS is Permission to Speak - used during formal lineups or trainings. You can't talk in chat until granted PTS.",
  },
  {
    keywords: ['what is mdt', 'mobile data terminal', 'mdt meaning'],
    response: "MDT is Mobile Data Terminal - the in-game computer system used by Police/Sheriff/Fire teams to log warrants and view calls.",
  },
  {
    keywords: ['what is gm', 'gun motion', 'ngm', 'gm meaning'],
    response: "(N)GM is (No) Gun Motion - typing out your physical actions in chat before pulling out a weapon. Like '/me unholsters Glock'.",
  },
  {
    keywords: ['discord', 'discord link', 'discord server', 'discord invite'],
    response: "The Discord code is GSRP7! You can use that to join our server.",
  },
  {
    keywords: ['comms code', 'server code', 'join code', 'code'],
    response: "The comms code is GSRP7!",
  },
];

const PUNISHMENT_GUIDELINES = {
  'RDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'VDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'FRP': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'NLR': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'NITRP': { 1: 'Kick', 2: 'Ban', 3: '—' },
  'LTAP': { 1: 'Ban', 2: '—', 3: '—' },
  'TROLLING': { 1: 'Kick', 2: 'Ban', 3: '—' },
  'VOL': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
};

export default function ScenarioTrainingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phase, setPhase] = useState('loading');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [totalScenarios, setTotalScenarios] = useState(5);
  const [scores, setScores] = useState([]);
  const [hints, setHints] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [decisionPopup, setDecisionPopup] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [results, setResults] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      checkCompletion();
    }
  }, [status]);

  async function checkCompletion() {
    try {
      const res = await fetch('/api/training/scenario/status');
      const data = await res.json();
      if (data.completed) {
        setAlreadyCompleted(true);
        setCompletionData(data.data);
        setPhase('completed');
      } else {
        setPhase('intro');
      }
    } catch {
      setPhase('intro');
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, decisionPopup]);

  async function startSession() {
    setLoading(true);
    try {
      const res = await fetch('/api/training/scenario/start', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSessionId(data.sessionId);
        setTotalScenarios(data.totalScenarios);
        setScenarioIndex(0);
        setScores([]);
        setMessages([]);
        setChatHistory([]);
        setCurrentScenario(data.scenario);
        setPhase('chat');
        setMessages([
          { role: 'ai', content: data.scenario.opener, timestamp: Date.now() },
        ]);
        setChatHistory([{ role: 'user', content: data.scenario.opener }]);
        setHints(data.scenario.hints || []);
        setShowHint(false);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    }
    setLoading(false);
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/training/scenario/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text.trim(),
          chatHistory: [...chatHistory, { role: 'user', content: text.trim() }],
          scenario: currentScenario,
        }),
      });
      const data = await res.json();

      if (data.decision) {
        setDecisionPopup(data.decision);
        setMessages(prev => [...prev, { role: 'ai', content: data.response, timestamp: Date.now() }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: data.response, timestamp: Date.now() }]);
      }

      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: text.trim() },
        { role: 'ai', content: data.response },
      ]);

      if (data.score !== undefined) {
        setScores(prev => [...prev, { scenario: currentScenario.type, score: data.score, maxScore: data.maxScore, feedback: data.feedback }]);
      }

      if (data.nextScenario) {
        setTimeout(() => {
          setCurrentScenario(data.nextScenario);
          setScenarioIndex(prev => prev + 1);
          setMessages(prev => [...prev, {
            role: 'system',
            content: `--- Scenario ${scenarioIndex + 2} of ${totalScenarios} ---`,
            timestamp: Date.now(),
          }, {
            role: 'ai',
            content: data.nextScenario.opener,
            timestamp: Date.now(),
          }]);
          setChatHistory([{ role: 'user', content: data.nextScenario.opener }]);
          setHints(data.nextScenario.hints || []);
          setShowHint(false);
          setDecisionPopup(null);
        }, 1500);
      }

      if (data.ended) {
        setTimeout(() => submitResults(), 2000);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'system', content: 'Error sending message. Please try again.', timestamp: Date.now() }]);
    }
    setLoading(false);
  }

  async function handleDecision(action) {
    if (!decisionPopup) return;
    setDecisionPopup(null);
    setLoading(true);

    try {
      const res = await fetch('/api/training/scenario/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: `[DECISION:${action}]`,
          chatHistory,
          scenario: currentScenario,
          decisionAction: action,
        }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'system',
        content: `You chose: ${action}`,
        timestamp: Date.now(),
      }]);
      setMessages(prev => [...prev, { role: 'ai', content: data.response, timestamp: Date.now() }]);

      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `[DECISION:${action}]` },
        { role: 'ai', content: data.response },
      ]);

      if (data.score !== undefined) {
        setScores(prev => [...prev, { scenario: currentScenario.type, score: data.score, maxScore: data.maxScore, feedback: data.feedback }]);
      }

      if (data.nextScenario) {
        setTimeout(() => {
          setCurrentScenario(data.nextScenario);
          setScenarioIndex(prev => prev + 1);
          setMessages(prev => [...prev, {
            role: 'system',
            content: `--- Scenario ${scenarioIndex + 2} of ${totalScenarios} ---`,
            timestamp: Date.now(),
          }, {
            role: 'ai',
            content: data.nextScenario.opener,
            timestamp: Date.now(),
          }]);
          setChatHistory([{ role: 'user', content: data.nextScenario.opener }]);
          setHints(data.nextScenario.hints || []);
          setShowHint(false);
        }, 1500);
      }

      if (data.ended) {
        setTimeout(() => submitResults(), 2000);
      }
    } catch (err) {
      console.error('Decision error:', err);
    }
    setLoading(false);
  }

  async function submitResults() {
    try {
      const res = await fetch('/api/training/scenario/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scores }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(data.results);
        setPhase('results');
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  }

  if (status === 'loading' || (phase === 'loading')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Scenario Training</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (alreadyCompleted && phase === 'completed') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-gsrp-orange" />
            Scenario Training
          </h1>
          <p className="text-gray-400 text-sm mt-1">You have already completed this training module.</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-8 text-center">
          <Trophy className="w-16 h-16 text-gsrp-orange mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Training Complete!</h2>
          <p className="text-gray-400 mb-6">You completed this training on {new Date(completionData?.completedAt).toLocaleDateString()}.</p>
          {completionData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total Score</p>
                <p className="text-2xl font-bold text-white">{completionData.totalScore}/{completionData.maxScore}</p>
              </div>
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-gsrp-orange">{completionData.percentage}%</p>
              </div>
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Scenarios</p>
                <p className="text-2xl font-bold text-white">{completionData.scenariosCompleted}</p>
              </div>
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className={`text-2xl font-bold ${completionData.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {completionData.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => router.push('/training')}
            className="px-6 py-3 bg-gsrp-orange/10 text-gsrp-orange rounded-xl font-semibold hover:bg-gsrp-orange/20 transition-colors cursor-pointer"
          >
            Back to Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-gsrp-orange" />
            Scenario Training
          </h1>
          <p className="text-gray-400 text-sm mt-1">Practice handling real in-game moderation scenarios with AI-powered roleplay.</p>
        </div>

        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gsrp-orange/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-gsrp-orange" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">How It Works</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                You'll interact with an AI that acts as a regular player reporting rule violations. Respond as a staff member would in real situations.
                The AI will evaluate your responses and provide feedback at the end.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <Target className="w-5 h-5 text-gsrp-teal mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">{totalScenarios} Scenarios</h3>
              <p className="text-xs text-gray-500">Covering RDM, VDM, FRP, NLR, LTAP, and more</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <Lightbulb className="w-5 h-5 text-gsrp-gold mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">Hints Available</h3>
              <p className="text-xs text-gray-500">Use hints if you get stuck on a scenario</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-gsrp-sunset mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">Decision Points</h3>
              <p className="text-xs text-gray-500">Choose actions like Warn, Kick, or Ban</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <Award className="w-5 h-5 text-gsrp-orange mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">One Attempt</h3>
              <p className="text-xs text-gray-500">This training can only be completed once</p>
            </div>
          </div>

          <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gsrp-gold" />
              Important Rules
            </h3>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li>Always ask for video proof before taking action</li>
              <li>Kill logs are NOT valid proof</li>
              <li>Be professional and follow the chain of command</li>
              <li>Only moderate when there are 20+ players in the server</li>
              <li>Use 4-letter commands while on duty</li>
            </ul>
          </div>

          <button
            onClick={startSession}
            disabled={loading}
            className="w-full py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {loading ? 'Starting...' : 'Start Training'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results' && results) {
    const percentage = Math.round((results.totalScore / results.maxScore) * 100);
    const passed = percentage >= 60;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Award className="w-7 h-7 text-gsrp-orange" />
            Training Results
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's how you performed in the scenario training.</p>
        </div>

        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 md:p-8 mb-6">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
              {passed ? <Trophy className="w-12 h-12 text-green-400" /> : <XCircle className="w-12 h-12 text-red-400" />}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'Congratulations! You Passed!' : 'Training Not Passed'}
            </h2>
            <p className="text-gray-400">
              You scored <span className="text-white font-semibold">{results.totalScore}/{results.maxScore}</span> ({percentage}%)
            </p>
            <p className="text-xs text-gray-500 mt-1">Passing score: 60%</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Scenarios Completed</p>
              <p className="text-xl font-bold text-white">{results.scenariosCompleted}</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Best Scenario</p>
              <p className="text-xl font-bold text-gsrp-orange">{results.bestScenario || '—'}</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Needs Improvement</p>
              <p className="text-xl font-bold text-gsrp-sunset">{results.worstScenario || '—'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-gsrp-gold" />
              What You Did Well
            </h3>
            <div className="space-y-2">
              {results.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-green-400 bg-green-400/5 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gsrp-gold" />
              Areas for Improvement
            </h3>
            <div className="space-y-2">
              {results.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/5 rounded-lg p-3">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">Scenario Breakdown</h3>
            <div className="space-y-3">
              {results.scenarioDetails.map((sd, i) => (
                <div key={i} className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{sd.type}</span>
                    <span className={`text-sm font-bold ${sd.score >= sd.maxScore * 0.7 ? 'text-green-400' : 'text-red-400'}`}>
                      {sd.score}/{sd.maxScore}
                    </span>
                  </div>
                  <div className="h-2 bg-gsrp-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${sd.score >= sd.maxScore * 0.7 ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ width: `${(sd.score / sd.maxScore) * 100}%` }}
                    />
                  </div>
                  {sd.feedback && <p className="text-xs text-gray-500 mt-2">{sd.feedback}</p>}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/training')}
            className="w-full py-3 bg-gsrp-dark-surface text-white rounded-xl font-semibold hover:bg-gsrp-dark-surface/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training Hub
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'chat') {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-gsrp-orange" />
              Scenario Training
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Scenario {scenarioIndex + 1} of {totalScenarios} — {currentScenario?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hints.length > 0 && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-3 py-1.5 bg-gsrp-gold/10 text-gsrp-gold rounded-lg text-xs font-medium hover:bg-gsrp-gold/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Hint
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showHint && hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-gsrp-gold/5 border border-gsrp-gold/20 rounded-xl p-4"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-gsrp-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gsrp-gold mb-1">Training Hint</p>
                  <p className="text-xs text-gray-300">{hints[0]}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => {
              if (msg.role === 'system') {
                return (
                  <div key={i} className="flex justify-center">
                    <span className="text-xs text-gray-600 bg-gsrp-dark-surface/50 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              if (msg.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] bg-gsrp-orange/10 border border-gsrp-orange/20 rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-sm text-white">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gsrp-dark-surface flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-gsrp-teal">🎮</span>
                  </div>
                  <div className="max-w-[80%] bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-gray-200">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gsrp-dark-surface flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gsrp-teal">🎮</span>
                </div>
                <div className="bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <AnimatePresence>
            {decisionPopup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="border-t border-gsrp-dark-border/50 p-4 bg-gsrp-dark-surface/30"
              >
                <p className="text-xs font-semibold text-gsrp-orange mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {decisionPopup.title || 'What action would you like to take?'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {decisionPopup.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleDecision(opt.value)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                        opt.variant === 'danger'
                          ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                          : opt.variant === 'warning'
                          ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20'
                          : opt.variant === 'success'
                          ? 'bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20'
                          : 'bg-gsrp-dark-card text-gray-300 border border-gsrp-dark-border hover:border-gsrp-orange/30 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!decisionPopup && (
            <div className="border-t border-gsrp-dark-border/50 p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your response..."
                  disabled={loading}
                  className="flex-1 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2.5 bg-gsrp-orange/10 text-gsrp-orange rounded-xl hover:bg-gsrp-orange/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export async function getServerSideProps(context) {
  const { isFullAdmin } = require('../../../lib/admin-helper');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476380096237609');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };

  return { props: {} };
}
