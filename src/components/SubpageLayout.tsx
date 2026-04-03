import type { ReactNode } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { useApp } from "@/contexts/AppContext";

const NetworkDecor = ({ opacity = 0.4 }: { opacity?: number }) => (
  <svg viewBox="0 0 900 320" fill="none" className="w-full h-full" style={{ opacity }} preserveAspectRatio="xMidYMid slice">
    <line x1="80" y1="60" x2="300" y2="120" stroke="white" strokeWidth="0.7" opacity="0.4"/>
    <line x1="300" y1="120" x2="560" y2="50" stroke="white" strokeWidth="0.7" opacity="0.4"/>
    <line x1="560" y1="50" x2="780" y2="140" stroke="white" strokeWidth="0.7" opacity="0.4"/>
    <line x1="80" y1="60" x2="40" y2="240" stroke="white" strokeWidth="0.5" opacity="0.25"/>
    <line x1="300" y1="120" x2="180" y2="270" stroke="white" strokeWidth="0.5" opacity="0.25"/>
    <line x1="560" y1="50" x2="420" y2="260" stroke="white" strokeWidth="0.5" opacity="0.25"/>
    <line x1="780" y1="140" x2="680" y2="280" stroke="white" strokeWidth="0.5" opacity="0.25"/>
    <line x1="40" y1="240" x2="180" y2="270" stroke="white" strokeWidth="0.4" opacity="0.2"/>
    <line x1="180" y1="270" x2="420" y2="260" stroke="white" strokeWidth="0.4" opacity="0.2"/>
    <line x1="420" y1="260" x2="680" y2="280" stroke="white" strokeWidth="0.4" opacity="0.2"/>
    <g transform="translate(80,60)" opacity="0.9">
      <circle r="20" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.1)"/>
      <circle r="9" stroke="#F7931A" strokeWidth="2" fill="none"/>
      <circle r="3.5" fill="#F7931A"/>
      <line x1="9" y1="0" x2="24" y2="0" stroke="#F7931A" strokeWidth="2"/>
      <line x1="20" y1="0" x2="20" y2="7" stroke="#F7931A" strokeWidth="1.5"/>
    </g>
    <g transform="translate(300,120)" opacity="0.85">
      <circle r="18" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.08)"/>
      <rect x="-8" y="-4" width="16" height="14" rx="2" stroke="#F7931A" strokeWidth="1.8" fill="none"/>
      <path d="M-5,-4 L-5,-10 Q0,-14 5,-10 L5,-4" stroke="#F7931A" strokeWidth="1.8" fill="none"/>
      <circle cy="3" r="3" fill="#F7931A"/>
    </g>
    <g transform="translate(560,50)" opacity="1">
      <circle r="24" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.12)"/>
      <circle r="11" stroke="#F7931A" strokeWidth="2.5" fill="none"/>
      <circle r="4.5" fill="#F7931A"/>
      <line x1="11" y1="0" x2="28" y2="0" stroke="#F7931A" strokeWidth="2.5"/>
      <line x1="25" y1="0" x2="25" y2="8" stroke="#F7931A" strokeWidth="2"/>
    </g>
    <g transform="translate(780,140)" opacity="0.8">
      <circle r="18" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.08)"/>
      <circle r="8" stroke="#F7931A" strokeWidth="1.8" fill="none"/>
      <circle r="3" fill="#F7931A"/>
      <line x1="8" y1="0" x2="22" y2="0" stroke="#F7931A" strokeWidth="2"/>
    </g>
    <circle cx="40" cy="240" r="7" stroke="white" strokeWidth="1.2" fill="none" opacity="0.3"/>
    <circle cx="180" cy="270" r="5" stroke="white" strokeWidth="1.2" fill="none" opacity="0.25"/>
    <circle cx="420" cy="260" r="7" stroke="white" strokeWidth="1.2" fill="none" opacity="0.3"/>
    <circle cx="680" cy="280" r="8" stroke="white" strokeWidth="1.2" fill="none" opacity="0.25"/>
  </svg>
);

