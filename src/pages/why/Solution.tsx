import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchShield, SketchTwoKeys, SketchLock, SketchCheckmark, SketchNetwork } from "@/components/sketches";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <line x1="80" y1="80" x2="300" y2="50" stroke="white" strokeWidth="0.8" opacity="0.3"/>
    <line x1="300" y1="50" x2="520" y2="90" stroke="white" strokeWidth="0.8" opacity="0.3"/>
    <line x1="520" y1="90" x2="740" y2="55" stroke="white" strokeWidth="0.7" opacity="0.25"/>
    <line x1="300" y1="50" x2="300" y2="200" stroke="white" strokeWidth="0.5" opacity="0.2"/>
    <line x1="520" y1="90" x2="520" y2="220" stroke="white" strokeWidth="0.5" opacity="0.2"/>
    <line x1="80" y1="80" x2="50" y2="220" stroke="white" strokeWidth="0.5" opacity="0.18"/>
    <line x1="740" y1="55" x2="780" y2="220" stroke="white" strokeWidth="0.5" opacity="0.18"/>
    <line x1="50" y1="220" x2="300" y2="200" stroke="white" strokeWidth="0.4" opacity="0.15"/>
    <line x1="300" y1="200" x2="520" y2="220" stroke="white" strokeWidth="0.4" opacity="0.15"/>
    <line x1="520" y1="220" x2="780" y2="220" stroke="white" strokeWidth="0.4" opacity="0.15"/>
    <g transform="translate(80,80)" opacity="0.9">
      <circle r="22" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.1)"/>
      <circle r="10" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
      <path d="M-5,0 L-2,4 L6,-5" stroke="#F7931A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </g>
    <g transform="translate(300,50)" opacity="1">
      <circle r="30" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.12)"/>
      <circle r="14" stroke="#F7931A" strokeWidth="2" fill="none"/>
      <path d="M-7,0 L-3,5 L8,-7" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </g>
    <g transform="translate(520,90)" opacity="0.9">
      <circle r="24" stroke="#F7931A" strokeWidth="1.2" fill="rgba(247,147,26,0.1)"/>
      <circle r="11" stroke="#F7931A" strokeWidth="1.8" fill="none"/>
      <path d="M-6,0 L-2,4 L7,-6" stroke="#F7931A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </g>
    <g transform="translate(740,55)" opacity="0.75">
      <circle r="18" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.08)"/>
      <circle r="8" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
      <path d="M-4,0 L-1.5,3 L5,-4" stroke="#F7931A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </g>
    <circle cx="50" cy="220" r="7" stroke="white" strokeWidth="1" fill="none" opacity="0.25"/>
    <circle cx="300" cy="200" r="6" stroke="white" strokeWidth="1" fill="none" opacity="0.22"/>
    <circle cx="520" cy="220" r="7" stroke="white" strokeWidth="1" fill="none" opacity="0.22"/>
    <circle cx="780" cy="220" r="8" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
  </svg>
);

