import { useLocation } from "wouter";
import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchWarning, SketchKey, SketchX, SketchAtom } from "@/components/sketches";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <line x1="60" y1="70" x2="185" y2="130" stroke="white" strokeWidth="0.8" opacity="0.2" strokeDasharray="5,4"/>
    <line x1="215" y1="138" x2="365" y2="85" stroke="white" strokeWidth="0.8" opacity="0.2" strokeDasharray="5,4"/>
    <line x1="390" y1="80" x2="545" y2="148" stroke="white" strokeWidth="0.7" opacity="0.15" strokeDasharray="4,5"/>
    <line x1="575" y1="155" x2="745" y2="100" stroke="white" strokeWidth="0.7" opacity="0.15" strokeDasharray="4,5"/>
    <line x1="60" y1="70" x2="30" y2="230" stroke="white" strokeWidth="0.5" opacity="0.12" strokeDasharray="3,5"/>
    <line x1="365" y1="85" x2="295" y2="245" stroke="white" strokeWidth="0.5" opacity="0.1" strokeDasharray="3,5"/>
    <line x1="745" y1="100" x2="820" y2="255" stroke="white" strokeWidth="0.5" opacity="0.1" strokeDasharray="3,5"/>
    <g transform="translate(60,70)" opacity="0.9">
      <circle r="22" stroke="rgba(239,68,68,0.5)" strokeWidth="1" fill="rgba(239,68,68,0.06)"/>
      <path d="M0,-10 L9,6 L-9,6 Z" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.1)"/>
      <line x1="0" y1="-5" x2="0" y2="0" stroke="#F7931A" strokeWidth="1.5"/>
      <circle cy="3.5" r="1.2" fill="#F7931A"/>
    </g>
    <g transform="translate(370,83)" opacity="0.95">
      <circle r="28" stroke="rgba(239,68,68,0.45)" strokeWidth="1.2" fill="rgba(239,68,68,0.05)"/>
      <line x1="-10" y1="-10" x2="10" y2="10" stroke="rgba(239,68,68,0.8)" strokeWidth="2.2"/>
      <line x1="10" y1="-10" x2="-10" y2="10" stroke="rgba(239,68,68,0.8)" strokeWidth="2.2"/>
    </g>
    <g transform="translate(745,100)" opacity="0.75">
      <circle r="20" stroke="rgba(239,68,68,0.35)" strokeWidth="1" fill="rgba(239,68,68,0.04)"/>
      <path d="M0,-9 L7,5 L-7,5 Z" stroke="#F7931A" strokeWidth="1.3" fill="none"/>
      <circle cy="2.5" r="1" fill="#F7931A"/>
    </g>
    <circle cx="200" cy="134" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" fill="none"/>
    <circle cx="555" cy="152" r="5" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none"/>
    <circle cx="30" cy="230" r="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
    <circle cx="295" cy="245" r="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none"/>
    <circle cx="820" cy="255" r="6" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none"/>
    <rect x="690" y="175" width="8" height="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
    <rect x="704" y="170" width="6" height="6" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none"/>
    <rect x="698" y="183" width="7" height="7" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none"/>
  </svg>
);

