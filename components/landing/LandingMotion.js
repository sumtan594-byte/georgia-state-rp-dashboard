import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

/* Soft one-time reveal used across the landing page. */
export function Reveal({ children, delay = 0, y = 28, className }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* The five featured roleplay moments. Images are matched by filename:
   public/media/showcase-1.* through showcase-5.* (any image extension). */
const SHOWCASES = [
  {
    slot: '1',
    label: 'Emergency response',
    title: 'Respond and assist in realistic situations',
    desc: 'Vehicle fires, water rescues, multi-car pileups — every callout plays out the way it would in real life. Roll up with Fire & EMS or law enforcement and work the scene together.',
  },
  {
    slot: '2',
    label: 'Community',
    title: 'Chill out and have fun with other roleplayers',
    desc: 'Not every session is a code three. Hang out on the bridge, swap stories between calls, and make friends with roleplayers from all over the community.',
  },
  {
    slot: '3',
    label: 'Events & races',
    title: 'Flex your best vehicles in special events and races',
    desc: 'Line up your finest rides at the car meets, takeovers, and races we host regularly. Bring something worth showing off — the whole server will be watching.',
  },
  {
    slot: '4',
    label: 'Campouts',
    title: 'Unwind at community campouts',
    desc: 'Convoy out to the lakeside, park up with the crew, and let the roleplay slow down for a night. Campouts bring civilians, staff, and departments together around one campfire.',
  },
  {
    slot: '5',
    label: 'Tactical operations',
    title: 'Partake in major tactical operations against most wanted mafias',
    desc: "When organised crime digs in, SWAT and state troopers roll out. Join large-scale, coordinated operations against Atlanta City's most wanted — planned, briefed, and executed like the real thing.",
  },
];

function ShowcaseItem({ src, label, title, desc, flip }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [36, -36]);

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
      <Reveal className={`relative ${flip ? 'lg:order-2' : ''}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-5 rounded-[2.25rem] bg-gradient-to-br from-gsrp-orange/12 to-gsrp-teal/10 blur-2xl"
        />
        <div className="relative aspect-[16/10] rounded-[1.5rem] overflow-hidden border border-white/10 shadow-tac-3">
          <motion.img
            src={src}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover scale-[1.12]"
            style={{ y }}
          />
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
        <p className="text-gsrp-teal-light/65 leading-relaxed text-[15px] max-w-xl">{desc}</p>
      </Reveal>
    </div>
  );
}

export function ShowcaseSections({ showcase }) {
  const items = SHOWCASES.filter((s) => showcase?.[s.slot]);
  if (!items.length) return null;

  return (
    <section id="experience" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-gsrp-orange font-semibold text-sm mb-3">The experience</p>
        <h2 className="font-display text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
          What roleplay looks like at GSRP
        </h2>
        <p className="text-gsrp-teal-light/60 leading-relaxed">
          Real moments captured in our sessions — from quiet nights with the community to full-scale operations.
        </p>
      </Reveal>
      <div className="space-y-24 md:space-y-32">
        {items.map((s, i) => (
          <ShowcaseItem key={s.slot} {...s} src={showcase[s.slot]} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

/* Infinite marquee gallery. Adapts to whatever lives in public/media —
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
          <img
            src={src}
            alt="Georgia State Roleplay session screenshot"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out-expo hover:scale-105"
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
          Straight from our sessions — patrols, pursuits, meets, and everything in between.
        </p>
      </Reveal>

      <div className="marquee-mask space-y-4">
        <MarqueeRow images={rowA} duration={speed(rowA)} />
        {rowB && <MarqueeRow images={rowB} reverse duration={speed(rowB)} />}
      </div>
    </section>
  );
}
