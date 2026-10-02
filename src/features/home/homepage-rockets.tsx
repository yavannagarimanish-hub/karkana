'use client';

import * as React from 'react';

/**
 * Subtle background rocket animation for the homepage only.
 *
 * Requirements:
 * - Exactly 3 small red rockets every 6.1 seconds.
 * - Rockets appear one at a time in a 6.1-second cycle.
 * - Placed strictly behind all homepage content (z-0, pointer-events-none).
 * - Kept within empty side background margins so they never pass over cards or text.
 * - Tiny red rocket with a subtle trail and micro-burst at apex.
 * - Disabled when prefers-reduced-motion is active.
 */
export function HomepageRockets() {
  return (
    <div
      aria-hidden="true"
      className="homepage-rockets-layer pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .homepage-rockets-layer {
            display: none !important;
          }
        }

        .rocket-flight-1 {
          animation: rocketAscend 6.1s infinite cubic-bezier(0.22, 0.61, 0.36, 1) 0s;
        }
        .rocket-burst-1 {
          animation: rocketBurst 6.1s infinite ease-out 0s;
        }

        .rocket-flight-2 {
          animation: rocketAscend 6.1s infinite cubic-bezier(0.22, 0.61, 0.36, 1) 2.033s;
        }
        .rocket-burst-2 {
          animation: rocketBurst 6.1s infinite ease-out 2.033s;
        }

        .rocket-flight-3 {
          animation: rocketAscend 6.1s infinite cubic-bezier(0.22, 0.61, 0.36, 1) 4.066s;
        }
        .rocket-burst-3 {
          animation: rocketBurst 6.1s infinite ease-out 4.066s;
        }

        @keyframes rocketAscend {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          1.5% {
            opacity: 0.9;
          }
          20% {
            opacity: 0.85;
          }
          23% {
            transform: translateY(-210px);
            opacity: 0;
          }
          100% {
            transform: translateY(-210px);
            opacity: 0;
          }
        }

        @keyframes rocketBurst {
          0%, 22% {
            opacity: 0;
            transform: scale(0.2);
          }
          23.2% {
            opacity: 0.95;
            transform: scale(0.6);
          }
          27.5% {
            opacity: 0;
            transform: scale(1.35);
          }
          100% {
            opacity: 0;
            transform: scale(1.35);
          }
        }
      `}</style>

      {/* ── Rocket 1: Left empty margin ──────────────────────────────────── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 'clamp(8px, 2.2vw, 32px)',
          bottom: '32%',
          transform: 'rotate(-2deg)',
        }}
      >
        <div className="relative">
          {/* Ascending rocket body and trail */}
          <div className="rocket-flight-1 flex flex-col items-center">
            {/* Rocket tip */}
            <div
              className="rounded-t-xs bg-ember"
              style={{
                width: '2.5px',
                height: '7px',
                boxShadow: '0 -1px 2px rgba(255, 255, 255, 0.8), 0 0 5px #ff0033',
              }}
            />
            {/* Trail */}
            <div
              style={{
                width: '1.5px',
                height: '22px',
                background:
                  'linear-gradient(to bottom, rgba(255, 0, 51, 0.85) 0%, rgba(255, 50, 50, 0.35) 45%, rgba(255, 100, 50, 0.1) 75%, transparent 100%)',
                filter: 'blur(0.3px)',
              }}
            />
          </div>

          {/* Micro burst at apex */}
          <div
            className="rocket-burst-1 absolute left-1/2 -top-[210px] -translate-x-1/2 -translate-y-1/2"
            style={{ width: '22px', height: '22px' }}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{ width: '3px', height: '3px', boxShadow: '0 0 6px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '10px', top: '1px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', right: '1px', top: '7px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', right: '3px', bottom: '2px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '2px', bottom: '3px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '1px', top: '8px', boxShadow: '0 0 3px #ff0033' }}
            />
          </div>
        </div>
      </div>

      {/* ── Rocket 2: Right empty margin (mid height) ────────────────────── */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: 'clamp(8px, 2.2vw, 32px)',
          bottom: '56%',
          transform: 'rotate(2deg)',
        }}
      >
        <div className="relative">
          <div className="rocket-flight-2 flex flex-col items-center">
            <div
              className="rounded-t-xs bg-ember"
              style={{
                width: '2.5px',
                height: '7px',
                boxShadow: '0 -1px 2px rgba(255, 255, 255, 0.8), 0 0 5px #ff0033',
              }}
            />
            <div
              style={{
                width: '1.5px',
                height: '24px',
                background:
                  'linear-gradient(to bottom, rgba(255, 0, 51, 0.85) 0%, rgba(255, 50, 50, 0.35) 45%, rgba(255, 100, 50, 0.1) 75%, transparent 100%)',
                filter: 'blur(0.3px)',
              }}
            />
          </div>

          <div
            className="rocket-burst-2 absolute left-1/2 -top-[210px] -translate-x-1/2 -translate-y-1/2"
            style={{ width: '22px', height: '22px' }}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{ width: '3px', height: '3px', boxShadow: '0 0 6px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '10px', top: '1px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', right: '1px', top: '7px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', right: '3px', bottom: '2px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '2px', bottom: '3px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '1px', top: '8px', boxShadow: '0 0 3px #ff0033' }}
            />
          </div>
        </div>
      </div>

      {/* ── Rocket 3: Right lower empty margin ───────────────────────────── */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: 'clamp(14px, 3.2vw, 44px)',
          bottom: '22%',
          transform: 'rotate(-1deg)',
        }}
      >
        <div className="relative">
          <div className="rocket-flight-3 flex flex-col items-center">
            <div
              className="rounded-t-xs bg-ember"
              style={{
                width: '2.5px',
                height: '7px',
                boxShadow: '0 -1px 2px rgba(255, 255, 255, 0.8), 0 0 5px #ff0033',
              }}
            />
            <div
              style={{
                width: '1.5px',
                height: '20px',
                background:
                  'linear-gradient(to bottom, rgba(255, 0, 51, 0.85) 0%, rgba(255, 50, 50, 0.35) 45%, rgba(255, 100, 50, 0.1) 75%, transparent 100%)',
                filter: 'blur(0.3px)',
              }}
            />
          </div>

          <div
            className="rocket-burst-3 absolute left-1/2 -top-[210px] -translate-x-1/2 -translate-y-1/2"
            style={{ width: '22px', height: '22px' }}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{ width: '3px', height: '3px', boxShadow: '0 0 6px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '10px', top: '1px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', right: '1px', top: '7px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', right: '3px', bottom: '2px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '2px', bottom: '3px', boxShadow: '0 0 3px #ff0033' }}
            />
            <span
              className="absolute rounded-full bg-ember"
              style={{ width: '2px', height: '2px', left: '1px', top: '8px', boxShadow: '0 0 3px #ff0033' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