export default function Problem() {
  const [, navigate] = useLocation();
  const { t, dark } = useApp();
  const s = t.subpages.problem;
  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const darkContent = (
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { icon: <SketchKey className="w-10 h-10" />, label: "One Key", sub: "Controls everything. Loses everything. No exceptions." },
        { icon: <SketchX className="w-10 h-10" />, label: "One Failure", sub: "Phish, breach, quantum. Any single attack ends it." },
        { icon: <SketchAtom className="w-10 h-10" />, label: "Zero Recovery", sub: "No backup system. No undo. Permanently gone." },
      ].map((item) => (
        <div key={item.label} className="bg-white/[0.04] border border-white/10 p-5">
          <div className="text-white/50 mb-3">{item.icon}</div>
          <div className="font-sketch text-xl text-white mb-1">{item.label}</div>
          <div className="font-handwritten text-lg text-white/50">{item.sub}</div>
        </div>
      ))}
    </div>
  );

  return (
    <SubpageLayout
      badge={s.badge}
      title={s.title}
      heroDecor={<HeroDecor />}
      Illustration={
        <div className="relative w-48 h-48 flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <SketchWarning className="w-40 h-40 text-white opacity-80" />
          </div>
          <div className="absolute bottom-2 right-0">
            <SketchKey className="w-16 h-16 opacity-60" />
          </div>
          <div className="absolute top-2 left-0">
            <SketchX className="w-10 h-10 opacity-40" />
          </div>
        </div>
      }
      quote={s.handwritten}
      darkSectionContent={darkContent}
      ctas={[
        { label: t.nav.subWhy[1].label + " →", href: "/why/solution", primary: true },
        { label: t.hero.ctaCreate, href: "/qoin/create" },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          {[s.p1, s.p2, s.p3].map((p, i) => (
            <p key={i} className={`font-body font-bold text-lg leading-relaxed ${text}`}>{p}</p>
          ))}
          <div className={`border-t ${divider} pt-6 space-y-4`}>
            <div className={`font-sketch text-2xl ${text}`}>Why This Is Structural</div>
            <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
              Standard wallets inherit a fundamental design assumption from the early internet: one identity equals one secret. That worked when stakes were low. When you hold real value, one secret is one catastrophic failure point.
            </p>
            <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
              Hardware wallets protect against device theft. Seed phrases protect against device loss. Neither protects you from phishing that captures your live key, supply chain attacks on the hardware itself, or a quantum computer that derives your private key from a public key you have already broadcast on-chain.
            </p>
          </div>
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>The Four Attack Vectors</div>
            <div className="space-y-3">
              {[
                { n: "01", threat: "Phishing", detail: "Fake interfaces capture your key or seed phrase at input time. A single-key wallet has no second layer to stop a transfer once this happens." },
                { n: "02", threat: "Exchange Breach", detail: "Custodial platforms hold keys centrally. One breach exposes millions of accounts simultaneously." },
                { n: "03", threat: "Quantum Computing", detail: "Shor's algorithm derives a private key from any broadcast public key. Every standard wallet is already a future target." },
                { n: "04", threat: "Physical Extraction", detail: "Hardware wallets can be attacked if an adversary has physical access. A single key means a single point of extraction." },
              ].map((item) => (
                <div key={item.n} className="border-l-2 border-[#F7931A]/40 pl-4 py-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-handwritten text-[#F7931A] text-sm">{item.n}</span>
                    <span className={`font-sketch text-lg ${text}`}>{item.threat}</span>
                  </div>
                  <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={`border-2 ${cardBg} p-6`}>
            <div className="flex items-start gap-4">
              <SketchWarning className="w-12 h-12 flex-shrink-0 text-[#F7931A]" />
              <div>
                <div className={`font-sketch text-xl mb-2 ${text}`}>{t.why.threat1Title}</div>
                <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{t.why.threat1Desc}</p>
              </div>
            </div>
          </div>
          <div className={`border-2 ${cardBg} p-6`}>
            <div className="flex items-start gap-4">
              <SketchAtom className="w-12 h-12 flex-shrink-0 text-[#F7931A]" />
              <div>
                <div className={`font-sketch text-xl mb-2 ${text}`}>{t.why.threat2Title}</div>
                <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{t.why.threat2Desc}</p>
              </div>
            </div>
          </div>
          <div className={`border-2 ${cardBg} p-6`}>
            <div className={`font-sketch text-xl mb-4 ${text}`}>Standard Wallet vs Qonjoint</div>
            <div className="space-y-0">
              {[
                { label: "Keys required to send", single: "1", qoin: "2" },
                { label: "Quantum resistant", single: "No", qoin: "Structurally yes" },
                { label: "Phishing drains wallet", single: "Yes", qoin: "Partial only" },
                { label: "Recovery mechanism", single: "Seed phrase only", qoin: "Both keys required" },
                { label: "On-chain enforcement", single: "No", qoin: "Program level" },
              ].map((row) => (
                <div key={row.label} className={`grid grid-cols-3 gap-2 py-2.5 border-b ${divider} last:border-0 text-sm`}>
                  <div className={`font-body font-bold ${muted}`}>{row.label}</div>
                  <div className="font-body font-bold text-center" style={{ color: "#ef4444" }}>{row.single}</div>
                  <div className="font-body font-bold text-center text-[#F7931A]">{row.qoin}</div>
                </div>
              ))}
              <div className={`grid grid-cols-3 gap-2 pt-2 text-xs ${muted}`}>
                <div></div>
                <div className="text-center font-body font-bold">Standard</div>
                <div className="text-center font-body font-bold text-[#F7931A]">Qoin</div>
              </div>
            </div>
          </div>
          <div className="bg-[#F7931A]/10 border-2 border-[#F7931A]/30 p-5">
            <div className="font-handwritten text-2xl text-[#F7931A] mb-2">{t.why.solutionTitle}</div>
            <p className={`font-body font-bold text-sm ${muted}`}>{t.why.solutionDesc}</p>
          </div>
        </div>
      </div>
    </SubpageLayout>
  );
}