interface CTA {
  label: string;
  href: string;
  primary?: boolean;
}

interface SubpageLayoutProps {
  badge: string;
  title: string;
  Illustration: ReactNode;
  heroDecor?: ReactNode;
  children: ReactNode;
  quote: string;
  darkSectionContent?: ReactNode;
  ctas: CTA[];
}

export default function SubpageLayout({
  badge, title, Illustration, heroDecor, children, quote, darkSectionContent, ctas,
}: SubpageLayoutProps) {
  const [, navigate] = useLocation();
  const { t, dark } = useApp();

  const pageBg = dark ? "bg-[#0f0f0f] text-[#FAFAF5]" : "bg-[#FAFAF5] text-[#1a1a1a]";
  const muted = dark ? "text-[#FAFAF5]/60" : "text-[#1a1a1a]/55";

  return (
    <div className={`min-h-screen font-body ${pageBg}`}>
      <Navbar />

      {/* HERO dark always */}
      <section className="relative bg-[#1a1a1a] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          {heroDecor
            ? <div className="w-full h-full" style={{ opacity: 0.45 }}>{heroDecor}</div>
            : <NetworkDecor opacity={0.45} />}
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-0">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="flex-1">
              <div className="inline-block border border-[#F7931A]/60 text-[#F7931A] font-handwritten text-sm px-3 py-1 mb-5 uppercase tracking-widest">
                {badge}
              </div>
              <h1 className="font-sketch text-4xl md:text-5xl leading-tight text-white mb-0">
                {title}
              </h1>
            </div>
            <div className="flex-shrink-0 opacity-85">
              {Illustration}
            </div>
          </div>
        </div>

        {/* Mountain transition out of hero */}
        <div className="relative h-20 -mb-px overflow-hidden" style={{ background: dark ? "#0f0f0f" : "#FAFAF5" }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute top-0 left-0 w-full" height="80" fill="#1a1a1a">
            <path d="M0,0 L0,30 C120,80 200,20 360,50 C520,80 600,10 760,60 C920,10 1020,70 1180,30 C1340,80 1400,20 1440,50 L1440,0 Z"/>
          </svg>
        </div>
      </section>

      {/* MAIN CONTENT adaptive */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        {children}
      </section>

      {/* DARK SECTION */}
      <section className="bg-[#1a1a1a] relative overflow-hidden">
        {/* Mountain into dark */}
        <div className="relative h-20 -mt-px overflow-hidden" style={{ background: dark ? "#0f0f0f" : "#FAFAF5" }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" height="80" fill="#1a1a1a">
            <path d="M0,80 L0,50 C100,0 220,70 380,30 C540,0 640,60 800,20 C960,70 1080,10 1240,50 C1380,10 1420,60 1440,30 L1440,80 Z"/>
          </svg>
        </div>

        <div className="absolute inset-0 pointer-events-none select-none">
          <NetworkDecor opacity={0.3} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
          {/* Quote */}
          <div className="border-l-4 border-[#F7931A] pl-6 mb-12">
            <p className="font-handwritten text-3xl text-white/80">{quote}</p>
          </div>

          {/* Extra dark section content */}
          {darkSectionContent && (
            <div className="mb-12">{darkSectionContent}</div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {ctas.map((cta) =>
              cta.primary ? (
                <button
                  key={cta.href}
                  onClick={() => navigate(cta.href)}
                  className="btn-sketch text-base px-8 py-4"
                >
                  {cta.label}
                </button>
              ) : (
                <button
                  key={cta.href}
                  onClick={() => navigate(cta.href)}
                  className="font-body font-bold text-base border-2 border-white/30 text-white/80 px-8 py-4 hover:border-[#F7931A] hover:text-[#F7931A] transition-colors"
                >
                  {cta.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Footer strip */}
        <div className="border-t border-white/5 mt-4">
          <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
            <span className="font-handwritten text-white/25 text-base">bitQoin</span>
            <span className="font-handwritten text-white/20 text-sm">Solana + Ethereum</span>
          </div>
        </div>
      </section>
    </div>
  );
}
