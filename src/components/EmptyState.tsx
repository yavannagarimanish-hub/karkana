import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
}

export default function EmptyState({
  title = 'NO PRODUCTS AVAILABLE YET',
  message = 'Catalogue items will appear dynamically once configured in the Control Centre.',
  actionText,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="w-full py-28 px-8 border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center">
      <div className="w-12 h-[1px] bg-kred mb-8"></div>
      <h4 className="text-xl sm:text-2xl font-bold tracking-widest text-white uppercase mb-3">
        {title}
      </h4>
      <p className="text-white/40 text-xs sm:text-sm font-mono max-w-md tracking-wider leading-relaxed mb-8">
        {message}
      </p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="text-xs uppercase font-mono tracking-widest px-6 py-3 border border-white/20 text-white hover:border-kred hover:text-kred transition-all duration-200"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}