export default function Solution() {
  const { t, dark } = useApp();
  const s = t.subpages.solution;
  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const darkContent = (
    <div className="grid md:grid-cols-2 gap-4">
      {[
        { icon: <SketchTwoKeys className="w-10 h-10" />, label: "Two Keys", sub: "Independent. Separate. Both required. Always." },
        { icon: <SketchLock className="w-10 h-10" />, label: "Protocol Lock", sub: "Solana program rejects incomplete signatures." },
        { icon: <SketchNetwork className="w-10 h-10" />, label: "On-Chain", sub: "No UI to hack. Math enforces every rule." },
        { icon: <SketchCheckmark className="w-10 h-10" />, label: "Client Side", sub: "Keys never touch a server. Ever." },
      ].map((item) => (
        <div key={item.label} className="bg-white/[0.04] border border-white/10 p-5 flex items-start gap-4">
          <div className="text-white/50 flex-shrink-0">{item.icon}</div>
          <div>
            <div className="font-sketch text-xl text-white mb-1">{item.label}</div>
            <div className="font-handwritten text-lg text-white/50">{item.sub}</div>
          </div>
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
        <div className="relative w-44 h-44 flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <SketchShield className="w-40 h-40 text-white opacity-85" />
          </div>
          <div className="absolute bottom-0 right-0">
            <SketchTwoKeys className="w-16 h-16 opacity-60" />
          </div>
        </div>
      }
      quote={s.handwritten}
      darkSectionContent={darkContent}
      ctas={[
        { label: t.hero.ctaCreate, href: "/qoin/create", primary: true },
        { label: t.nav.subWhy[2].label + " →", href: "/why/quantum" },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          {[s.p1, s.p2, s.p3].map((p, i) => (
            <p key={i} className={`font-body font-bold text-lg leading-relaxed ${text}`}>{p}</p>
          ))}
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>Why Two Keys Changes Everything</div>
            <p className={`font-body font-bold text-base leading-relaxed mb-3 ${muted}`}>
              The core insight is simple: a transfer requires both signatures simultaneously. There is no workaround. There is no admin key. There is no support team to call. The on-chain program enforces this with zero exceptions.
            </p>
            <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
              This means an attacker who compromises Key 1 cannot move anything. They have half the puzzle with no way to get the other half. Your second key is on a different device, in a different location, potentially in a different country. They would need to breach both simultaneously.
            </p>
          </div>
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>What the Program Checks</div>
            <div className="space-y-3">
              {[
                { label: "Both public keys registered", desc: "When you create a Qoin, both your public keys are written on-chain as the two required authorities." },
                { label: "Transaction built locally", desc: "Your browser builds and signs the transaction with Key 1. The signed transaction is passed to Key 2's signing environment." },
                { label: "Second signature added", desc: "Key 2 signs the already-signed transaction. The program verifies both signatures match the registered keys." },
                { label: "Network confirms", desc: "Only after both valid signatures are present does Solana's runtime accept and finalize the transaction." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[#F7931A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="font-sketch text-xs text-[#F7931A]">{i + 1}</span>
                  </div>
                  <div>
                    <div className={`font-sketch text-base mb-0.5 ${text}`}>{item.label}</div>
                    <p className={`font-body font-bold text-sm ${muted}`}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          {[
            { n: "01", title: "Generate locally", desc: "Two independent key pairs created in your browser. Nothing transmitted anywhere during generation." },
            { n: "02", title: "Register on-chain", desc: "Both public keys written to Solana as joint controllers. The program is now aware of your Qonjoint setup." },
            { n: "03", title: "Send requires both", desc: "Every transfer must be signed by Key 1 and Key 2. The program rejects anything less, automatically, every time." },
          ].map((step) => (
            <div key={step.n} className={`border-2 ${cardBg} p-5 flex items-start gap-5`}>
              <div className="font-sketch text-2xl text-[#F7931A] flex-shrink-0">{step.n}</div>
              <div>
                <div className={`font-sketch text-xl mb-1 ${text}`}>{step.title}</div>
                <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{step.desc}</p>
              </div>
            </div>
          ))}
          <div className={`border-2 ${cardBg} p-6`}>
            <div className={`font-sketch text-xl mb-4 ${text}`}>Security Properties</div>
            <div className="space-y-3">
              {[
                { label: "Quantum threat mitigation", status: true },
                { label: "Phishing partial mitigation", status: true },
                { label: "No custodial dependency", status: true },
                { label: "No server key storage", status: true },
                { label: "Program-enforced, not UI-enforced", status: true },
                { label: "Reversible if keys are recovered", status: true },
              ].map((prop) => (
                <div key={prop.label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: prop.status ? "#F7931A" : "#ef4444" }} />
                  <span className={`font-body font-bold text-sm ${muted}`}>{prop.label}</span>
                </div>
              ))}
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
