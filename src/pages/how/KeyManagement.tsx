import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchKey, SketchShield, SketchWarning, SketchLock, SketchTwoKeys } from "@/components/sketches";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <line x1="450" y1="40" x2="280" y2="130" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="450" y1="40" x2="620" y2="130" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="280" y1="130" x2="160" y2="210" stroke="#F7931A" strokeWidth="0.7" opacity="0.3"/>
    <line x1="280" y1="130" x2="320" y2="215" stroke="#F7931A" strokeWidth="0.7" opacity="0.3"/>
    <line x1="620" y1="130" x2="580" y2="215" stroke="#F7931A" strokeWidth="0.7" opacity="0.3"/>
    <line x1="620" y1="130" x2="740" y2="210" stroke="#F7931A" strokeWidth="0.7" opacity="0.3"/>
    <g transform="translate(450,40)" opacity="1">
      <circle r="32" stroke="#F7931A" strokeWidth="1.8" fill="rgba(247,147,26,0.12)"/>
      <circle r="18" stroke="#F7931A" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <rect x="-9" y="-5" width="18" height="15" rx="2" stroke="#F7931A" strokeWidth="2" fill="none"/>
      <path d="M-6,-5 L-6,-12 Q0,-17 6,-12 L6,-5" stroke="#F7931A" strokeWidth="2" fill="none"/>
      <circle cy="4" r="3" fill="#F7931A"/>
    </g>
    <g transform="translate(280,130)" opacity="0.9">
      <circle r="24" stroke="#F7931A" strokeWidth="1.2" fill="rgba(247,147,26,0.09)"/>
      <rect x="-8" y="-5" width="7" height="14" rx="1" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
      <rect x="1" y="-5" width="7" height="14" rx="1" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
    </g>
    <g transform="translate(620,130)" opacity="0.9">
      <circle r="24" stroke="#F7931A" strokeWidth="1.2" fill="rgba(247,147,26,0.09)"/>
      <rect x="-8" y="-5" width="7" height="14" rx="1" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
      <rect x="1" y="-5" width="7" height="14" rx="1" stroke="#F7931A" strokeWidth="1.5" fill="none"/>
    </g>
    <circle cx="160" cy="210" r="12" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <circle cx="320" cy="215" r="10" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <circle cx="580" cy="215" r="10" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <circle cx="740" cy="210" r="12" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <line x1="60" y1="140" x2="110" y2="140" stroke="white" strokeWidth="0.6" opacity="0.15"/>
    <circle cx="60" cy="140" r="5" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
    <line x1="790" y1="140" x2="840" y2="140" stroke="white" strokeWidth="0.6" opacity="0.15"/>
    <circle cx="840" cy="140" r="5" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
  </svg>
);

