import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

export interface LandscapeSlide {
  src: string;
  title: string;
  subtitle: string;
  tag: string;
  href: string;
}

const DEFAULT_SLIDES: LandscapeSlide[] = [
  {
    src: '/uploads/products/KRK039_main.jpg',
    title: '30 SHOT MULTICOLOUR',
    subtitle: 'High-altitude aerial burst with vibrant color symmetry',
    tag: 'AERIAL SKYSHOTS',
    href: '/product/KRK039',
  },
  {
    src: '/uploads/products/KRK032_main.jpg',
    title: '1000 WALA UV 3D',
    subtitle: 'Acoustic cadence handcrafted for pure celebration rhythm',
    tag: 'TRADITIONAL LADIS',
    href: '/product/KRK032',
  },
  {
    src: '/uploads/products/KRK029_main.jpg',
    title: 'GROUND CHAKKAR BIG',
    subtitle: 'Smooth rotational ground fire with concentrated silver embers',
    tag: 'PRECISION CHAKKARS',
    href: '/product/KRK029',
  },
];

export function LandscapeImageStrip({
  slides = DEFAULT_SLIDES,
  className = '',
}: {
  slides?: LandscapeSlide[];
  className?: string;
}) {
  // We duplicate slides to guarantee a seamless 50% translation loop
  const loopSlides = [...slides, ...slides];

  return (
    <section
      aria-label="Featured Pyrotechnic Showcase"
      className={`relative w-full overflow-hidden border-y border-hairline bg-void py-6 sm:py-8 ${className}`}
    >
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-24 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-24 bg-gradient-to-l from-void to-transparent" />

      <div className="animate-marquee flex items-center gap-4 sm:gap-6">
        {loopSlides.map((slide, index) => (
          <Link
            key={`${slide.src}-${index}`}
            href={slide.href}
            className="group relative flex w-[300px] sm:w-[460px] md:w-[560px] shrink-0 flex-col overflow-hidden rounded-sm border border-hairline bg-panel transition-all duration-300 hover:border-ember hover:shadow-ember-glow"
          >
            {/* Landscape image container with fixed 16:9 ratio */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-void">
              <Image
                src={slide.src}
                alt={slide.title}
                fill
                sizes="(max-width: 640px) 300px, (max-width: 1024px) 460px, 560px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                priority={index < 2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
              <span className="absolute top-3 left-3 rounded-xs bg-ember px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                {slide.tag}
              </span>
            </div>

            {/* Slide Details */}
            <div className="flex flex-col p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="line-clamp-1 font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.06em] text-fg transition-colors group-hover:text-ember">
                  {slide.title}
                </h3>
                <span className="font-mono text-[10px] text-ember opacity-0 transition-opacity group-hover:opacity-100">
                  EXPLORE →
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-[11px] sm:text-xs text-fg-muted">
                {slide.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

