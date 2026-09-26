import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white py-12 sm:py-24 px-4 sm:px-12 mt-16 sm:mt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-16 mb-12 sm:mb-24">
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-wider sm:tracking-ultra uppercase text-white">
              KARKANA
            </h3>
            <p className="text-white/40 max-w-md text-sm font-mono leading-relaxed">
              A dynamic festive-commerce platform engineered for bespoke pyrotechnic experiences.
              Driven entirely by the central control portal.
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-white/50">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-kred"></span>
                <span>CASH ON DELIVERY ONLY</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                <a
                  href="tel:7207294554"
                  className="hover:text-white text-white/80 transition-colors inline-flex items-center gap-1"
                >
                  <span className="text-white/40">TEL:</span>
                  <span className="text-white font-bold tracking-wider">7207294554</span>
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs uppercase font-mono tracking-widest text-kred">
              SYSTEM MODULES
            </div>
            <ul className="space-y-3 text-sm font-mono">
              <li>
                <Link href="/module/basic" className="text-white/60 hover:text-white transition-colors">
                  01. BASIC
                </Link>
              </li>
              <li>
                <Link href="/module/customized" className="text-white/60 hover:text-white transition-colors">
                  02. CUSTOMIZED
                </Link>
              </li>
              <li>
                <Link href="/module/personalized" className="text-white/60 hover:text-white transition-colors">
                  03. PERSONALIZED
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-xs uppercase font-mono tracking-widest text-kred">
              FULFILLMENT ASSURANCE
            </div>
            <ul className="space-y-3 text-sm font-mono text-white/60">
              <li>CASH ON DELIVERY</li>
              <li>DIRECT SIVAKASI DISPATCH</li>
              <li>MANUAL VERIFICATION</li>
              <li>
                <a
                  href="tel:7207294554"
                  className="hover:text-white text-white/90 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="text-white/40">CALL:</span>
                  <span className="text-white font-bold tracking-wider">7207294554</span>
                </a>
              </li>
              <li>SUPPORT: HELLO@KARKANA.COM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 sm:pt-12 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-white/30 gap-4 text-center sm:text-left">
          <div>© {new Date().getFullYear()} KARKANA. ALL RIGHTS RESERVED.</div>
          <div className="tracking-widest uppercase">
            STRICT ARCHITECTURAL PURITY // NO DEMO CONTENT
          </div>
        </div>
      </div>
    </footer>
  );
}