export default function KeyManagement() {
  const { t, dark } = useApp();
  const s = t.subpages.keyManagement;
  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const darkContent = (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="font-sketch text-xl text-[#F7931A] mb-3">Do</div>
        {[
          "Write keys on paper, not digital notes",
          "Store keys in physically separate locations",
          "Use tamper-evident bags or sealed envelopes",
          "Tell a trusted person where each key is stored",
          "Test recovery before depositing large amounts",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/[0.04] border border-white/8 px-4 py-2.5">
            <span className="text-[#F7931A] font-sketch mt-0.5">+</span>
            <span className="font-body font-bold text-sm text-white/70">{item}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="font-sketch text-xl mb-3" style={{ color: "#ef4444" }}>Do Not</div>
        {[
          "Store both keys in the same location",
          "Keep keys in a password manager alone",
          "Share either key with anyone for any reason",
          "Screenshot or photograph the keys",
          "Store them in cloud services like Drive or Notes",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/[0.04] border border-white/8 px-4 py-2.5">
            <span style={{ color: "#ef4444" }} className="font-sketch mt-0.5">x</span>
            <span className="font-body font-bold text-sm text-white/70">{item}</span>
          </div>
        ))}
      </div>
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
            <SketchTwoKeys className="w-36 h-36 opacity-85" />
          </div>
          <div className="absolute top-0 right-0">
            <SketchLock className="w-14 h-14 opacity-55" />
          </div>
        </div>
      }
      quote={s.handwritten}
      darkSectionContent={darkContent}
      ctas={[
        { label: t.hero.ctaCreate, href: "/qoin/create", primary: true },
        { label: t.nav.subProof[0].label + " →", href: "/proof/challenge" },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          {[s.p1, s.p2].map((p, i) => (
            <p key={i} className={`font-body font-bold text-lg leading-relaxed ${text}`}>{p}</p>
          ))}
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>The Core Rule</div>
            <p className={`font-body font-bold text-base leading-relaxed mb-4 ${muted}`}>
              The security of a Qonjoint vault is exactly as strong as the weakest link in how you store your two keys. If both keys are on the same device, you have not gained anything over a standard wallet.
            </p>
            <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
              The goal is to make it physically and logistically difficult for anyone to access both keys at the same time. Geographic separation is the most reliable method. Two keys, two cities, two locked boxes. That is the model to aim for.
            </p>
          </div>
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>Storage Options by Risk Level</div>
            <div className="space-y-3">
              {[
                { level: "Good", color: "#F7931A", method: "Paper in a safe", detail: "Offline, physical. Cannot be hacked remotely. Vulnerable to fire and flood." },
                { level: "Better", color: "#F7931A", method: "Metal backup plate", detail: "Fire resistant, waterproof. Engraved or stamped. Survives most physical disasters." },
                { level: "Best", color: "#F7931A", method: "Metal plate in bank vault", detail: "Geographic separation plus physical security. Highest protection for Key 2." },
                { level: "Avoid", color: "#ef4444", method: "Digital only storage", detail: "Password managers, cloud notes, email drafts. All subject to remote compromise." },
              ].map((item) => (
                <div key={item.level} className="flex items-start gap-3">
                  <span className="font-sketch text-sm w-14 flex-shrink-0" style={{ color: item.color }}>{item.level}</span>
                  <div>
                    <div className={`font-sketch text-base ${text}`}>{item.method}</div>
                    <p className={`font-body font-bold text-sm ${muted}`}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-[#F7931A]/10 border-2 border-[#F7931A]/30 p-5">
            <div className="flex items-start gap-4">
              <SketchWarning className="w-12 h-12 flex-shrink-0 text-[#F7931A]" />
              <div>
                <div className="font-sketch text-xl mb-2 text-[#F7931A]">Critical Rule</div>
                <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>
                  If you lose either key permanently, your tokens are inaccessible forever. There is no recovery. No support ticket. No override. The math does not have an exception for lost keys.
                </p>
              </div>
            </div>
          </div>
          <div className={`border-2 ${cardBg} p-6`}>
            <div className={`font-sketch text-xl mb-4 ${text}`}>Key 1 and Key 2 Strategy</div>
            <div className="space-y-4">
              {[
                { icon: <SketchKey className="w-10 h-10" />, title: "Key 1 Location", desc: "Your primary key. Keep it accessible enough to use when needed. A locked drawer at home, or a hardware key stored in a fireproof safe, works well." },
                { icon: <SketchKey className="w-10 h-10" />, title: "Key 2 Location", desc: "Your secondary key. This should be harder to access. A bank safety deposit box, a trusted family member's secure storage, or an offline device in a separate city." },
              ].map((item) => (
                <div key={item.title} className={`border-l-2 border-[#F7931A]/40 pl-4 pb-3 last:pb-0`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-[#F7931A] opacity-70">{item.icon}</div>
                    <div className={`font-sketch text-lg ${text}`}>{item.title}</div>
                  </div>
                  <p className={`font-body font-bold text-sm ${muted}`}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`border-2 ${cardBg} p-5`}>
            <div className={`font-sketch text-lg mb-3 ${text}`}>Before You Store Your Keys</div>
            <ul className="space-y-2">
              {[
                "Write the full private key string clearly, no abbreviations",
                "Note which key is Key 1 and which is Key 2",
                "Write your vault address alongside for reference",
                "Test that you can read the written key clearly",
                "Verify the key works before depositing real funds",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#F7931A] mt-0.5 font-sketch text-sm">{i + 1}.</span>
                  <span className={`font-body font-bold text-sm ${muted}`}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SubpageLayout>
  );
}
