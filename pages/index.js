import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Reveal, ShowcaseSections, MediaMarquee } from '../components/landing/LandingMotion';
import {
  Shield, Star, Users, Activity, Building2, Radio, Flame, Siren,
  Car, ArrowRight, CheckCircle2, MessageSquare, Trophy, Sparkles,
  Globe, Lock, ScrollText, Clock, Play,
} from 'lucide-react';

const DISCORD_INVITE = 'https://discord.gg/gsrp7';
const ROBLOX_COMMUNITY = 'https://www.roblox.com/communities/5438941/Georgia-State-Roleplay#!/about';
const BAN_APPEAL = '/ban-appeals';
const SITE_URL = 'https://join-gsrp.com';
const LOGO = '/media/gsrp-logo.png';

const STATS = [
  { icon: Users, value: '9,000+', label: 'Discord Members' },
  { icon: Activity, value: '40+', label: 'Active Players' },
  { icon: Star, value: '4.5 / 5', label: 'Community Rating' },
  { icon: ScrollText, value: '86', label: 'Verified Reviews' },
];

const DEPARTMENTS = [
  { slug: 'police', icon: Shield, name: 'Police Department', desc: 'Patrol the streets of Atlanta City, run traffic stops, and keep the peace with realistic ER:LC police roleplay.' },
  { slug: 'sheriff', icon: Siren, name: "Sheriff's Office", desc: 'Join the Sheriff Team and handle county-wide patrols, pursuits, and high-priority calls.' },
  { slug: 'fire-ems', icon: Flame, name: 'Fire & EMS', desc: 'Respond to fires, crashes, and medical emergencies as a first responder in our ERLC roleplay server.' },
  { slug: 'homeland-security', icon: Lock, name: 'Homeland Security', desc: 'Work specialised operations within our DHS division for advanced roleplay scenarios.' },
  { slug: 'communications', icon: Radio, name: 'Communications', desc: 'Run dispatch, coordinate units, and keep every ER:LC roleplay session organised and immersive.' },
  { slug: 'civilian', icon: Car, name: 'Civilian Operations', desc: 'Drive the story forward as a civilian: run a business, get into crime, or just live everyday life in Atlanta City.' },
];

const FEATURES = [
  { icon: CheckCircle2, title: 'Trained, Professional Staff', desc: 'Our moderation team is thoroughly trained to keep every roleplay realistic, fair, and fun.' },
  { icon: Sparkles, title: 'Immersive Realism', desc: 'Custom liveries, uniforms, and SOPs deliver one of the most authentic ER:LC roleplay experiences on Roblox.' },
  { icon: Trophy, title: 'Real Progression', desc: 'Earn ranks, join departments, and grow your career across the Georgia State Roleplay community.' },
  { icon: Clock, title: 'Active Around the Clock', desc: 'Daily sessions and a packed roster mean there is always a roleplay running when you log on.' },
];

const TOP_MEMBERS = [
  { rank: 1, name: 'jimbo_2231', hours: '424h 30m' },
  { rank: 2, name: 'katelynwolf2', hours: '313h 4m' },
  { rank: 3, name: 'Raikonnen', hours: '310h 36m' },
  { rank: 4, name: 'LargeRobloxmaster12', hours: '296h 44m' },
  { rank: 5, name: 'loganthegamer931', hours: '294h 38m' },
  { rank: 6, name: 'Chrisgamerboy71', hours: '286h 14m' },
];

