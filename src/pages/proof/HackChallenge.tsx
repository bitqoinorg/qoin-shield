import { useState } from "react";
import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchKey, SketchTwoKeys, SketchShield, SketchX } from "@/components/sketches";

const PROOF_PUBKEY = "FNBTMRNyuYxPaFHSCZosmGqWLMcDQiVGLwbGGSgNnzmo";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <circle cx="450" cy="140" r="110" stroke="#F7931A" strokeWidth="1.5" opacity="0.35"/>
    <circle cx="450" cy="140" r="78" stroke="#F7931A" strokeWidth="1" opacity="0.25"/>
    <circle cx="450" cy="140" r="50" stroke="#F7931A" strokeWidth="0.8" opacity="0.2"/>
    <circle cx="450" cy="140" r="25" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.1)" opacity="0.6"/>
    <circle cx="450" cy="140" r="8" fill="#F7931A" opacity="0.5"/>
    <line x1="450" y1="20" x2="450" y2="260" stroke="white" strokeWidth="0.6" opacity="0.12"/>
    <line x1="330" y1="140" x2="570" y2="140" stroke="white" strokeWidth="0.6" opacity="0.12"/>
    <line x1="370" y1="55" x2="530" y2="225" stroke="white" strokeWidth="0.4" opacity="0.08"/>
    <line x1="530" y1="55" x2="370" y2="225" stroke="white" strokeWidth="0.4" opacity="0.08"/>
    <circle cx="450" cy="30" r="5" fill="#F7931A" opacity="0.4"/>
    <circle cx="450" cy="250" r="5" fill="#F7931A" opacity="0.4"/>
    <circle cx="340" cy="140" r="5" fill="#F7931A" opacity="0.4"/>
    <circle cx="560" cy="140" r="5" fill="#F7931A" opacity="0.4"/>
    <line x1="100" y1="80" x2="330" y2="140" stroke="white" strokeWidth="0.5" opacity="0.15"/>
    <line x1="800" y1="80" x2="570" y2="140" stroke="white" strokeWidth="0.5" opacity="0.15"/>
    <line x1="100" y1="200" x2="330" y2="140" stroke="white" strokeWidth="0.5" opacity="0.15"/>
    <line x1="800" y1="200" x2="570" y2="140" stroke="white" strokeWidth="0.5" opacity="0.15"/>
    <circle cx="100" cy="80" r="8" stroke="rgba(239,68,68,0.5)" strokeWidth="1.2" fill="rgba(239,68,68,0.05)"/>
    <line x1="96" y1="76" x2="104" y2="84" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <line x1="104" y1="76" x2="96" y2="84" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <circle cx="100" cy="200" r="8" stroke="rgba(239,68,68,0.5)" strokeWidth="1.2" fill="rgba(239,68,68,0.05)"/>
    <line x1="96" y1="196" x2="104" y2="204" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <line x1="104" y1="196" x2="96" y2="204" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <circle cx="800" cy="80" r="8" stroke="rgba(239,68,68,0.5)" strokeWidth="1.2" fill="rgba(239,68,68,0.05)"/>
    <line x1="796" y1="76" x2="804" y2="84" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <line x1="804" y1="76" x2="796" y2="84" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <circle cx="800" cy="200" r="8" stroke="rgba(239,68,68,0.5)" strokeWidth="1.2" fill="rgba(239,68,68,0.05)"/>
    <line x1="796" y1="196" x2="804" y2="204" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
    <line x1="804" y1="196" x2="796" y2="204" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"/>
  </svg>
);

