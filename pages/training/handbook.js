import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Loader2, BookOpen, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';

const sections = [
  { id: 'overview', num: 'Overview', title: 'GSRP Staff Handbook' },
  { id: 'guidelines', num: 'Section 1', title: 'General Guidelines' },
  { id: 'shifts', num: 'Section 1 — Shifts', title: 'Shift Types' },
  { id: 'vehicles', num: 'Section 1 — Vehicles', title: 'Banned Vehicles' },
  { id: 'punishments', num: 'Section 2', title: 'In-Game Punishment Guide' },
  { id: 'warnings', num: 'Section 2 — Warnings', title: 'Warning-Level Offences' },
  { id: 'kicks', num: 'Section 2 — Kicks', title: 'Kick-Level Offences' },
  { id: 'bans', num: 'Section 2 — Bans', title: 'Ban-Level Offences' },
  { id: 'staff-disc', num: 'Section 3', title: 'Staff Disciplinary System' },
  { id: 'escalation', num: 'Section 4', title: 'Infraction Escalation System' },
  { id: 'custom-commands', num: 'Section 5', title: 'Custom Commands' },
];

const handbookContent = {
  overview: {
    content: `Welcome to the Georgia State Roleplay Staff Team. Whether you're just starting out or you've been with us for a while, this guide is your go-to reference for what's expected, how to act, and how to handle situations in-game and in the community.

Being a staff member means you are trusted with maintaining order, fairness, and roleplay quality. This document outlines all staff protocols, punishments, and behavior standards.`,
    warn: 'Confidential. Sharing or leaking any part of this document will result in a ban from the community.'
  },
  guidelines: {
    content: `When you're on duty, you are expected to act professionally at all times. The core rules are:

• Follow all in-game traffic and roleplay laws while performing staff duties
• Emergency lights and sirens are only permitted when absolutely necessary
• Reckless driving is not tolerated under any circumstances
• Moderation only begins when there are 20 or more players in the server
• The :h and :m commands are prohibited below 20 players unless given special permission
• All server-wide announcements must use official clipboard templates
• Do not teleport to High Ranks without requesting permission via :pm first
• When dealing with reports, always aim for fairness — if no evidence is available, de-escalate and issue a verbal warning
• Staff must use proper spelling, punctuation, and grammar in all public channels and in-game communication
• Always use common sense. High Ranks have final say on all matters
• Never argue with or ignore directions from High Ranks
• Staff members may carry guns — anyone below SHR must use a handgun only. SHR may use automated rifles
• On-duty staff are prohibited from using undercover plates
• Custom :h or :m commands are not allowed for anyone below HR. Supervisors may only do custom :h commands`,
    callout: 'Command character minimum: You must always use 4 or more characters (letters or numbers) when using a command on another player.'
  },
  shifts: {
    content: `Regular Shift — All staff — Yes (official liveries) — Standard on-duty moderation. Full staff uniform and liveries required. Must maintain proper SPaG at all times.

50/50 Shift — Administrators+ — No — Undercover moderation while actively roleplaying. Must still answer all mod calls like a regular staff member. Staff liveries and uniforms not required.

Returning from Retirement:
• Under 1 week → 1 rank demotion
• Over 1 week → 2 rank demotions
• Over 3 weeks → 3 rank demotions
• Over 1 month → Back to Junior Moderator`
  },
  vehicles: {
    content: `The following vehicles are restricted to Foundership only unless otherwise noted:

• Chevlon Corbeta RZR 2014
• Metro Transit Bus
• Forklift (Directorship+ may use)
• Fuel Tanker (Staff may use)
• Prisoner Transport Bus (requires Directorship+ permission)
• 4-Wheeler
• Strugatti Ettore 2020
• Falcon Heritage 2021
• Lawn Mower
• Canyon Descender
• Pea Car 2025
• Falcon Heritage Track 2022
• Kovac Heladera 2023`
  },
  punishments: {
    content: `Use this guide to ensure fairness and consistency when moderating player behaviour. Punishments must be proportionate to the offence. Over-punishing minor offences will result in internal consequences.`
  },
  warnings: {
    content: `The following offences should be handled with an in-game Warning:

• Random Deathmatch (RDM)
• Vehicle Deathmatch (VDM)
• Fail Roleplay
• GTA Driving
• New Life Rule (NLR) violation
• Meta Gaming
• Cuff or Tow Rushing
• Tool Abuse
• Member Disrespect`
  },
  kicks: {
    content: `The following offences warrant a Kick from the server:

• Staff Disrespect
• No Intent to Roleplay
• Abusing the !mod system
• Staff Evasion
• Staff Scene Interference
• Staff RDM or VDM
• Safezone RDM`
  },
  bans: {
    content: `The following offences require a Ban:

• LTAP — Leave To Avoid Punishment
• NSFW or inappropriate content
• Violation of Roblox or Discord Terms of Service
• Impersonating Staff
• Exploiting or using third-party software
• Ban Evading
• Inappropriate or offensive usernames
• Obvious trolling (Mass RDM or VDM etc.)`
  },
  'staff-disc': {
    content: `Staff members are expected to uphold a higher standard than regular players. Misuse of powers, poor behaviour, or negligence will result in the following:

• Staff Warning — Disrespect to members/staff, incorrect punishments, failing to respond to mod calls, breaking RP, improper driving, 3-2-1 letter commands as JM
• Staff Strike — Disrespect toward High Ranks, unauthorised :h/:m commands, abusing moderation tools, failing weekly 3-hour activity quota, farming shift hours
• Staff Suspension — 3 strikes received, full abuse of all commands, mass disrespect, 3-2-1 letter commands as Moderator+
• Termination — 3 suspensions, breaking ToS, major disrespect to leadership, leaking internal info, raiding, advertising, using AI on applications, leaking this document, targeted harassment`
  },
  escalation: {
    content: `3 warnings → Strike | 3 strikes → Suspension & Demotion | 3 suspensions → Termination | 3 terminations → Full Blacklist

Appeal Windows:
• Warning — Yes, within 7 days of issue
• Strike — Yes, within 7 days of issue
• Suspension — Not appealable
• Termination — Not appealable
• Blacklist — Not appealable`
  },
  'custom-commands': {
    content: `Custom commands for moderation`,
    table: [
      ['rdm', 'Random Death Match', ';rdm', 'Warning, Kick, Ban'],
      ['vdm', 'Vehicle Death Match', ';vdm', 'Warning, Kick, Ban'],
      ['frp', 'Failing to Roleplay', ';frp', 'Warning, Kick, Ban'],
      ['nlr', 'New Life Rule', ';nlr', 'Warning, Kick, Ban'],
      ['gta', 'GTA Driving', ';gta', 'Warning, Kick, Ban'],
      ['cuff_rushing', 'Cuff Rushing', ';cuff, ;cuff_rushing', 'Kick, Ban'],
      ['trolling', 'Trolling', ';trolling, ;troll', 'Kick, Ban'],
      ['staff_disrespect', 'Staff Disrespect', ';sd, ;staff_disrespect', 'Warning, Kick, Ban'],
      ['nitrp', 'No Intention to Roleplay', ';nitrp', 'Kick, Ban'],
      ['abusing_mod', 'Abusing !mod System', ';abusing_mod, ;abuse_mod', 'Verbal Warning, Warning, Kick'],
      ['staff_evasion', 'Staff Evasion', ';staff_evasion', 'Kick, Ban'],
      ['staff_vdm', 'Staff VDM / RDM', ';staff_vdm, ;svdm', 'Kick, Ban'],
      ['mass_vdm', 'Mass VDM / RDM', ';mass_vdm', 'Ban'],
      ['safezone', 'Safezone RDM / VDM', ';safezone', 'Kick, Ban'],
      ['reset_avoid', 'Reset to Avoid Punishment', ';reset_avoid, ;rtap', 'Ban'],
      ['leave_avoid', 'Leaving to Avoid Punishment', ';leave_avoid, ;ltap', 'Ban'],
      ['nsfw', 'Not Safe for Work', ';nsfw', 'Ban'],
      ['tos', 'Terms of Service', ';tos', 'Ban'],
      ['staff_impersonation', 'Staff Impersonation', ';staff_impersonation', 'Ban'],
      ['banned_rp', 'Banned Roleplays', ';banned_rp', 'Ban'],
      ['rtap', 'RTAP / ST-TAP', ';rtap', 'Ban'],
      ['hacking', 'Cheating / Exploiting', ';hacking, ;cheating', 'Ban'],
      ['mass_staff_evasion', 'Mass Staff Evasion', ';mass_staff_evasion', 'Ban'],
      ['troll_username', 'Troll Username', ';troll_username', 'Ban'],
      ['bypassing', 'Bypassing', ';bypassing', 'Ban'],
    ]
  }
};

  export default function HandbookPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [progress, setProgress] = useState({ completedSections: [], handbookCompleted: false });
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || accessDenied) return;
    async function fetchProgress() {
      try {
        const res = await fetch('/api/training/progress');
        const data = await res.json();
        setProgress(data);
      } catch (e) {
        console.error('Failed to fetch progress', e);
      } finally {
        setLoadingProgress(false);
      }
    }
    if (effectiveSession) fetchProgress();
  }, [status, hasRefreshed, accessDenied, effectiveSession]);

  const toggleSection = async (sectionId) => {
    if (!effectiveSession?.user?.roles?.includes('1372476380096237609')) return;
    try {
      const res = await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId })
      });
      const data = await res.json();
      setProgress(data);
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  useEffect(() => {
    if (progress.handbookCompleted && !loadingProgress) {
      setShowCompletion(true);
    }
  }, [progress.handbookCompleted, loadingProgress]);

  useEffect(() => {
    // Handle URL hash on page load
    const hash = router.asPath.split('#')[1];
    if (hash && sections.find(s => s.id === hash)) {
      setActiveSection(hash);
      setTimeout(() => {
        document.getElementById('hb-' + hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [router.asPath]);

  useEffect(() => {
    const handleScroll = () => {
      const sectionEls = sections.map(s => document.getElementById('hb-' + s.id)).filter(Boolean);
      let active = null;
      sectionEls.forEach(el => {
        if (el.getBoundingClientRect().top < 120) active = el.id.replace('hb-', '');
      });
      if (active) setActiveSection(active);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Handbook</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (accessDenied) {
    return <AccessDenied roleId={accessDenied.roleId} />;
  }

  if (!effectiveSession?.user?.roles?.includes('1372476380096237609') && !effectiveSession?.user?.isAdmin) {
    return <AccessDenied roleId="1372476380096237609" />;
  }

  const section = handbookContent[activeSection];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/training" className="p-2 rounded-lg hover:bg-gsrp-dark-surface/60 text-gsrp-teal-light/40 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">Staff Handbook</h1>
          <p className="text-gsrp-teal-light/40 text-[10px] uppercase tracking-widest">GSRP Staff Standards & Development</p>
        </div>
      </div>

      {showCompletion && (
        <div className="mb-6 p-4 bg-gsrp-teal/10 border border-gsrp-teal/30 rounded-2xl flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-gsrp-teal-light" />
            <div>
              <p className="text-white font-bold text-sm">All sections completed!</p>
              <p className="text-gsrp-teal-light/60 text-xs">You can now do the SSD quiz</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/training')}
            className="px-5 py-2 bg-gsrp-orange text-white text-sm font-bold rounded-lg hover:bg-gsrp-orange/90 transition-all"
          >
            Go to Quiz →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
       <div className="lg:col-span-1">
         <div className="card-glass rounded-2xl p-4 sticky top-20">
           <div className="mb-4">
             <div className="flex justify-between items-center mb-2">
               <h3 className="text-[10px] font-black text-gsrp-teal-light/40 uppercase tracking-widest">Progress</h3>
               <span className="text-[10px] font-mono text-gsrp-orange font-bold">
                 {Math.round((progress.completedSections.length / sections.length) * 100)}%
               </span>
             </div>
             <div className="h-1 w-full bg-gsrp-dark-border rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gsrp-orange transition-all duration-500" 
                 style={{ width: `${(progress.completedSections.length / sections.length) * 100}%` }}
               />
             </div>
           </div>
           <h3 className="text-[10px] font-black text-gsrp-teal-light/40 uppercase tracking-widest mb-3 pb-2 border-b border-gsrp-dark-border/50">Contents</h3>
           <nav className="space-y-0.5">
             {sections.map(s => (
               <button
                 key={s.id}
                 onClick={() => {
                   setActiveSection(s.id);
                   router.push(router.asPath.split('#')[0] + '#' + s.id, undefined, { shallow: true });
                   document.getElementById('hb-' + s.id)?.scrollIntoView({ behavior: 'smooth' });
                 }}
                 className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                   activeSection === s.id
                     ? 'bg-gsrp-teal/10 text-gsrp-teal-light border border-gsrp-teal/20'
                     : 'text-gsrp-teal-light/40 hover:text-white hover:bg-gsrp-dark-surface/40'
                 }`}
               >
                 {progress.completedSections.includes(s.id) ? (
                   <CheckCircle2 size={12} className="text-gsrp-orange" />
                 ) : (
                   <Circle size={12} className="text-gsrp-teal-light/20" />
                 )}
                 <span className="text-gsrp-teal-light/30 font-mono text-[10px] mr-1.5">▸</span>
                 {s.title}
               </button>
             ))}
           </nav>
         </div>
       </div>


        <div className="lg:col-span-3 space-y-8">
          {sections.map(s => {
            const content = handbookContent[s.id];
            if (!content) return null;
            return (
               <div key={s.id} id={'hb-' + s.id} className="card-glass rounded-2xl p-6 scroll-mt-24 relative group">
                  <div className="absolute top-4 right-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {effectiveSession?.user?.roles?.includes('1372476380096237609') && (
                     <button
                       onClick={() => toggleSection(s.id)}
                       className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                         progress.completedSections.includes(s.id) 
                           ? 'bg-gsrp-teal/20 text-gsrp-teal-light border border-gsrp-teal/30' 
                           : 'bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 hover:bg-gsrp-orange/30'
                       }`}
                     >
                       {progress.completedSections.includes(s.id) ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                       {progress.completedSections.includes(s.id) ? 'Completed' : 'Mark as Read'}
                     </button>
                   )}
                   <button
                     onClick={() => {
                       const url = window.location.origin + '/training/handbook#' + s.id;
                       navigator.clipboard.writeText(url);
                     }}
                     className="text-xs text-gsrp-teal-light/40 hover:text-gsrp-teal-light px-2 py-1 rounded bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50"
                   >
                     Copy Link
                   </button>
                 </div>
                 <div className="text-[10px] font-black text-gsrp-teal-light/30 uppercase tracking-widest mb-1">{s.num}</div>

                <h2 className="text-white font-bold text-lg mb-4 pb-3 border-b border-gsrp-dark-border/50">{s.title}</h2>
                <div className="text-gsrp-teal-light/60 text-sm leading-relaxed whitespace-pre-line">{content.content}</div>
                {content.table && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gsrp-dark-border/50">
                          <th className="text-left py-2 pr-3 text-gsrp-teal-light/40 font-mono uppercase tracking-wider">Command</th>
                          <th className="text-left py-2 pr-3 text-gsrp-teal-light/40 font-mono uppercase tracking-wider">Label</th>
                          <th className="text-left py-2 pr-3 text-gsrp-teal-light/40 font-mono uppercase tracking-wider">Usage</th>
                          <th className="text-left py-2 text-gsrp-teal-light/40 font-mono uppercase tracking-wider">Punishment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.table.map((row, i) => (
                          <tr key={i} className="border-b border-gsrp-dark-border/30 hover:bg-white/[0.02]">
                            <td className="py-2 pr-3 text-gsrp-teal-light font-mono">{row[0]}</td>
                            <td className="py-2 pr-3 text-white">{row[1]}</td>
                            <td className="py-2 pr-3 text-gsrp-teal-light/60 font-mono text-[10px]">{row[2]}</td>
                            <td className="py-2 text-gsrp-teal-light/60">{row[3]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {content.callout && (
                  <div className="mt-4 bg-gsrp-teal/10 border border-gsrp-teal/20 border-l-3 border-l-gsrp-teal rounded-xl p-4">
                    <p className="text-gsrp-teal-light text-sm">{content.callout}</p>
                  </div>
                )}
                {content.warn && (
                  <div className="mt-4 bg-gsrp-gold/10 border border-gsrp-gold/20 border-l-3 border-l-gsrp-gold rounded-xl p-4">
                    <p className="text-gsrp-gold text-sm"><strong>Warning:</strong> {content.warn}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth');
  const { authOptions } = require('../../lib/auth-options');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476380096237609');
  const { isFullAdmin } = require('../../lib/admin-helper');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  
  // Only redirect if we have roles data in the session AND neither condition is met.
  // If roles are absent from the JWT (e.g. role was assigned after last login),
  // let the client-side UserRefreshContext handle the access check with fresh Discord data.
  if ((session.user?.roles?.length > 0 || isAdmin) && !hasRole && !isAdmin) {
    return { redirect: { destination: '/', permanent: false } };
  }

  return { props: {} };
}
