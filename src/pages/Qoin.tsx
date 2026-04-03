import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import Navbar from "@/components/Navbar";
import {
  SketchShield, SketchKey, SketchTwoKeys, SketchLock,
  SketchCoin, SketchCheckmark, SketchDecorLine, SketchStar,
} from "@/components/sketches";

export default function Qoin() {
  const [, navigate] = useLocation();
  const { dark } = useApp();

  const bg = dark ? "bg-[#0f0f0f] text-[#FAFAF5]" : "bg-[#FAFAF5] text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]";
  const cardShadow = dark ? "" : "shadow-[6px_6px_0_#1a1a1a]";
  const muted = dark ? "text-[#FAFAF5]/55" : "text-[#555]";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  return (
    <div className={`min-h-screen font-body ${bg}`}>
      <Navbar />

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center">
        <div className="flex justify-center mb-4">
          <SketchShield className="w-16 h-16 text-[#F7931A]" />
        </div>
        <h1 className="font-sketch text-5xl md:text-6xl leading-tight mb-4">
          Your{" "}
          <span className="text-[#F7931A]">Qoin</span>
        </h1>
        <SketchDecorLine className="w-40 mx-auto mb-6" />
        <p className={`text-lg md:text-xl max-w-xl mx-auto leading-relaxed ${muted}`}>
          Protected by the Qonjoint protocol. Two keys. One Qoin. No exceptions.
        </p>
      </section>

      {/* MAIN CARDS */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* CREATE CARD */}
          <button
            onClick={() => navigate("/qoin/create")}
            className={`text-left rounded-none border-2 p-8 transition-all duration-200 group cursor-pointer ${cardBg} ${cardShadow}`}
            style={{ outline: "none" }}
          >
            <div className="flex items-start justify-between mb-6">
              <SketchTwoKeys className="w-14 h-14 text-[#F7931A] group-hover:scale-110 transition-transform duration-200" />
              <span className={`font-handwritten text-sm ${muted}`}>New user?</span>
            </div>

            <h2 className="font-sketch text-3xl mb-3 group-hover:text-[#F7931A] transition-colors duration-200">
              Create Qoin
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${muted}`}>
              Generate a new Qonjoint-protected Qoin. You'll receive two keys. Keep them separate and secure.
            </p>

            <div className="space-y-2 mb-8">
              {[
                "Generate key pair on-device",
                "Choose your token deposit address",
                "No account, no email, no KYC",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <SketchCheckmark className="w-4 h-4 text-[#F7931A] flex-shrink-0" />
                  <span className={`text-xs ${muted}`}>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#F7931A] font-body font-semibold text-sm group-hover:gap-4 transition-all duration-200">
              <span>Create your Qoin</span>
              <span className="text-lg">→</span>
            </div>
          </button>

          {/* OPEN CARD */}
          <button
            onClick={() => navigate("/qoin/open")}
            className={`text-left rounded-none border-2 p-8 transition-all duration-200 group cursor-pointer ${cardBg} ${cardShadow}`}
            style={{ outline: "none" }}
          >
            <div className="flex items-start justify-between mb-6">
              <SketchLock className="w-14 h-14 text-[#F7931A] group-hover:scale-110 transition-transform duration-200" />
              <span className={`font-handwritten text-sm ${muted}`}>Returning?</span>
            </div>

            <h2 className="font-sketch text-3xl mb-3 group-hover:text-[#F7931A] transition-colors duration-200">
              Open Qoin
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${muted}`}>
              Access your existing Qoin. Provide both keys to verify ownership and view your balances.
            </p>

            <div className="space-y-2 mb-8">
              {[
                "Enter Key 1 and Key 2 to verify",
                "View Solana and SPL token balances",
                "Keys never leave your device",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <SketchCheckmark className="w-4 h-4 text-[#F7931A] flex-shrink-0" />
                  <span className={`text-xs ${muted}`}>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#F7931A] font-body font-semibold text-sm group-hover:gap-4 transition-all duration-200">
              <span>Open your Qoin</span>
              <span className="text-lg">→</span>
            </div>
          </button>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className={`border-t ${divider} py-10`}>
        <div className="max-w-4xl mx-auto px-6">
          <p className={`text-center font-handwritten text-lg mb-8 ${muted}`}>
            Why Qoin is different
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: SketchShield, label: "Quantum-resistant" },
              { icon: SketchKey,    label: "Two-key security" },
              { icon: SketchCoin,   label: "Multi-chain" },
              { icon: SketchStar,   label: "No custody" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3">
                <Icon className="w-9 h-9 text-[#F7931A]" />
                <span className={`text-xs font-body ${muted}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM NOTE */}
      <section className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className={`font-handwritten text-base ${muted}`}>
          Your keys never touch our servers. The math handles the rest.
        </p>
      </section>
    </div>
  );
}