export default function HackChallenge() {
  const { t, dark } = useApp();
  const s = t.subpages.hackChallenge;
  const proof = t.proof;
  const [copied, setCopied] = useState(false);

  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const doCopy = () => {
    navigator.clipboard.writeText(PROOF_PUBKEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const darkContent = (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      {[
        { value: "1", label: proof.statsPublished, color: "#F7931A" },
        { value: "2", label: proof.statsNeeded, color: "#ef4444" },
        { value: "1", label: proof.statsYouHave, color: "rgba(250,250,245,0.5)" },
      ].map((item) => (
        <div key={item.label} className="bg-white/[0.04] border border-white/10 p-5 text-center">
          <div className="font-sketch text-4xl mb-1" style={{ color: item.color }}>{item.value}</div>
          <div className="font-handwritten text-lg text-white/50">{item.label}</div>
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
            <SketchTwoKeys className="w-36 h-36 opacity-85" />
          </div>
          <div className="absolute bottom-0 right-0">
            <SketchShield className="w-14 h-14 opacity-60" />
          </div>
          <div className="absolute top-0 left-0">
            <SketchX className="w-10 h-10 opacity-40" />
          </div>
        </div>
      }
      quote="One key published. Two required. You do the math."
      darkSectionContent={darkContent}
      ctas={[
        { label: t.nav.subProof[1].label + " →", href: "/proof/balance", primary: true },
        { label: t.nav.openQoin, href: "/qoin/open" },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          <p className={`font-body font-bold text-lg leading-relaxed ${text}`}>{s.body}</p>
          <div className={`p-5 border-l-4 border-[#F7931A] ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8EE]"}`}>
            <p className={`font-body font-bold text-sm leading-relaxed ${text}`}>{proof.cannotMove}</p>
          </div>
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>The Math of the Challenge</div>
            <p className={`font-body font-bold text-base leading-relaxed mb-3 ${muted}`}>
              This Qoin holds real value on Solana mainnet. The public key is posted here, on-chain, and in public. Anyone can see the balance. Anyone can attempt to construct a transfer transaction. Without Key 2, no transfer will be accepted by the network.
            </p>
            <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
              The challenge is not to find the private key of Key 1. Even if you did, you would find that the Qonjoint protocol requires a second signature from a key that has never been published. You cannot derive it, guess it, or compute it from what is available.
            </p>
          </div>
          <div className={`border-t ${divider} pt-6`}>
            <div className={`font-sketch text-2xl mb-4 ${text}`}>Rules of the Challenge</div>
            <div className="space-y-3">
              {[
                { rule: "The Qoin is live on Solana mainnet" },
                { rule: "The balance is real and unprotected by any service" },
                { rule: "Key 1's public key is posted on this page" },
                { rule: "Key 2 has never been published anywhere" },
                { rule: "The Qonjoint protocol requires both keys to spend" },
                { rule: "The challenge has no end date" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F7931A] mt-2 flex-shrink-0"/>
                  <span className={`font-body font-bold text-sm ${muted}`}>{item.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={`border-2 ${cardBg} p-6`}>
            <div className="flex items-start gap-4 mb-5">
              <SketchKey className="w-10 h-10 flex-shrink-0 text-[#F7931A]" />
              <div>
                <div className={`font-sketch text-xl mb-1 ${text}`}>{proof.key1Title}</div>
                <div className={`font-handwritten text-base ${muted}`}>{proof.key1Sub}</div>
              </div>
            </div>
            <div className={`font-body font-bold text-xs tracking-widest uppercase mb-2 ${muted}`}>
              {proof.pubKeyLabel}
            </div>
            <div className={`font-mono text-xs break-all p-3 border mb-4 select-all ${
              dark ? "bg-[#0f0f0f] border-[#FAFAF5]/10 text-[#FAFAF5]/80" : "bg-[#FAFAF5] border-[#1a1a1a]/10 text-[#1a1a1a]/80"
            }`}>
              {PROOF_PUBKEY}
            </div>
            <button
              onClick={doCopy}
              className={`font-body font-bold text-sm px-5 py-2.5 border-2 transition-colors ${
                copied
                  ? "border-[#F7931A] text-[#F7931A]"
                  : dark
                  ? "border-[#FAFAF5]/20 text-[#FAFAF5]/60 hover:border-[#F7931A] hover:text-[#F7931A]"
                  : "border-[#1a1a1a]/20 text-[#1a1a1a]/60 hover:border-[#F7931A] hover:text-[#F7931A]"
              }`}
            >
              {copied ? "Copied" : proof.copyKey}
            </button>
          </div>

          <div className={`border-2 ${cardBg} p-6`}>
            <div className={`font-sketch text-xl mb-4 ${text}`}>What You Cannot Do</div>
            <div className="space-y-3">
              {[
                "Derive Key 2 from Key 1's public key",
                "Spend funds with only one signature",
                "Bypass the Qonjoint protocol",
                "Contact support to override the requirement",
                "Brute force secp256k1 on classical hardware",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span style={{ color: "#ef4444" }} className="font-sketch text-base flex-shrink-0">x</span>
                  <span className={`font-body font-bold text-sm ${muted}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`border-2 border-[#F7931A]/30 p-5 ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8EE]"}`}>
            <div className="font-handwritten text-xl text-[#F7931A] mb-2">If You Succeed</div>
            <p className={`font-body font-bold text-sm leading-relaxed ${muted}`}>
              If you can move the funds in this vault, you will have broken either the Qonjoint protocol or the underlying elliptic curve cryptography. Please publish your findings. The cryptography community would like to know immediately.
            </p>
          </div>
        </div>
      </div>
    </SubpageLayout>
  );
}
