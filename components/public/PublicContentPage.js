import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react';
import { DISCORD_INVITE, LINK_LABELS, ROBLOX_COMMUNITY } from '../../data/public-content';
import { absoluteUrl } from '../../lib/seo';

const NAV_LINKS = ['/about', '/how-to-join', '/server-rules', '/events', '/faq'];

export default function PublicContentPage({ page, path, department = false }) {
  const sections = department
    ? [
        { title: `What ${page.name} members do`, body: [page.intro] },
        { title: 'Core responsibilities', items: page.responsibilities },
        { title: 'How to get involved', body: ['Join the GSRP Discord, learn the community rules, participate consistently, and watch the Applications page for relevant opportunities. Department access may require training, experience, or an existing community role.'] },
      ]
    : page.sections;
  const title = department ? page.name : page.title;
  const intro = page.intro;
  const related = page.related || ['/how-to-join', '/apply', '/faq'];
  const faqEntities = path === '/faq'
    ? sections.map((section) => ({ '@type': 'Question', name: section.title, acceptedAnswer: { '@type': 'Answer', text: section.body.join(' ') } }))
    : null;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Georgia State Roleplay', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: title, item: absoluteUrl(path) },
      ],
    },
    ...(faqEntities ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntities }] : []),
  ];

  return (
    <div className="min-h-screen bg-gsrp-dark text-white">
      <Head>
        {structuredData.map((data, index) => (
          <script key={`structured-data-${index}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
        ))}
      </Head>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gsrp-dark/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-sm font-extrabold">
            <Image src="/media/gsrp-logo.png" alt="Georgia State Roleplay logo" width={36} height={36} className="rounded-xl" priority />
            <span>Georgia State <span className="text-gsrp-orange">Roleplay</span></span>
          </Link>
          <nav aria-label="Public site" className="hidden items-center gap-5 text-xs font-semibold text-gsrp-teal-light/65 md:flex">
            {NAV_LINKS.map((href) => <Link key={href} href={href} className="hover:text-white">{LINK_LABELS[href]}</Link>)}
          </nav>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-gsrp-orange px-4 py-2 text-xs font-bold hover:bg-gsrp-orange-light">Join Discord</a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-gsrp-teal-light/45">
              <Link href="/" className="hover:text-white">Home</Link><ChevronRight size={13} /><span>{title}</span>
            </nav>
            <p className="mb-3 text-sm font-semibold text-gsrp-orange">{page.eyebrow}</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-gsrp-teal-light/70">{intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gsrp-orange px-5 py-3 text-sm font-bold">Join the community <ArrowRight size={16} /></a>
              <Link href="/how-to-join" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold hover:border-gsrp-teal/50">How to join</Link>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10 shadow-tac-3">
            <Image src={page.image} alt={`${title} at Georgia State Roleplay`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-gsrp-dark/50 to-transparent" />
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-white/10 bg-gsrp-dark-card/70 p-6 sm:p-8">
                <h2 className="font-display text-2xl font-bold">{section.title}</h2>
                {(section.body || []).map((paragraph) => <p key={paragraph} className="mt-4 leading-7 text-gsrp-teal-light/65">{paragraph}</p>)}
                {section.items ? <ul className="mt-5 grid gap-3 sm:grid-cols-2">{section.items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-gsrp-teal-light/70"><CheckCircle2 size={17} className="mt-1 shrink-0 text-gsrp-teal" />{item}</li>)}</ul> : null}
              </article>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">Explore more of GSRP</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((href) => <Link key={href} href={href} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-bold hover:border-gsrp-orange/50 hover:text-gsrp-orange">{LINK_LABELS[href] || 'Learn more'}<ArrowRight size={16} /></Link>)}
            </div>
          </section>

          <section className="mt-12 rounded-3xl border border-gsrp-orange/25 bg-gsrp-orange/10 p-8 text-center">
            <MessageSquare className="mx-auto text-gsrp-orange" />
            <h2 className="mt-4 font-display text-2xl font-bold">Ready to take part?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gsrp-teal-light/65">Join the official Discord for current session announcements, support, department opportunities, and community updates.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-gsrp-orange px-5 py-3 text-sm font-bold">Open Discord</a>
              <a href={ROBLOX_COMMUNITY} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold">Roblox community</a>
            </div>
          </section>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-gsrp-teal-light/40">
        <p>© {new Date().getFullYear()} Georgia State Roleplay · ER:LC community on Roblox</p>
        <div className="mt-3 flex flex-wrap justify-center gap-4"><Link href="/privacy-policy">Privacy</Link><Link href="/terms-of-service">Terms</Link><Link href="/shop">Store</Link><Link href="/apply">Applications</Link></div>
      </footer>
    </div>
  );
}
