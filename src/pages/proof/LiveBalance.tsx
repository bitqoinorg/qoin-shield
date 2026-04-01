import { useState, useEffect, useCallback } from "react";
import SubpageLayout from "@/components/SubpageLayout";
import { useApp } from "@/contexts/AppContext";
import { SketchShield, SketchCoin, SketchNetwork } from "@/components/sketches";
import { explorerAddressUrl } from "@/lib/solana";

const TREASURY_VAULT = "6TkW8UojBM9g9uanoSGHzm24DJwmu8333yaBMHbrGKR5";
const SOL_LOGO = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

const HeroDecor = () => (
  <svg viewBox="0 0 900 280" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <line x1="80" y1="200" x2="160" y2="150" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="160" y1="150" x2="240" y2="180" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="240" y1="180" x2="320" y2="100" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="320" y1="100" x2="400" y2="130" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="400" y1="130" x2="480" y2="70" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="480" y1="70" x2="560" y2="110" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="560" y1="110" x2="640" y2="80" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="640" y1="80" x2="720" y2="120" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <line x1="720" y1="120" x2="820" y2="90" stroke="#F7931A" strokeWidth="0.9" opacity="0.4"/>
    <rect x="155" y="155" width="10" height="45" fill="#F7931A" opacity="0.25"/>
    <rect x="240" y="185" width="10" height="30" fill="#F7931A" opacity="0.2"/>
    <rect x="320" y="105" width="10" height="60" fill="#F7931A" opacity="0.3"/>
    <rect x="400" y="135" width="10" height="40" fill="#F7931A" opacity="0.22"/>
    <rect x="480" y="75" width="10" height="70" fill="#F7931A" opacity="0.35"/>
    <rect x="560" y="115" width="10" height="50" fill="#F7931A" opacity="0.25"/>
    <rect x="640" y="85" width="10" height="60" fill="#F7931A" opacity="0.3"/>
    <rect x="720" y="125" width="10" height="45" fill="#F7931A" opacity="0.22"/>
    <rect x="155" y="140" width="10" height="15" stroke="#F7931A" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <rect x="320" y="82" width="10" height="23" stroke="#F7931A" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <rect x="480" y="55" width="10" height="20" stroke="#F7931A" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <rect x="640" y="65" width="10" height="20" stroke="#F7931A" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <rect x="100" y="215" width="25" height="25" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15"/>
    <line x1="112" y1="215" x2="125" y2="215" stroke="white" strokeWidth="0.8" opacity="0.15"/>
    <rect x="135" y="215" width="25" height="25" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15"/>
    <line x1="147" y1="215" x2="160" y2="215" stroke="white" strokeWidth="0.8" opacity="0.15"/>
    <rect x="170" y="215" width="25" height="25" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15"/>
    <circle cx="820" cy="90" r="6" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
  </svg>
);

