import React from 'react';

interface SectionHeaderProps {
  number?: string;
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ number, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-14 sm:mb-20 space-y-4">
      <div className="flex items-center space-x-4">
        {number && (
          <span className="text-kred font-mono text-xs tracking-widest uppercase">
            [{number}]
          </span>
        )}
        <div className="h-[1px] w-12 bg-white/20"></div>
      </div>
      <h2 className="text-2xl sm:text-4xl font-bold tracking-ultra uppercase text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="text-white/40 text-xs sm:text-sm font-mono tracking-widest uppercase max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