const REVIEWS = [
  { name: 'kamden112s', handle: '@k_a_m_d_e_n', rating: 5, text: 'Best owners and great roleplays! Must join.' },
  { name: 'Kadyn123311', handle: '@fielddaygaming34yt', rating: 5, text: "Best experience I've ever had in my whole entire career of Roleplaying." },
  { name: 'Hopeclipzz', handle: '@whois._adrian._', rating: 5, text: 'One of the best servers in ER:LC. The staff get the job done efficiently and the roleplay scene is amazing, so many department opportunities.' },
  { name: 'cs202021', handle: '@joeman584809', rating: 5, text: 'Best RP server ever. Signed, Probationary Deputy.' },
  { name: 'Power_king027', handle: '@power_king027', rating: 5, text: 'The server is extremely professional, and the staff is kind, considerate, and knowledgeable.' },
  { name: 'guus_nl22', handle: 'ER:LC veteran', rating: 5, text: "I've played ERLC for 4-5 years and this server really stands out. People are nice and welcoming and the RP is almost always realistic." },
  { name: 'TvRemote31', handle: '@tvremote31', rating: 5, text: 'Moderation is good, the sessions are chill and have good RPs, would recommend to join.' },
  { name: 'Dubyazx', handle: '@dubyayt', rating: 5, text: 'Very good roleplay server. The staff team really know what they are doing.' },
  { name: 'CRD_588', handle: '@CRD_588', rating: 5, text: 'Good server along with the staff, very helpful. Overall a great place to roleplay.' },
  { name: 'Securityguard2711', handle: '@cape4726', rating: 5, text: 'Made a great first impression and already gave me chances for development. Currently in DHS and it is very fun.' },
  { name: 'FootballPuppy145', handle: '@udonemessedupaa_ron', rating: 5, text: 'Very supportive and helpful staff. Before I was staff I still loved the community, they always have players online.' },
  { name: 'alexisd4786', handle: 'GSRP member', rating: 5, text: "Really good server, it's pretty fun and there's always something happening." },
];

function Stars({ n = 5 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < n ? 'text-gsrp-gold fill-gsrp-gold' : 'text-gsrp-dark-border'} />
      ))}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <figure className="tac-panel rounded-2xl p-5 w-[300px] md:w-[340px] flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gsrp-orange/25 to-gsrp-teal/20 border border-white/10 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-white text-sm">{r.name[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <figcaption className="text-white font-semibold text-[13.5px] truncate">{r.name}</figcaption>
            <p className="text-gsrp-teal-light/40 text-[11px] truncate">{r.handle}</p>
          </div>
        </div>
        <Stars n={r.rating} />
      </div>
      <blockquote className="text-gsrp-teal-light/70 text-[13px] leading-relaxed">{r.text}</blockquote>
    </figure>
  );
}

/* Scans the media folders on every request so newly uploaded images appear
   without any code changes.
   - Scroll story sections: public/media/scroll-showcases/, keyed to copy by
     filename without extension (e.g. respond-to-emergencies.png).
   - Moving gallery: every image in public/media/landing-showcases/. */
export async function getStaticProps() {
  const fs = require('fs');
  const path = require('path');
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

  const readImages = (subdir) => {
    try {
      return fs
        .readdirSync(path.join(process.cwd(), 'public', 'media', subdir))
        .filter((f) => IMAGE_EXT.test(f))
        .sort();
    } catch {
      return [];
    }
  };

  const showcase = {};
  for (const f of readImages('scroll-showcases')) {
    const slug = f.replace(/\.[^.]+$/, '').toLowerCase();
    if (!showcase[slug]) showcase[slug] = `/media/scroll-showcases/${f}`;
  }

  const gallery = readImages('landing-showcases').map((f) => `/media/landing-showcases/${f}`);

  return { props: { showcase, gallery }, revalidate: 3600 };
}

