import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchShield, SketchTwoKeys, SketchAtom, SketchLock, SketchKey, SketchNetwork } from "@/components/sketches";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <line x1="120" y1="90" x2="390" y2="140" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="120" y1="190" x2="390" y2="140" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="390" y1="140" x2="660" y2="140" stroke="#F7931A" strokeWidth="1.2" opacity="0.55"/>
    <line x1="120" y1="90" x2="60" y2="60" stroke="white" strokeWidth="0.5" opacity="0.18"/>
    <line x1="120" y1="190" x2="60" y2="220" stroke="white" strokeWidth="0.5" opacity="0.18"/>
    <line x1="660" y1="140" x2="800" y2="100" stroke="white" strokeWidth="0.5" opacity="0.18"/>
    <line x1="660" y1="140" x2="800" y2="180" stroke="white" strokeWidth="0.5" opacity="0.18"/>
    <g transform="translate(120,90)" opacity="0.85">
      <circle r="24" stroke="#F7931A" strokeWidth="1.2" fill="rgba(247,147,26,0.1)"/>
      <rect x="-9" y="-8" width="8" height="16" rx="1" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
      <rect x="1" y="-8" width="8" height="16" rx="1" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
      <circle cx="-5" cy="3" r="2" fill="#F7931A" opacity="0.6"/>
      <circle cx="5" cy="3" r="2" fill="#F7931A" opacity="0.6"/>
    </g>
    <g transform="translate(120,190)" opacity="0.8">
      <circle r="22" stroke="#F7931A" strokeWidth="1" fill="rgba(247,147,26,0.08)"/>
      <rect x="-9" y="-7" width="8" height="14" rx="1" stroke="#F7931A" strokeWidth="1.3" fill="none"/>
      <rect x="1" y="-7" width="8" height="14" rx="1" stroke="#F7931A" strokeWidth="1.3" fill="none"/>
      <circle cx="-5" cy="2" r="1.5" fill="#F7931A" opacity="0.6"/>
      <circle cx="5" cy="2" r="1.5" fill="#F7931A" opacity="0.6"/>
    </g>
    <g transform="translate(390,140)" opacity="1">
      <circle r="36" stroke="#F7931A" strokeWidth="1.8" fill="rgba(247,147,26,0.14)"/>
      <circle r="20" stroke="#F7931A" strokeWidth="1.4" fill="none" opacity="0.6"/>
      <rect x="-8" y="-4" width="16" height="14" rx="2" stroke="#F7931A" strokeWidth="2" fill="none"/>
      <path d="M-5,-4 L-5,-10 Q0,-15 5,-10 L5,-4" stroke="#F7931A" strokeWidth="2" fill="none"/>
      <circle cy="4" r="3" fill="#F7931A"/>
    </g>
    <g transform="translate(660,140)" opacity="0.9">
      <circle r="28" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.12)"/>
      <path d="M-8,0 L-3,5 L10,-7" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </g>
    <circle cx="60" cy="60" r="6" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <circle cx="60" cy="220" r="6" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <circle cx="800" cy="100" r="5" stroke="white" strokeWidth="1" fill="none" opacity="0.18"/>
    <circle cx="800" cy="180" r="5" stroke="white" strokeWidth="1" fill="none" opacity="0.18"/>
    <line x1="530" y1="50" x2="570" y2="50" stroke="white" strokeWidth="1" opacity="0.12"/>
    <line x1="550" y1="30" x2="550" y2="70" stroke="white" strokeWidth="1" opacity="0.12"/>
    <line x1="530" y1="230" x2="570" y2="230" stroke="white" strokeWidth="1" opacity="0.12"/>
    <line x1="550" y1="210" x2="550" y2="250" stroke="white" strokeWidth="1" opacity="0.12"/>
  </svg>
);

