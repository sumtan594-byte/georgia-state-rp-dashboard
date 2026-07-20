import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

const EASE = [0.16, 1, 0.3, 1];

/* Soft one-time reveal used across the landing page. Keep `initial`
   identical on server and client to avoid hydration style mismatches.
   Animations always play here regardless of the OS reduced-motion setting. */
export function Reveal({ children, delay = 0, y = 28, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* Featured roleplay moments. Each entry is matched to an image in
   public/media/scroll-showcases/ by filename (without extension), so
   respond-to-emergencies.png fills the `respond-to-emergencies` slot.
   The array order is the on-page order. Any uploaded image whose name
   isn't listed here still renders, with a humanized heading. */
const SHOWCASES = [
  {
    slug: 'respond-to-emergencies',
    label: 'Emergency response',
    title: 'Respond and assist in realistic situations',
    desc: 'Vehicle fires, water rescues, multi-car pileups. Every callout plays out like it would in real life, with Fire & EMS and law enforcement working the scene side by side.',
  },
  {
    slug: 'maintain-safety',
    label: 'Law enforcement',
    title: 'Maintain safety and keep the peace',
    desc: 'Run patrols, traffic stops, and pursuits across Atlanta City. When things escalate, you hold the line and keep the street safe.',
  },
  {
    slug: 'team-up',
    label: 'Teamwork',
    title: 'Team up with other roleplayers',
    desc: 'Coordinate units, back each other up, and run every scene as a crew. The best roleplay happens when everyone works together toward the same story.',
  },
  {
    slug: 'participate-events-flex',
    label: 'Events & races',
    title: 'Flex your best vehicles in special events and races',
    desc: 'Line up your finest rides at the car meets, takeovers, and races we host regularly. Bring something worth showing off, because the whole server will be watching.',
  },
  {
    slug: 'camp-n-chill',
    label: 'Community',
    title: 'Camp out and chill with the community',
    desc: 'Convoy out to the lakeside, park up with the crew, and let the roleplay slow down for a night. Civilians, staff, and every department end up around the same campfire.',
  },
  {
    slug: 'tac-ops',
    label: 'Tactical operations',
    title: 'Partake in major tactical operations against most wanted mafias',
    desc: "When organised crime digs in, SWAT and state troopers roll out. These are large-scale, coordinated operations against Atlanta City's most wanted, briefed and run like the real thing.",
  },
];

const humanize = (slug) =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function ShowcaseItem({ src, label, title, desc, flip }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [36, -36]);

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
      <Reveal className={`relative ${flip ? 'lg:order-2' : ''}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-5 rounded-[2.25rem] bg-gradient-to-br from-gsrp-orange/12 to-gsrp-teal/10 blur-2xl"
        />
        <div className="relative aspect-[16/10] rounded-[1.5rem] overflow-hidden border border-white/10 shadow-tac-3">
          <motion.div className="absolute inset-0 scale-[1.12]" style={{ y }}>
            <Image src={src} alt={title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </motion.div>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-gsrp-dark/45 via-transparent to-transparent"
          />
        </div>
      </Reveal>

      <Reveal delay={0.12} className={flip ? 'lg:order-1' : ''}>
        <p className="text-gsrp-orange font-semibold text-sm mb-3">{label}</p>
        <h3 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight leading-tight mb-4">
          {title}
        </h3>
        {desc && <p className="text-gsrp-teal-light/65 leading-relaxed text-[15px] max-w-xl">{desc}</p>}
      </Reveal>
    </div>
  );
}

export function ShowcaseSections({ showcase }) {
  const map = showcase || {};
  const known = SHOWCASES.filter((s) => map[s.slug]);
  const knownSlugs = new Set(SHOWCASES.map((s) => s.slug));
  const extras = Object.keys(map)
    .filter((slug) => !knownSlugs.has(slug))
    .sort()
    .map((slug) => ({ slug, label: 'Roleplay', title: humanize(slug), desc: '' }));
  const items = [...known, ...extras];
  if (!items.length) return null;

  return (
    <section id="experience" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-gsrp-orange font-semibold text-sm mb-3">The experience</p>
        <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
          What roleplay looks like at GSRP
        </h2>
        <p className="text-gsrp-teal-light/60 leading-relaxed">
          Screenshots pulled straight from our sessions, whether it's a quiet night with the community or a full-scale operation.
        </p>
      </Reveal>
      <div className="space-y-24 md:space-y-32">
        {items.map((s, i) => (
          <ShowcaseItem key={s.slug} {...s} src={map[s.slug]} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

/* Infinite marquee gallery. Adapts to whatever lives in public/media:
   drop in new images and they appear after the next page load. */
function MarqueeRow({ images, reverse, duration }) {
  // Pad short lists so the looping track is always wider than the viewport.
  const base = [];
  while (base.length < 8) base.push(...images);
  const track = [...base, ...base];

  return (
    <div
      className={`marquee-track ${reverse ? 'marquee-right' : 'marquee-left'}`}
      style={{ animationDuration: `${duration}s` }}
    >
      {track.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className="relative w-[300px] md:w-[380px] aspect-[16/9] flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-tac-2"
        >
          <Image
            src={src}
            alt={`Georgia State Roleplay ER:LC session screenshot ${i % images.length + 1}`}
            fill
            sizes="(max-width: 768px) 300px, 380px"
            className="object-cover transition-transform duration-500 ease-out-expo hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}

export function MediaMarquee({ images }) {
  if (!images?.length) return null;

  const twoRows = images.length >= 6;
  const rowA = twoRows ? images.filter((_, i) => i % 2 === 0) : images;
  const rowB = twoRows ? images.filter((_, i) => i % 2 === 1) : null;
  const speed = (imgs) => Math.max(45, imgs.length * 10);

  return (
    <section id="gallery" className="py-20 overflow-hidden">
      <Reveal className="text-center max-w-2xl mx-auto px-4 mb-12">
        <p className="text-gsrp-orange font-semibold text-sm mb-3">Gallery</p>
        <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
          More from around Atlanta City
        </h2>
        <p className="text-gsrp-teal-light/60 leading-relaxed">
          Patrols, pursuits, meets, and everything else that happens during a session.
        </p>
      </Reveal>

      <div className="marquee-mask space-y-4">
        <MarqueeRow images={rowA} duration={speed(rowA)} />
        {rowB && <MarqueeRow images={rowB} reverse duration={speed(rowB)} />}
      </div>
    </section>
  );
}
