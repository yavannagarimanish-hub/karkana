import Link from 'next/link';
import { MODULE_SLUGS } from '@/core/domain/product';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-8">
      <span className="numeric text-[11px] text-ember">[404]</span>

      <h1 className="mt-4 font-display text-4xl leading-tight font-bold text-fg sm:text-5xl">
        This page has gone up in smoke
      </h1>

      <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted">
        The page you were looking for does not exist, or the link that brought you here is out of
        date. The catalogue is still very much intact.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-sm bg-ember px-6 text-xs font-bold tracking-[0.14em] text-fg uppercase transition-colors hover:bg-ember-hover"
        >
          Back to catalogue
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center justify-center rounded-sm border border-hairline-strong bg-panel px-6 text-xs font-bold tracking-[0.14em] text-fg uppercase transition-colors hover:border-ember hover:text-ember"
        >
          Search products
        </Link>
      </div>

      <div className="mt-12 w-full border-t border-hairline pt-8">
        <p className="label text-fg-dim">Browse a collection</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              [MODULE_SLUGS.BASIC, 'Basic crackers'],
              [MODULE_SLUGS.CUSTOMIZED, 'Customized'],
              [MODULE_SLUGS.PERSONALIZED, 'Personalized'],
            ] as const
          ).map(([slug, label]) => (
            <li key={slug}>
              <Link
                href={`/module/${slug}`}
                className="surface block px-4 py-3 text-sm text-fg-muted transition hover:border-ember/60 hover:text-fg"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