export default function LiveBalance() {
  const { t, dark } = useApp();
  const s = t.subpages.liveBalance;
  const proof = t.proof;

  const [sol, setSol] = useState<number | null>(null);
  const [tokens, setTokens] = useState<Array<{ mint: string; balance: number; name: string | null; symbol: string | null; logo: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const muted = dark ? "text-[#FAFAF5]/65" : "text-[#1a1a1a]/65";
  const text = dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]";
  const cardBg = dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/15";
  const divider = dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10";

  const fetchBalance = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/storaqe/balance?address=${TREASURY_VAULT}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json() as { solBalance: number; tokens: Array<{ mint: string; balance: number; name: string | null; symbol: string | null; logo: string | null }> };
      setSol(data.solBalance);
      setTokens(data.tokens || []);
    } catch {
      setError("Could not fetch balance. API may be unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const darkContent = (
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { icon: <SketchCoin className="w-9 h-9" />, label: "Real Vault", sub: "Live on Solana mainnet. Real tokens. Real address." },
        { icon: <SketchShield className="w-9 h-9" />, label: "Qonjoint Protected", sub: "Two keys required to spend. Published here for verification." },
        { icon: <SketchNetwork className="w-9 h-9" />, label: "Open to Inspect", sub: "View on any Solana explorer. All transactions are public." },
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
            <SketchCoin className="w-36 h-36 opacity-85" />
          </div>
          <div className="absolute bottom-0 right-0">
            <SketchShield className="w-16 h-16 opacity-60" />
          </div>
        </div>
      }
      quote="If the math says no, the answer is no."
      darkSectionContent={darkContent}
      ctas={[
        { label: t.hero.ctaCreate, href: "/qoin/create", primary: true },
        { label: t.nav.subProof[0].label + " →", href: "/proof/challenge" },
      ]}
    >
      <div className="space-y-8">
        <p className={`font-body font-bold text-lg ${muted}`}>{s.subtitle}</p>

        <div className={`border-2 ${cardBg} p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div className={`font-sketch text-xl ${text}`}>{proof.vaultLabel}</div>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className={`font-body font-bold text-sm px-4 py-2 border-2 transition-colors ${
                dark ? "border-[#FAFAF5]/20 text-[#FAFAF5]/60 hover:border-[#F7931A] hover:text-[#F7931A]" : "border-[#1a1a1a]/20 text-[#1a1a1a]/60 hover:border-[#F7931A] hover:text-[#F7931A]"
              }`}
            >
              {loading ? proof.loading : proof.refresh}
            </button>
          </div>

          <div className={`font-mono text-xs break-all p-3 border mb-4 ${
            dark ? "bg-[#0f0f0f] border-[#FAFAF5]/10 text-[#FAFAF5]/60" : "bg-[#FAFAF5] border-[#1a1a1a]/10 text-[#1a1a1a]/50"
          }`}>{TREASURY_VAULT}</div>

          <a
            href={explorerAddressUrl(TREASURY_VAULT)}
            target="_blank" rel="noopener noreferrer"
            className="font-body font-bold text-sm text-[#F7931A] hover:underline"
          >
            {proof.viewExplorer} →
          </a>
        </div>

        {error && (
          <div className="border-2 border-[#F7931A]/30 p-4">
            <p className={`font-body font-bold text-sm ${muted}`}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            <div className={`border-2 ${cardBg} p-5 flex items-center gap-4`}>
              <img src={SOL_LOGO} alt="SOL" className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className={`font-sketch text-lg ${text}`}>Solana</div>
                <div className={`font-body font-bold text-xs ${muted}`}>SOL</div>
              </div>
              <div className={`font-sketch text-xl ${text}`}>{sol !== null ? sol.toFixed(6) : "0"}</div>
            </div>
            {tokens.map((tk) => (
              <div key={tk.mint} className={`border-2 ${cardBg} p-5 flex items-center gap-4`}>
                {tk.logo ? (
                  <img src={tk.logo} alt={tk.symbol || "token"} className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-[#F7931A]/30 flex items-center justify-center flex-shrink-0">
                    <SketchCoin className="w-5 h-5 opacity-50" />
                  </div>
                )}
                <div className="flex-1">
                  <div className={`font-sketch text-lg ${text}`}>{tk.name ?? tk.symbol ?? "Unknown"}</div>
                  <div className={`font-body font-bold text-xs ${muted}`}>{tk.symbol ?? tk.mint.slice(0, 8) + "..."}</div>
                </div>
                <div className={`font-sketch text-xl ${text}`}>{tk.balance.toLocaleString()}</div>
              </div>
            ))}
            {tokens.length === 0 && (
              <div className={`border-2 ${cardBg} p-5 text-center`}>
                <p className={`font-handwritten text-lg ${muted}`}>{proof.noTokens}</p>
              </div>
            )}
          </div>
        )}

        <div className={`border-t ${divider} pt-8`}>
          <div className={`font-sketch text-2xl mb-5 ${text}`}>Why This Vault Is Public</div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className={`font-body font-bold text-base leading-relaxed mb-4 ${muted}`}>
                Showing a live balance is not a risk. Solana's blockchain is public by nature. The address, balance, and full transaction history of every wallet are visible to anyone. What matters is not whether an attacker can see the funds, but whether they can move them.
              </p>
              <p className={`font-body font-bold text-base leading-relaxed ${muted}`}>
                This vault's funds cannot be moved without both private keys. Publishing the address, the balance, and even one of the two public keys does not weaken that guarantee. It makes it verifiable.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Balance visible", value: "Yes, always" },
                { label: "Transaction history", value: "Yes, public" },
                { label: "Transfer without both keys", value: "Impossible" },
                { label: "Derivable from public data", value: "No" },
                { label: "Override by any party", value: "No" },
              ].map((row) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 border-b ${divider} last:border-0`}>
                  <span className={`font-body font-bold text-sm ${muted}`}>{row.label}</span>
                  <span className="font-sketch text-sm text-[#F7931A]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SubpageLayout>
  );
}