export default function QonjointProtocol() {
  const { t, dark } = useApp();
  const s = t.subpages.protocol;
  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const flow = [
    { icon: <SketchTwoKeys className="w-8 h-8" />, label: "Two Keys Registered", desc: "Your two public keys are written on-chain as Qonjoint controllers of your Qoin." },
    { icon: <SketchShield className="w-8 h-8" />, label: "Transfer Requested", desc: "Any attempt to move tokens triggers the Qonjoint check on-chain." },
    { icon: <SketchKey className="w-8 h-8" />, label: "Key 1 Signs", desc: "The transaction is built locally and signed by Key 1. In cold key mode: your first private key. In wallet connect mode: Phantom on Solana, or your first MetaMask account on Ethereum." },
    { icon: <SketchKey className="w-8 h-8" />, label: "Key 2 Signs", desc: "The partially-signed transaction is then signed by Key 2. In cold key mode: your second private key. In wallet connect mode: Solflare on Solana, or your second MetaMask account on Ethereum." },
    { icon: <SketchNetwork className="w-8 h-8" />, label: "Program Confirms", desc: "The on-chain program verifies both signatures match the registered keys. Transfer proceeds." },
  ];

  const darkContent = (
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { icon: <SketchTwoKeys className="w-9 h-9" />, label: "2 Signers", sub: "Both keys must sign. Neither alone is enough." },
        { icon: <SketchNetwork className="w-9 h-9" />, label: "On-Chain Logic", sub: "Program enforces the rule. No UI bypass possible." },
        { icon: <SketchAtom className="w-9 h-9" />, label: "Quantum Resistant", sub: "Double the keys to crack simultaneously." },
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
      badge={s.badge}
      title={s.title}
      heroDecor={<HeroDecor />}
      Illustration={
        <div className="relative w-44 h-44 flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <SketchLock className="w-36 h-36 opacity-85" />
          </div>
          <div className="absolute top-0 left-0">
            <SketchKey className="w-14 h-14 opacity-55" />
          </div>
          <div className="absolute bottom-0 right-0">
            <SketchAtom className="w-14 h-14 opacity-55" />
          </div>
        </div>
      }
      quote={s.handwritten}
      darkSectionContent={darkContent}
      ctas={[
        { label: t.hero.ctaCreate, href: "/qoin/create", primary: true },
        { label: t.nav.subHow[2].label + " →", href: "/how/keys" },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          {[s.p1, s.p2].map((p, i) => (
            <p key={i} className={`font-body font-bold text-lg leading-relaxed ${text}`}>{p}</p>
          ))}
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-5 ${text}`}>Transaction Flow</div>
            <div className="relative space-y-0">
              {flow.map((step, i) => (
                <div key={i} className="flex items-start gap-4 pb-5">
                  <div className="relative flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full border-2 border-[#F7931A]/50 bg-[#F7931A]/10 flex items-center justify-center text-[#F7931A]">
                      {step.icon}
                    </div>
                    {i < flow.length - 1 && (
                      <div className="w-px h-full bg-[#F7931A]/20 absolute top-10 left-1/2 -translate-x-1/2" style={{ height: "calc(100% - 2.5rem)" }} />
                    )}
                  </div>
                  <div className="pt-1 pb-3">
                    <div className={`font-sketch text-lg mb-1 ${text}`}>{step.label}</div>
                    <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={`border-2 ${cardBg} p-6`}>
            <div className={`font-sketch text-xl mb-4 ${text}`}>What Makes This Different</div>
            <div className="space-y-4">
              {[
                { title: "Not a smart contract wallet", body: "On Solana, Qonjoint uses the native signing program with no custom contract. On Ethereum, it uses a battle-tested on-chain Qoin account with a decade of production security." },
                { title: "Not custodial", body: "No server holds your keys. You generate, store, and use them. The program verifies them. Nobody in between." },
                { title: "Not reversible by design", body: "There is no admin key, no override mechanism, no emergency bypass. If both keys sign, the transaction goes through. If they do not, it does not." },
              ].map((item) => (
                <div key={item.title} className={`border-l-2 border-[#F7931A]/40 pl-4 py-1`}>
                  <div className={`font-sketch text-base mb-1 ${text}`}>{item.title}</div>
                  <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`border-2 ${cardBg} p-6`}>
            <div className={`font-sketch text-xl mb-4 ${text}`}>Protocol Guarantees</div>
            <div className="space-y-2.5">
              {[
                "Both keys must sign every outgoing transfer",
                "Public keys are immutable after Qoin creation",
                "No third party can override the signature requirement",
                "Failed partial signatures do not move funds",
                "The rule is enforced by the blockchain, not UI code",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F7931A] mt-2 flex-shrink-0"/>
                  <span className={`font-body font-bold text-sm leading-relaxed ${muted}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`border-2 border-[#F7931A]/30 p-5 ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8EE]"}`}>
            <div className="font-handwritten text-xl text-[#F7931A] mb-2">Under the Hood</div>
            <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>
              Qonjoint creates a dual-key Qoin account. This account becomes the authority over your token accounts. Any transfer instruction must include signatures from both registered keys or the network rejects it at the protocol level.
            </p>
          </div>
        </div>
      </div>
    </SubpageLayout>
  );
}
