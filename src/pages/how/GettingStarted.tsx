import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchTwoKeys, SketchShield, SketchKey, SketchCheckmark, SketchCoin } from "@/components/sketches";
import { ChainLogos } from "@/components/ChainLogos";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <line x1="130" y1="140" x2="260" y2="140" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <line x1="260" y1="140" x2="280" y2="130" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <line x1="260" y1="140" x2="280" y2="150" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <line x1="390" y1="140" x2="520" y2="140" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <line x1="520" y1="140" x2="540" y2="130" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <line x1="520" y1="140" x2="540" y2="150" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <line x1="650" y1="140" x2="780" y2="140" stroke="#F7931A" strokeWidth="1.5" opacity="0.5"/>
    <g transform="translate(70,140)" opacity="1">
      <circle r="55" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.08)"/>
      <circle r="40" stroke="#F7931A" strokeWidth="1" fill="none" opacity="0.4"/>
      <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#F7931A" fontSize="28" fontWeight="bold" fontFamily="serif">01</text>
    </g>
    <g transform="translate(320,140)" opacity="1">
      <circle r="65" stroke="#F7931A" strokeWidth="2" fill="rgba(247,147,26,0.12)"/>
      <circle r="50" stroke="#F7931A" strokeWidth="1.2" fill="none" opacity="0.45"/>
      <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#F7931A" fontSize="34" fontWeight="bold" fontFamily="serif">02</text>
    </g>
    <g transform="translate(590,140)" opacity="0.95">
      <circle r="55" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.1)"/>
      <circle r="40" stroke="#F7931A" strokeWidth="1" fill="none" opacity="0.4"/>
      <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#F7931A" fontSize="28" fontWeight="bold" fontFamily="serif">03</text>
    </g>
    <g transform="translate(830,100)" opacity="0.6">
      <path d="M-6,0 L-2,5 L8,-6" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle r="18" stroke="rgba(247,147,26,0.5)" strokeWidth="1.2" fill="none"/>
    </g>
    <circle cx="200" cy="220" r="4" stroke="white" strokeWidth="1" fill="none" opacity="0.15"/>
    <circle cx="500" cy="230" r="5" stroke="white" strokeWidth="1" fill="none" opacity="0.12"/>
    <circle cx="750" cy="215" r="4" stroke="white" strokeWidth="1" fill="none" opacity="0.15"/>
  </svg>
);

export default function GettingStarted() {
  const { t, dark } = useApp();
  const s = t.subpages.gettingStarted;
  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const steps = [
    { n: "01", icon: <SketchTwoKeys className="w-10 h-10" />, title: t.how.step1title, desc: t.how.step1desc, note: t.how.step1note },
    { n: "02", icon: <ChainLogos size={40} />, title: t.how.step2title, desc: t.how.step2desc, note: t.how.step2note },
    { n: "03", icon: <SketchShield className="w-10 h-10" />, title: t.how.step3title, desc: t.how.step3desc, note: t.how.step3note },
  ];

  const darkContent = (
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { label: "No Account", sub: "No signup. No KYC. No email address." },
        { label: "No Server", sub: "Keys generated locally in your browser. Always." },
        { label: "60 Seconds", sub: "From zero to protected in under a minute." },
      ].map((item) => (
        <div key={item.label} className="bg-white/[0.04] border border-white/10 p-5 text-center">
          <div className="font-sketch text-2xl text-[#F7931A] mb-1">{item.label}</div>
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
        <div className="relative w-44 h-44 flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <SketchCoin className="w-36 h-36 opacity-85" />
          </div>
          <div className="absolute bottom-0 right-0">
            <SketchKey className="w-16 h-16 opacity-60" />
          </div>
          <div className="absolute top-2 left-0">
            <SketchCheckmark className="w-10 h-10 opacity-50 text-[#F7931A]" />
          </div>
        </div>
      }
      quote={s.handwritten}
      darkSectionContent={darkContent}
      ctas={[
        { label: t.hero.ctaCreate, href: "/qoin/create", primary: true },
        { label: t.nav.subHow[1].label + " →", href: "/how/protocol" },
      ]}
    >
      <div className="space-y-10">
        <p className={`font-body font-bold text-lg leading-relaxed ${text}`}>{s.p1}</p>
        <div className="space-y-5">
          {steps.map((step) => (
            <div key={step.n} className={`border-2 ${cardBg} p-6 flex items-start gap-5`}>
              <div className="font-sketch text-3xl text-[#F7931A] flex-shrink-0 w-12">{step.n}</div>
              <div className="flex-shrink-0 opacity-70">{step.icon}</div>
              <div className="flex-1">
                <div className={`font-sketch text-xl mb-2 ${text}`}>{step.title}</div>
                <p className={`font-body font-bold text-sm leading-relaxed mb-3 ${muted}`}>{step.desc}</p>
                <div className="border-l-2 border-[#F7931A] pl-3">
                  <p className={`font-handwritten text-base ${muted}`}>{step.note}</p>
                </div>
              </div>
              <div className="ml-auto flex-shrink-0 self-center">
                <SketchCheckmark className="w-7 h-7 opacity-30" />
              </div>
            </div>
          ))}
        </div>

        <div className={`border-t ${divider} pt-8`}>
          <div className={`font-sketch text-2xl mb-6 ${text}`}>Before You Start</div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className={`border-2 ${cardBg} p-5`}>
              <div className={`font-sketch text-lg mb-3 ${text}`}>What You Will Need</div>
              <ul className="space-y-2">
                {[
                  "A browser with internet access",
                  "Gas fees covered by BITQ, free during beta",
                  "For cold key mode: both private keys stored securely in separate locations",
                  "For Solana wallet connect: Phantom and Solflare browser extensions",
                  "For Ethereum wallet connect: two MetaMask accounts (separate browser profiles recommended)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#F7931A] mt-0.5">+</span>
                    <span className={`font-body font-bold text-sm ${muted}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`border-2 ${cardBg} p-5`}>
              <div className={`font-sketch text-lg mb-3 ${text}`}>What You Will Not Need</div>
              <ul className="space-y-2">
                {[
                  "An account or registration of any kind",
                  "An email address or phone number",
                  "Identity verification or KYC",
                  "A trusted third party or custodian",
                  "Any SOL or ETH for gas during beta",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span style={{ color: "#ef4444" }} className="mt-0.5">x</span>
                    <span className={`font-body font-bold text-sm ${muted}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={`border-l-4 border-[#F7931A] pl-5 py-3 ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8EE]"} pr-5`}>
          <div className="font-handwritten text-xl text-[#F7931A] mb-1">Important</div>
          <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>
            If you use cold key mode: save both private keys immediately after creation. They are shown once. There is no recovery mechanism. Write them on paper and store them in physically separate, secure locations. If you use wallet connect mode: your Phantom, Solflare, or MetaMask wallets are responsible for key security. Treat them accordingly.
          </p>
        </div>
      </div>
    </SubpageLayout>
  );
}
