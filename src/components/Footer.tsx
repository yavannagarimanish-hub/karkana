import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white py-24 px-6 sm:px-12 mt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-3xl font-bold tracking-ultra uppercase text-white">
              KARKANA
            </h3>
            <p className="text-white/40 max-w-md text-sm font-mono leading-relaxed">
              A dynamic festive-commerce platform engineered for bespoke pyrotechnic experiences.
              Driven entirely by the central control portal.
            </p>
            <div className="pt-4 flex items-center space-x-3 text-xs font-mono text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-kred"></span>
              <span>CASH ON DELIVERY ONLY</span>
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
              <li>SUPPORT: HELLO@KARKANA.COM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-12 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-white/30 space-y-4 sm:space-y-0">
          <div>© {new Date().getFullYear()} KARKANA. ALL RIGHTS RESERVED.</div>
          <div className="tracking-widest uppercase">
            STRICT ARCHITECTURAL PURITY // NO DEMO CONTENT
          </div>
        </div>
      </div>
    </footer>
  );
}
