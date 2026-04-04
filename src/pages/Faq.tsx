import { useState } from "react";
import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchShield, SketchCoin, SketchNetwork } from "@/components/sketches";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <text x="90" y="180" fill="#F7931A" fontSize="120" opacity="0.12" fontFamily="serif" fontWeight="bold">?</text>
    <text x="320" y="140" fill="white" fontSize="80" opacity="0.07" fontFamily="serif" fontWeight="bold">?</text>
    <text x="530" y="200" fill="#F7931A" fontSize="100" opacity="0.1" fontFamily="serif" fontWeight="bold">?</text>
    <text x="730" y="160" fill="white" fontSize="65" opacity="0.08" fontFamily="serif" fontWeight="bold">?</text>
    <circle cx="60" cy="70" r="22" stroke="#F7931A" strokeWidth="1" fill="none" opacity="0.25"/>
    <circle cx="60" cy="70" r="14" stroke="#F7931A" strokeWidth="0.7" fill="none" opacity="0.15"/>
    <circle cx="230" cy="220" r="18" stroke="white" strokeWidth="1" fill="none" opacity="0.12"/>
    <circle cx="430" cy="50" r="25" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.05)" opacity="0.3"/>
    <circle cx="700" cy="230" r="20" stroke="white" strokeWidth="1" fill="none" opacity="0.12"/>
    <circle cx="850" cy="60" r="16" stroke="#F7931A" strokeWidth="0.8" fill="none" opacity="0.2"/>
    <line x1="60" y1="70" x2="230" y2="220" stroke="white" strokeWidth="0.4" opacity="0.08"/>
    <line x1="430" y1="50" x2="700" y2="230" stroke="white" strokeWidth="0.4" opacity="0.08"/>
    <line x1="60" y1="70" x2="430" y2="50" stroke="white" strokeWidth="0.4" opacity="0.06"/>
    <line x1="850" y1="60" x2="700" y2="230" stroke="white" strokeWidth="0.4" opacity="0.06"/>
    <rect x="750" y="150" width="10" height="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none"/>
    <rect x="765" y="145" width="8" height="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
    <rect x="140" y="120" width="8" height="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
    <rect x="152" y="126" width="6" height="6" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none"/>
  </svg>
);

export default function Faq() {
  const { t, dark } = useApp();
  const faq = t.faq;
  const [open, setOpen] = useState<number | null>(null);

  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const quickAnswers = [
    { q: "Is this custodial?", a: "No. Your keys never leave your device. bitQoin never holds or sees your private keys." },
    { q: "What chains does this support?", a: "Solana mainnet and Ethereum mainnet. The Qonjoint protocol enforces dual-key signing on both." },
    { q: "Can I recover a lost key?", a: "No. There is no recovery mechanism. Both keys must be backed up securely by you." },
    { q: "Is there an app or extension?", a: "No installation needed. Everything runs in your browser. No extension, no app." },
    { q: "What does 'Qonjoint' mean?", a: "It is the brand name for bitQoin's dual-key vault protocol. Joint control, enforced on-chain." },
    { q: "Who holds the second key?", a: "You do. Both keys are generated and stored by you. No third party is involved." },
  ];

  const darkContent = (
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { icon: <SketchShield className="w-9 h-9" />, label: "Non-Custodial", sub: "Your keys, your coins. No third party." },
        { icon: <SketchCoin className="w-9 h-9" />, label: "Solana Native", sub: "Qonjoint. Program-enforced. Battle-tested." },
        { icon: <SketchNetwork className="w-9 h-9" />, label: "Open Protocol", sub: "Verifiable on-chain. No black box." },
      ].map((item) => (
        <div key={item.label} className="bg-white/[0.04] border border-white/10 p-5 flex items-start gap-4">
          <div className="text-white/50 flex-shrink-0">{item.icon}</div>
          <div>
            <div className="font-sketch text-xl text-white mb-1">{item.label}</div>
            <div className="font-handwritten text-base text-white/50">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <SubpageLayout
      badge="FAQ"
      title={faq.title}
      heroDecor={<HeroDecor />}
      Illustration={
        <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
          <span className="font-sketch text-[120px] text-white opacity-25 leading-none">?</span>
        </div>
      }
      quote="If the math says no, the answer is no."
      darkSectionContent={darkContent}
      ctas={[
        { label: t.hero.ctaCreate, href: "/qoin/create", primary: true },
        { label: t.nav.openQoin, href: "/qoin/open" },
      ]}
    >
      <div className="space-y-10">
        <p className={`font-body font-bold text-lg ${muted}`}>{t.subpages?.faqPage?.subtitle ?? "Everything you need to know about Qoin, Qonjoint protection, and how it all works."}</p>

        <div className="space-y-3">
          {faq.items.map((item, i) => (
            <div key={i} className={`border-2 ${cardBg}`}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className={`w-full text-left px-5 py-4 flex items-start justify-between gap-3 ${text}`}
              >
                <span className="font-sketch text-xl leading-snug">{item.q}</span>
                <svg
                  width="18" height="18" viewBox="0 0 18 18" fill="none"
                  className={`flex-shrink-0 mt-1 transition-transform text-[#F7931A] ${open === i ? "rotate-180" : ""}`}
                >
                  <path d="M3 6l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {open === i && (
                <div className={`px-5 pb-5 border-t ${dark ? "border-[#FAFAF5]/8" : "border-[#1a1a1a]/8"}`}>
                  <p className={`font-body font-bold text-base leading-relaxed pt-4 ${muted}`}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`border-t ${divider} pt-10`}>
          <div className={`font-sketch text-2xl mb-6 ${text}`}>Quick Answers</div>
          <div className="grid md:grid-cols-2 gap-4">
            {quickAnswers.map((qa, i) => (
              <div key={i} className={`border-2 ${cardBg} p-5`}>
                <div className={`font-sketch text-base mb-2 ${text}`}>{qa.q}</div>
                <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{qa.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`border-t ${divider} pt-10`}>
          <div className={`font-sketch text-2xl mb-6 ${text}`}>Still Have Questions?</div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className={`font-body font-bold text-base leading-relaxed mb-4 ${muted}`}>
                bitQoin is an open-source project. If you have a question that is not covered here, the best place to look is the source code itself, or to raise it in the community on GitHub.
              </p>
              <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
                For security disclosures, please use the GitHub repository's security advisory system rather than posting publicly. We take all reports seriously and will respond promptly.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "GitHub", desc: "Source code, issues, and security advisories", href: "https://github.com/bitqoinorg" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-start gap-3 p-4 border-2 ${cardBg} hover:border-[#F7931A] transition-colors group`}
                >
                  <div className="flex-1">
                    <div className={`font-sketch text-lg group-hover:text-[#F7931A] transition-colors ${text}`}>{link.label}</div>
                    <div className={`font-body font-bold text-sm ${muted}`}>{link.desc}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 text-[#F7931A] opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="M3 13L13 3M13 3H6M13 3V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SubpageLayout>
  );
}