export default function Landing({ showcase = {}, gallery = [] }) {
  const { status } = useSession();
  const authed = status === 'authenticated';
  const primaryHref = authed ? '/dashboard' : DISCORD_INVITE;
  const row = [...REVIEWS, ...REVIEWS];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Georgia State Roleplay',
        alternateName: 'GSRP',
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}${LOGO}`, width: 256, height: 256 },
        description: 'Georgia State Roleplay is a professional Emergency Response: Liberty County roleplay community on Roblox.',
        sameAs: [DISCORD_INVITE, ROBLOX_COMMUNITY],
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.5', reviewCount: '86', bestRating: '5' },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Georgia State Roleplay',
        alternateName: 'GSRP',
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en',
      },
    ],
  };

  return (
    <>
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="relative z-10 min-h-screen">
        {/* ===== NAV ===== */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-gsrp-dark/55 border-b border-gsrp-dark-border/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src={LOGO} alt="Georgia State Roleplay logo" width={36} height={36} priority className="rounded-xl object-cover ring-1 ring-white/10" />
              <span className="font-display font-extrabold text-white tracking-tight text-[15px] leading-none">
                Georgia State <span className="text-gsrp-orange">Roleplay</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-semibold text-gsrp-teal-light/55">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <a href="#departments" className="hover:text-white transition-colors">Departments</a>
              <Link href="/how-to-join" className="hover:text-white transition-colors">How to Join</Link>
              <Link href="/events" className="hover:text-white transition-colors">Events</Link>
            </nav>
            <div className="flex items-center gap-2.5">
              <Link href="/dashboard" className="hidden sm:inline-flex items-center text-[13px] font-semibold text-gsrp-teal-light/70 hover:text-white transition-colors px-3 py-2">
                Dashboard
              </Link>
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-4 py-2.5 rounded-xl font-bold text-[13px] transition-colors cursor-pointer shadow-tac-2">
                Join Discord
              </a>
            </div>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-gsrp-orange/20 blur-[140px] animate-aura" />
          <div aria-hidden="true" className="pointer-events-none absolute top-40 -right-40 w-[480px] h-[480px] rounded-full bg-gsrp-teal/20 blur-[130px] animate-aura" style={{ animationDelay: '3s' }} />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-16 text-center">
            <h1 className="font-display text-white font-extrabold tracking-tight leading-[1.02] text-4xl sm:text-6xl md:text-7xl mb-6 animate-fade-in-up stagger-1">
              Georgia State<br />
              <span className="bg-gradient-to-r from-gsrp-orange via-gsrp-warm to-gsrp-gold bg-clip-text text-transparent">Roleplay</span>
            </h1>

            <p className="max-w-2xl mx-auto text-gsrp-teal-light/65 text-base md:text-lg leading-relaxed mb-9 animate-fade-in-up stagger-2">
              One of the largest and most professional <strong className="text-white font-semibold">ERLC roleplay servers</strong> on
              Roblox. Join <strong className="text-white font-semibold">9,000+ members</strong> for realistic
              ER:LC roleplay, trained staff, real departments, and non-stop sessions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up stagger-3">
              <a href={primaryHref} target={authed ? undefined : '_blank'} rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-7 py-3.5 rounded-xl font-bold text-[15px] transition-colors cursor-pointer shadow-glow-orange w-full sm:w-auto">
                {authed ? 'Open Dashboard' : 'Join the Community'}
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href={ROBLOX_COMMUNITY} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 tac-panel tac-panel-hover text-white px-7 py-3.5 rounded-xl font-bold text-[15px] cursor-pointer w-full sm:w-auto">
                <Globe size={18} className="text-gsrp-teal-light" />
                Roblox Community
              </a>
            </div>

            {/* Watch trailer */}
            <div className="mt-5 flex justify-center animate-fade-in-up stagger-4">
              <Link href="/trailer"
                className="trailer-cta group inline-flex items-center gap-3 rounded-full pl-2 pr-6 py-2 font-bold text-[14.5px] text-white cursor-pointer">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gsrp-orange shadow-glow-orange">
                  <span aria-hidden="true" className="absolute inset-0 rounded-full bg-gsrp-orange animate-ping opacity-40" />
                  <Play size={15} className="relative translate-x-[1px] fill-white text-white" />
                </span>
                Watch server trailer
              </Link>
            </div>

            {/* Stats band */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-16 animate-fade-in-up stagger-4">
              {STATS.map((s) => (
                <div key={s.label} className="tac-panel rounded-2xl px-4 py-5 flex flex-col items-center">
                  <s.icon size={20} className="text-gsrp-orange mb-2.5" />
                  <span className="font-display font-extrabold text-white text-2xl md:text-3xl tracking-tight">{s.value}</span>
                  <span className="text-gsrp-teal-light/45 text-[11px] uppercase tracking-wider font-semibold mt-1">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ABOUT ===== */}
        <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <p className="text-gsrp-orange font-semibold text-sm mb-3">About GSRP</p>
              <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight leading-tight mb-5">
                The premier <span className="text-gsrp-orange">ER:LC</span> roleplay experience
              </h2>
              <p className="text-gsrp-teal-light/65 leading-relaxed mb-4">
                Founded in 2025, Georgia State Roleplay has grown into one of the leading ER:LC
                communities on Roblox. Based in Atlanta, Georgia, our goal is simple: give every member the most immersive
                <strong className="text-white font-semibold"> ERLC roleplay</strong> experience possible.
              </p>
              <p className="text-gsrp-teal-light/65 leading-relaxed mb-7">
                Whether you want to patrol as police, fight fires, respond to medical calls, or live out civilian life in
                Atlanta City, our thoroughly trained staff team keeps every roleplay session realistic, fair, and fun.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="tac-panel rounded-2xl p-4 flex gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-gsrp-orange/10 border border-gsrp-orange/20 flex items-center justify-center flex-shrink-0">
                      <f.icon size={17} className="text-gsrp-orange" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-[13.5px] mb-1">{f.title}</h3>
                      <p className="text-gsrp-teal-light/55 text-[12.5px] leading-snug">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.12} className="relative">
              <div aria-hidden="true" className="absolute -inset-4 bg-gradient-to-br from-gsrp-orange/15 to-gsrp-teal/12 rounded-[2.5rem] blur-3xl" />
              <div className="relative tac-panel rounded-3xl p-8 shadow-tac-3">
                <div className="flex items-center gap-4 mb-7">
                  <Image src={LOGO} alt="Georgia State Roleplay emblem" width={64} height={64} className="rounded-2xl object-cover ring-1 ring-white/10" />
                  <div>
                    <p className="font-display font-extrabold text-white text-lg leading-tight">Georgia State Roleplay</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Stars n={5} />
                      <span className="text-gsrp-teal-light/50 text-xs">4.5 · 86 reviews</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    ['9,000+', 'Discord community members'],
                    ['40+', 'Players in active sessions'],
                    ['Daily', 'Roleplay sessions & patrols'],
                    ['Atlanta, GA', 'Our roleplay setting'],
                  ].map(([v, l]) => (
                    <div key={l} className="flex items-center justify-between border-b border-gsrp-dark-border/40 pb-3 last:border-0 last:pb-0">
                      <span className="text-gsrp-teal-light/55 text-[13px]">{l}</span>
                      <span className="font-display font-bold text-white text-[15px]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== ROLEPLAY SHOWCASE ===== */}
        <ShowcaseSections showcase={showcase} />

        {/* ===== MEDIA GALLERY ===== */}
        <MediaMarquee images={gallery} />

        {/* ===== DEPARTMENTS ===== */}
        <section id="departments" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-gsrp-orange font-semibold text-sm mb-3">Departments</p>
            <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
              Choose your role in Atlanta City
            </h2>
            <p className="text-gsrp-teal-light/60 leading-relaxed">
              From law enforcement to first responders and civilians, every ERLC roleplay path is open at Georgia State Roleplay.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEPARTMENTS.map((d, i) => (
              <Reveal key={d.name} delay={(i % 3) * 0.08} className="tac-panel tac-panel-hover rounded-2xl p-6 group">
                <Link href={`/departments/${d.slug}`} className="block" aria-label={`Learn about the ${d.name}`}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gsrp-orange/15 to-gsrp-teal/12 border border-white/10 flex items-center justify-center mb-4">
                  <d.icon size={20} className="text-gsrp-orange" />
                </div>
                <h3 className="font-display text-white font-bold text-lg mb-2">{d.name}</h3>
                <p className="text-gsrp-teal-light/55 text-[13px] leading-relaxed">{d.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-gsrp-orange">Explore department <ArrowRight size={13} /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===== COMMUNITY / TOP MEMBERS ===== */}
        <section id="community" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-gsrp-orange font-semibold text-sm mb-3">Our Community</p>
            <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
              Most active members
            </h2>
            <p className="text-gsrp-teal-light/60 leading-relaxed">
              Hundreds of hours of roleplay logged, these members live and breathe Georgia State Roleplay.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {TOP_MEMBERS.map((m, i) => (
              <Reveal key={m.rank} delay={(i % 3) * 0.08} className="tac-panel rounded-2xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-extrabold text-sm flex-shrink-0 ${
                  m.rank === 1 ? 'bg-gsrp-gold/15 text-gsrp-gold border border-gsrp-gold/30'
                  : m.rank <= 3 ? 'bg-gsrp-orange/15 text-gsrp-orange border border-gsrp-orange/25'
                  : 'bg-white/5 text-gsrp-teal-light/70 border border-white/10'}`}>
                  #{m.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-[14px] truncate">{m.name}</p>
                  <p className="text-gsrp-teal-light/45 text-[12px] flex items-center gap-1">
                    <Clock size={11} /> {m.hours} played
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===== REVIEWS MARQUEE ===== */}
        <section id="reviews" className="py-16 overflow-hidden">
          <Reveal className="text-center max-w-2xl mx-auto px-4 mb-12">
            <p className="text-gsrp-orange font-semibold text-sm mb-3">Reviews</p>
            <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
              Loved by the ER:LC community
            </h2>
            <div className="inline-flex items-center gap-2 text-gsrp-teal-light/60">
              <Stars n={5} />
              <span className="text-sm font-semibold">4.5 out of 5 · 86 reviews</span>
            </div>
          </Reveal>

          <div className="marquee-mask space-y-4">
            <div className="marquee-track marquee-left">
              {row.map((r, i) => <ReviewCard key={`a-${i}`} r={r} />)}
            </div>
            <div className="marquee-track marquee-right">
              {row.map((r, i) => <ReviewCard key={`b-${i}`} r={r} />)}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="relative tac-panel rounded-3xl px-6 py-14 md:py-20 text-center overflow-hidden">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-gsrp-orange/15 blur-[120px]" />
            <div className="relative">
              <MessageSquare size={32} className="text-gsrp-orange mx-auto mb-5" />
              <h2 className="font-display text-white font-extrabold text-3xl md:text-5xl tracking-tight mb-5 leading-tight">
                Ready to start your<br className="hidden sm:block" /> ERLC roleplay?
              </h2>
              <p className="text-gsrp-teal-light/65 max-w-xl mx-auto mb-9 leading-relaxed">
                Join 9,000+ members in Georgia State Roleplay, one of the best ER:LC
                communities on Roblox. Your department is waiting.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-colors cursor-pointer shadow-glow-orange w-full sm:w-auto">
                  Join the Discord
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </a>
                <Link href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 tac-panel tac-panel-hover text-white px-8 py-4 rounded-xl font-bold text-[15px] cursor-pointer w-full sm:w-auto">
                  <Building2 size={18} className="text-gsrp-teal-light" />
                  Open Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-gsrp-dark-border/40 bg-gsrp-dark/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <Image src={LOGO} alt="GSRP logo" width={32} height={32} className="rounded-lg object-cover ring-1 ring-white/10" />
                  <span className="font-display font-extrabold text-white text-sm">Georgia State Roleplay</span>
                </div>
                <p className="text-gsrp-teal-light/45 text-[12.5px] leading-relaxed max-w-xs">
                  One of the largest and most professional ER:LC roleplay communities on Roblox.
                </p>
              </div>
              <div>
                <p className="text-white font-bold text-[13px] mb-3">Community</p>
                <ul className="space-y-2 text-[13px] text-gsrp-teal-light/50">
                  <li><a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="hover:text-gsrp-orange transition-colors">Join our Discord</a></li>
                  <li><a href={ROBLOX_COMMUNITY} target="_blank" rel="noopener noreferrer" className="hover:text-gsrp-orange transition-colors">Roblox Community</a></li>
                  <li><Link href={BAN_APPEAL} className="hover:text-gsrp-orange transition-colors">Ban Appeal Form</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-[13px] mb-3">Explore</p>
                <ul className="space-y-2 text-[13px] text-gsrp-teal-light/50">
                  <li><Link href="/about" className="hover:text-gsrp-orange transition-colors">About GSRP</Link></li>
                  <li><Link href="/how-to-join" className="hover:text-gsrp-orange transition-colors">How to Join</Link></li>
                  <li><Link href="/server-rules" className="hover:text-gsrp-orange transition-colors">Server Rules</Link></li>
                  <li><Link href="/events" className="hover:text-gsrp-orange transition-colors">Events</Link></li>
                  <li><Link href="/faq" className="hover:text-gsrp-orange transition-colors">FAQ</Link></li>
                  <li><Link href="/shop" className="hover:text-gsrp-orange transition-colors">GSRP Store</Link></li>
                  <li><Link href="/apply" className="hover:text-gsrp-orange transition-colors">Apply Now</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-[13px] mb-3">Legal</p>
                <ul className="space-y-2 text-[13px] text-gsrp-teal-light/50">
                  <li><Link href="/privacy-policy" className="hover:text-gsrp-orange transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms-of-service" className="hover:text-gsrp-orange transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="pt-6 border-t border-gsrp-dark-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-gsrp-teal-light/35 text-[12px]">© {new Date().getFullYear()} Georgia State Roleplay. All rights reserved.</p>
              <p className="text-gsrp-teal-light/25 text-[11px]">ERLC · Georgia State Roleplay · Roblox Roleplay Server</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
