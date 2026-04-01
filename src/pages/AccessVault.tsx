import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  isValidPrivateKey,
  isValidPublicKey,
  getTokenDepositAddress,
  explorerAddressUrl,
  explorerUrl,
  transferSPLToken,
} from "@/lib/solana";
import {
  SketchCheckmark, SketchX, SketchShield, SketchTwoKeys,
} from "@/components/sketches";
import { useApp } from "@/contexts/AppContext";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface TokenBalance {
  mint: string;
  name: string | null;
  symbol: string | null;
  logo: string | null;
  balance: number;
  decimals: number;
  tokenAccount: string;
  pricePerToken: number | null;
  isNft: boolean;
}

interface ShieldData {
  solBalance: number;
  tokens: TokenBalance[];
}

const POPULAR_TOKENS = [
  { symbol: "USDC",     mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { symbol: "USDT",     mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
  { symbol: "BONK",     mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "TRUMP",    mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" },
  { symbol: "FARTCOIN", mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump" },
  { symbol: "PUMP",     mint: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn" },
  { symbol: "BUTTCOIN", mint: "Cm6fNnMk7NfzStP9CZpsQA2v3jjzbcYGAxdJySmHpump" },
];

export default function AccessVault() {
  const [, navigate] = useLocation();
  const { dark } = useApp();

  const [shieldInput, setShieldInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shield, setShield] = useState<ShieldData | null>(null);
  const [activeShieldAddress, setActiveShieldAddress] = useState("");
  const [addrCopied, setAddrCopied] = useState(false);

  const [sidebarSelected, setSidebarSelected] = useState("__sol__");

  const [tokenMeta, setTokenMeta] = useState<Record<string, { name: string; symbol: string; image: string }>>({});

  const [activeTab, setActiveTab] = useState<"receive" | "send">("receive");
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const [pk1, setPk1] = useState("");
  const [pk2, setPk2] = useState("");
  const [showPk1, setShowPk1] = useState(false);
  const [showPk2, setShowPk2] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txSig, setTxSig] = useState("");
  const [txError, setTxError] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);

  const [chartData, setChartData] = useState<{ time: number; price: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartChange, setChartChange] = useState<number | null>(null);

  const [dexPrices, setDexPrices] = useState<Record<string, { price: number; change24h: number | null }>>({});

  const pk1Valid = isValidPrivateKey(pk1.trim());
  const pk2Valid = isValidPrivateKey(pk2.trim());
  const hasBothKeys = pk1Valid && pk2Valid;

  useEffect(() => {
    const mints = POPULAR_TOKENS.map((t) => t.mint).join(",");
    fetch(`/api/storaqe/token-meta?mints=${mints}`)
      .then((r) => r.json())
      .then((arr: { mint: string; name: string; symbol: string; image: string }[]) => {
        const map: Record<string, { name: string; symbol: string; image: string }> = {};
        arr.forEach((item) => { map[item.mint] = item; });
        setTokenMeta(map);
      })
      .catch(() => {});
  }, []);

  const fetchChart = useCallback((mint: string) => {
    setChartData([]);
    setChartChange(null);
    setChartLoading(true);
    fetch(`/api/storaqe/price-chart?mint=${encodeURIComponent(mint)}&days=7`)
      .then((r) => r.json())
      .then((d: { prices: { time: number; price: number }[]; change24h: number | null }) => {
        setChartData(d.prices ?? []);
        setChartChange(d.change24h ?? null);
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, []);

  useEffect(() => {
    fetchChart(sidebarSelected);
  }, [sidebarSelected, fetchChart]);

  const fetchDexPrices = useCallback((mints: string[]) => {
    if (mints.length === 0) return;
    const query = mints.join(",");
    fetch(`/api/storaqe/dex-price?mints=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d: Record<string, { price: number; change24h: number | null }>) => {
        setDexPrices(d);
      })
      .catch(() => {});
  }, []);

  async function fetchBalance(addr: string): Promise<ShieldData> {
    const res = await fetch(`/api/storaqe/balance?address=${encodeURIComponent(addr)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load balance.");
    return data as ShieldData;
  }

  async function handleView() {
    const addr = shieldInput.trim();
    if (!isValidPublicKey(addr)) { setError("Enter a valid Qoin address."); return; }
    setError("");
    setShield(null);
    setDexPrices({});
    setLoading(true);
    try {
      const data = await fetchBalance(addr);
      setShield(data);
      setActiveShieldAddress(addr);
      setSidebarSelected("__sol__");
      setActiveTab("receive");
      fetchChart("__sol__");
      const allMints = ["__sol__", ...data.tokens.map(t => t.mint)];
      fetchDexPrices(allMints);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load. Check the address.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!shield || !selectedToken) return;
    setTxLoading(true);
    setTxError("");
    setTxSig("");
    try {
      if (!recipient || !isValidPublicKey(recipient)) throw new Error("Invalid recipient address.");
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) throw new Error("Enter a valid amount.");
      if (parseFloat(amount) > selectedToken.balance) throw new Error("Insufficient balance.");
      const sig = await transferSPLToken(
        pk1.trim(), pk2.trim(),
        activeShieldAddress,
        selectedToken.mint,
        selectedToken.tokenAccount,
        recipient,
        parseFloat(amount),
        selectedToken.decimals
      );
      setTxSig(sig);
      const updated = await fetchBalance(activeShieldAddress);
      setShield(updated);
    } catch (e: unknown) {
      setTxError((e as Error).message || "Transfer failed.");
    } finally {
      setTxLoading(false);
    }
  }

  const selIsSOL = sidebarSelected === "__sol__";
  const selHeld = shield?.tokens.find((t) => t.mint === sidebarSelected) ?? null;
  const selPopular = POPULAR_TOKENS.find((t) => t.mint === sidebarSelected) ?? null;
  const selMeta = tokenMeta[sidebarSelected];
  const receiveAddr = selIsSOL
    ? activeShieldAddress
    : getTokenDepositAddress(activeShieldAddress || "11111111111111111111111111111111", sidebarSelected);

  const solDex = dexPrices["__sol__"];
  const selDex = selIsSOL ? solDex : dexPrices[sidebarSelected];

  const totalUSD = shield
    ? (() => {
        const solUsd = solDex ? shield.solBalance * solDex.price : 0;
        const tokUsd = shield.tokens.reduce((s, t) => {
          const p = t.pricePerToken ?? dexPrices[t.mint]?.price ?? null;
          return s + (p ? t.balance * p : 0);
        }, 0);
        return solUsd + tokUsd;
      })()
    : 0;

  const visiblePopular = POPULAR_TOKENS.filter(
    (t) => !shield?.tokens.some((st) => st.mint === t.mint)
  );

  const selLabel = selIsSOL
    ? "SOL"
    : selHeld?.symbol ?? selMeta?.symbol ?? selPopular?.symbol ?? sidebarSelected.slice(0, 6);

  const selLogo = selIsSOL ? null : (selHeld?.logo ?? selMeta?.image ?? null);

  const activeChange = chartChange ?? selDex?.change24h ?? null;
  const chartIsPositive = !activeChange || activeChange >= 0;
  const chartColor = chartIsPositive ? "#F7931A" : "#1a1a1a";

  function fmtPrice(p: number): string {
    if (p >= 1) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 0.01) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(8)}`;
  }

  function selectToken(mint: string, held?: TokenBalance) {
    setSidebarSelected(mint);
    setActiveTab("receive");
    setRecipient(""); setAmount(""); setTxSig(""); setTxError("");
    if (held) setSelectedToken(held);
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${dark ? "bg-[#0f0f0f]" : "bg-[#FAFAF5]"}`}>

      {/* TOP BAR always visible */}
      <div className="flex-shrink-0 border-b-2 border-[#1a1a1a] bg-white px-5 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 flex-shrink-0 group">
          <SketchShield className="w-7 h-7 group-hover:opacity-70 transition-opacity" />
          <span className="font-sketch text-lg text-[#1a1a1a]">Qoin</span>
        </button>

        {/* Only show address bar + info when vault is loaded */}
        {shield && (
          <>
            <span className="text-[#1a1a1a]/20 text-lg flex-shrink-0">/</span>
            <div className="flex-1 flex gap-2 max-w-xl">
              <input
                type="text"
                value={shieldInput}
                onChange={(e) => { setShieldInput(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleView()}
                placeholder="Enter another Qoin address..."
                className="input-sketch flex-1 text-sm py-1.5 font-mono"
              />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="font-mono text-sm font-bold text-[#1a1a1a]/50 hidden md:inline">
                {activeShieldAddress.slice(0, 6)}...{activeShieldAddress.slice(-4)}
              </span>
              <a
                href={explorerAddressUrl(activeShieldAddress, false)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body font-bold text-sm text-[#F7931A] hover:underline"
              >
                Orb
              </a>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(activeShieldAddress);
                  setAddrCopied(true);
                  setTimeout(() => setAddrCopied(false), 2000);
                }}
                className="font-body font-bold text-sm text-[#1a1a1a]/50 hover:text-[#F7931A] transition-colors"
              >
                {addrCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        )}
        {error && <span className="font-handwritten text-sm text-[#F7931A] ml-auto">{error}</span>}
      </div>

      {/* BODY */}
      {!shield ? (
        /* ── EMPTY STATE: big centered search ── */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SketchShield className="w-16 h-16 mb-6 opacity-20" />
          <h1 className="font-sketch text-4xl text-[#1a1a1a] mb-2">Open Your Qoin</h1>
          <p className="font-handwritten text-base text-[#1a1a1a]/40 mb-8">
            Enter your Qoin address to view your portfolio.
          </p>
          <div className="w-full max-w-lg flex gap-3">
            <input
              type="text"
              value={shieldInput}
              onChange={(e) => { setShieldInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleView()}
              placeholder="Paste Qoin address here..."
              className="input-sketch flex-1 text-base py-4 font-mono"
              autoFocus
            />
            <button
              onClick={handleView}
              disabled={loading || !shieldInput.trim()}
              className="btn-sketch px-7 py-4 text-base flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Open"}
            </button>
          </div>
          {error && (
            <p className="font-handwritten text-sm text-[#F7931A] mt-4">{error}</p>
          )}
          <button
            onClick={() => navigate("/qoin/create")}
            className="font-handwritten text-sm text-[#1a1a1a]/30 hover:text-[#F7931A] transition-colors mt-8"
          >
            Don't have a Qoin? Create one →
          </button>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR icon-only on mobile, full on md+ */}
          <div className="w-14 md:w-60 flex-shrink-0 border-r-2 border-[#1a1a1a]/10 bg-white flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 py-2">

              {/* Holdings label desktop only */}
              <div className="hidden md:block px-4 pt-2 pb-1">
                <span className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-widest">Holdings</span>
              </div>

              {/* SOL */}
              <button
                onClick={() => selectToken("__sol__")}
                className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2.5 transition-all ${sidebarSelected === "__sol__" ? "bg-[#F7931A]/10 border-l-4 border-l-[#F7931A]" : "border-l-4 border-l-transparent hover:bg-[#FAFAF5]"}`}
              >
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                <div className="hidden md:block min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-body font-bold text-sm text-[#1a1a1a] leading-none">SOL</span>
                    {solDex && <span className="font-mono text-xs text-[#F7931A]">{fmtPrice(solDex.price)}</span>}
                  </div>
                  <div className="font-mono text-xs text-[#1a1a1a]/50 mt-0.5">{shield.solBalance.toFixed(4)}</div>
                </div>
                {solDex?.change24h != null && (
                  <span className="hidden md:inline font-mono text-xs flex-shrink-0" style={{ color: solDex.change24h >= 0 ? "#F7931A" : "#1a1a1a", opacity: solDex.change24h >= 0 ? 1 : 0.5 }}>
                    {solDex.change24h >= 0 ? "+" : ""}{solDex.change24h.toFixed(1)}%
                  </span>
                )}
              </button>

              {/* SPL tokens */}
              {shield.tokens.map((t) => {
                const tdex = dexPrices[t.mint];
                const price = t.pricePerToken ?? tdex?.price ?? null;
                return (
                  <button
                    key={t.mint}
                    onClick={() => selectToken(t.mint, t)}
                    className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2.5 transition-all ${sidebarSelected === t.mint ? "bg-[#F7931A]/10 border-l-4 border-l-[#F7931A]" : "border-l-4 border-l-transparent hover:bg-[#FAFAF5]"}`}
                  >
                    {t.logo ? (
                      <img src={t.logo} alt={t.symbol ?? t.mint} className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#1a1a1a]/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-sketch text-xs text-[#1a1a1a]/40">{t.symbol?.slice(0, 2) ?? "?"}</span>
                      </div>
                    )}
                    <div className="hidden md:block min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-body font-bold text-sm text-[#1a1a1a] truncate leading-none">{t.symbol ?? t.name?.slice(0, 8) ?? "Token"}</span>
                        {price && !t.isNft && <span className="font-mono text-xs text-[#F7931A] flex-shrink-0">{fmtPrice(price)}</span>}
                      </div>
                      <div className="font-mono text-xs text-[#1a1a1a]/50 mt-0.5">{t.isNft ? "NFT" : t.balance.toLocaleString()}</div>
                    </div>
                    {tdex?.change24h != null && !t.isNft && (
                      <span className="hidden md:inline font-mono text-xs flex-shrink-0" style={{ color: tdex.change24h >= 0 ? "#F7931A" : "#1a1a1a", opacity: tdex.change24h >= 0 ? 1 : 0.5 }}>
                        {tdex.change24h >= 0 ? "+" : ""}{tdex.change24h.toFixed(1)}%
                      </span>
                    )}
                  </button>
                );
              })}

              {shield.tokens.length === 0 && (
                <div className="hidden md:block px-4 py-3">
                  <p className="font-handwritten text-sm text-[#1a1a1a]/40">No tokens yet</p>
                </div>
              )}

              {/* Quick Deposit divider desktop only label */}
              {visiblePopular.length > 0 && (
                <>
                  <div className="border-t border-[#1a1a1a]/5 mt-2 mb-1">
                    <span className="hidden md:block px-4 pt-3 pb-1 font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-widest">Quick Deposit</span>
                  </div>
                  {visiblePopular.map((t) => {
                    const meta = tokenMeta[t.mint];
                    return (
                      <button
                        key={t.mint}
                        onClick={() => selectToken(t.mint)}
                        className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2 transition-all ${sidebarSelected === t.mint ? "bg-[#F7931A]/10 border-l-4 border-l-[#F7931A]" : "border-l-4 border-l-transparent hover:bg-[#FAFAF5]"}`}
                      >
                        {meta?.image ? (
                          <img src={meta.image} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#1a1a1a]/10 flex items-center justify-center flex-shrink-0">
                            <span className="font-sketch text-xs text-[#1a1a1a]/30">{t.symbol.slice(0, 2)}</span>
                          </div>
                        )}
                        <div className="hidden md:block min-w-0 flex-1">
                          <div className="font-body font-bold text-sm text-[#1a1a1a] truncate leading-none">{meta?.symbol ?? t.symbol}</div>
                          <div className="font-handwritten text-xs text-[#1a1a1a]/50">deposit</div>
                        </div>
                        {sidebarSelected === t.mint && <span className="hidden md:inline w-1.5 h-1.5 rounded-full bg-[#F7931A] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sidebar footer desktop only */}
            <div className="hidden md:block border-t-2 border-[#1a1a1a]/10 px-4 py-3 flex-shrink-0">
              <div className="font-body font-bold text-xs text-[#1a1a1a]/50 mb-0.5">Portfolio value</div>
              <div className="font-sketch text-lg text-[#1a1a1a]">
                {totalUSD > 0 ? `$${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
              </div>
              <div className="font-mono text-xs text-[#1a1a1a]/40 mt-0.5">{1 + shield.tokens.length} assets</div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

              {/* Token header */}
              <div className="flex items-center gap-4">
                {selIsSOL ? (
                  <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : selLogo ? (
                  <img src={selLogo} className="w-14 h-14 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#1a1a1a]/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-sketch text-base text-[#1a1a1a]/30">{selLabel.slice(0, 3)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-sketch text-3xl text-[#1a1a1a] leading-none">{selLabel}</div>
                  {selDex && (
                    <div className="font-mono text-lg text-[#1a1a1a] mt-1">{fmtPrice(selDex.price)}</div>
                  )}
                  {selHeld && !selHeld.isNft && (
                    <div className="font-mono text-sm text-[#1a1a1a]/60 mt-0.5">
                      {selHeld.balance.toLocaleString()} {selHeld.symbol}
                      {(() => {
                        const p = selHeld.pricePerToken ?? selDex?.price ?? null;
                        return p ? <span className="ml-2">{fmtPrice(selHeld.balance * p)}</span> : null;
                      })()}
                    </div>
                  )}
                  {selIsSOL && (
                    <div className="font-mono text-sm text-[#1a1a1a]/60 mt-0.5">
                      {shield.solBalance.toFixed(6)} SOL
                      {solDex && <span className="ml-2">{fmtPrice(shield.solBalance * solDex.price)}</span>}
                    </div>
                  )}
                  {!selHeld && !selIsSOL && (
                    <div className="font-handwritten text-sm text-[#1a1a1a]/50 mt-1">Not in this vault yet</div>
                  )}
                </div>
                {activeChange !== null && (
                  <div className="text-right flex-shrink-0">
                    <div className="font-sketch text-xl" style={{ color: activeChange >= 0 ? "#F7931A" : "#1a1a1a", opacity: activeChange >= 0 ? 1 : 0.7 }}>
                      {activeChange >= 0 ? "+" : ""}{activeChange.toFixed(2)}%
                    </div>
                    <div className="font-handwritten text-sm text-[#1a1a1a]/50">24h change</div>
                  </div>
                )}
              </div>

              {/* PRICE CHART */}
              <div className="border-2 border-[#1a1a1a] rounded-sm bg-white overflow-hidden shadow-[3px_3px_0_#1a1a1a]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10">
                  <span className="font-sketch text-base text-[#1a1a1a]">7-Day Price</span>
                  {chartLoading && <span className="font-handwritten text-sm text-[#1a1a1a]/30">Loading...</span>}
                  {!chartLoading && chartData.length === 0 && (
                    <span className="font-handwritten text-sm text-[#1a1a1a]/50">No price data</span>
                  )}
                </div>
                {chartData.length > 0 ? (
                  <div className="h-44 px-2 py-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
                          tick={{ fontFamily: "monospace", fontSize: 10, fill: "#1a1a1a", opacity: 0.3 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(4)}`}
                          tick={{ fontFamily: "monospace", fontSize: 10, fill: "#1a1a1a", opacity: 0.3 }}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          formatter={(v: number) => [`$${v >= 1 ? v.toFixed(2) : v.toFixed(6)}`, selLabel]}
                          labelFormatter={(t) => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                          contentStyle={{ fontFamily: "monospace", fontSize: 12, border: "2px solid #1a1a1a", borderRadius: 0, background: "#fff" }}
                          itemStyle={{ color: "#1a1a1a" }}
                          labelStyle={{ color: "#1a1a1a", opacity: 0.4 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={chartColor}
                          strokeWidth={2}
                          fill="url(#chartFill)"
                          dot={false}
                          activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-sketch text-2xl text-[#1a1a1a]/10 mb-1">--</div>
                      <div className="font-handwritten text-sm text-[#1a1a1a]/40">Price chart not available</div>
                    </div>
                  </div>
                )}
              </div>

              {/* RECEIVE / SEND TABS */}
              <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b-2 border-[#1a1a1a]/10">
                  <button
                    onClick={() => setActiveTab("receive")}
                    className={`flex-1 py-3 font-body font-bold text-sm transition-all ${activeTab === "receive" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
                  >
                    Receive
                  </button>
                  {(selHeld && !selHeld.isNft) && (
                    <button
                      onClick={() => { setActiveTab("send"); setSelectedToken(selHeld); }}
                      className={`flex-1 py-3 font-body font-bold text-sm transition-all ${activeTab === "send" ? "bg-[#F7931A] text-white" : "text-[#F7931A]/60 hover:bg-[#F7931A]/5"}`}
                    >
                      Send
                    </button>
                  )}
                </div>

                {/* RECEIVE */}
                {activeTab === "receive" && (
                  <div className="px-5 py-5 space-y-4">
                    <p className="font-handwritten text-base text-[#1a1a1a]/70">
                      {selIsSOL
                        ? "Send SOL directly to your Qoin address."
                        : selHeld
                          ? `Send ${selHeld.symbol ?? "tokens"} to this deposit address. Do not send to the Qoin address directly.`
                          : `Deposit ${selMeta?.symbol ?? selPopular?.symbol ?? "tokens"} to your vault using this address.`}
                    </p>
                    <div className="font-mono text-sm text-[#1a1a1a] break-all p-4 bg-[#FAFAF5] border border-[#1a1a1a]/10 rounded-sm">
                      {receiveAddr}
                    </div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(receiveAddr);
                        setCopiedAddr(sidebarSelected);
                        setTimeout(() => setCopiedAddr(null), 2000);
                      }}
                      className="btn-sketch-outline w-full text-sm py-3 bg-white"
                    >
                      {copiedAddr === sidebarSelected ? "Copied!" : `Copy ${selLabel} Deposit Address`}
                    </button>
                  </div>
                )}

                {/* SEND */}
                {activeTab === "send" && selHeld && !selHeld.isNft && (
                  <div className="px-5 py-5 space-y-4">
                    {/* Keys entry */}
                    <div className="border-2 border-[#1a1a1a]/10 rounded-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAF5] border-b border-[#1a1a1a]/10">
                        <SketchTwoKeys className="w-7 h-4 flex-shrink-0" />
                        <span className="font-sketch text-sm text-[#1a1a1a]">Two keys required to send</span>
                        {hasBothKeys && <span className="ml-auto font-handwritten text-sm text-[#F7931A]">Both keys loaded</span>}
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-wide mb-1 block">Private Key 1</label>
                          <div className="relative">
                            <input
                              type={showPk1 ? "text" : "password"}
                              placeholder="base58 private key..."
                              value={pk1}
                              onChange={(e) => setPk1(e.target.value)}
                              className="input-sketch text-sm font-mono py-2 pr-16"
                            />
                            <button
                              onClick={() => setShowPk1(!showPk1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                            >
                              {showPk1 ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-wide mb-1 block">Private Key 2</label>
                          <div className="relative">
                            <input
                              type={showPk2 ? "text" : "password"}
                              placeholder="base58 private key..."
                              value={pk2}
                              onChange={(e) => setPk2(e.target.value)}
                              className="input-sketch text-sm font-mono py-2 pr-16"
                            />
                            <button
                              onClick={() => setShowPk2(!showPk2)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                            >
                              {showPk2 ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        {(pk1 && !pk1Valid) && <p className="font-handwritten text-sm text-[#F7931A]">Key 1 is invalid.</p>}
                        {(pk2 && !pk2Valid) && <p className="font-handwritten text-sm text-[#F7931A]">Key 2 is invalid.</p>}
                      </div>
                    </div>

                    {/* Transfer form */}
                    <div>
                      <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5 block">Recipient Address</label>
                      <input
                        type="text"
                        placeholder="Solana wallet address..."
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        disabled={!hasBothKeys}
                        className="input-sketch text-sm font-mono py-2.5 disabled:opacity-30"
                      />
                      {recipient && !isValidPublicKey(recipient) && (
                        <div className="flex items-center gap-1.5 mt-1 font-handwritten text-sm">
                          <SketchX className="w-4 h-4" /> Invalid address
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5 block">
                        Amount
                        <span className="ml-2 text-[#1a1a1a]/25 normal-case">balance: {selHeld.balance.toLocaleString()} {selHeld.symbol}</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          min="0"
                          disabled={!hasBothKeys}
                          className="input-sketch text-sm py-2.5 flex-1 disabled:opacity-30"
                        />
                        <button
                          onClick={() => setAmount(selHeld.balance.toString())}
                          disabled={!hasBothKeys}
                          className="font-body font-bold text-xs px-3 border-2 border-[#1a1a1a] rounded-sm hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          MAX
                        </button>
                      </div>
                      {amount && parseFloat(amount) > selHeld.balance && (
                        <p className="font-handwritten text-sm text-[#1a1a1a]/60 mt-1">Exceeds balance</p>
                      )}
                    </div>

                    {txError && (
                      <div className="border-2 border-[#F7931A] bg-white rounded-sm p-3 font-body text-sm text-[#1a1a1a]/70">{txError}</div>
                    )}
                    {txSig && (
                      <div className="border-2 border-[#1a1a1a] bg-white rounded-sm p-4 shadow-[3px_3px_0_#1a1a1a]">
                        <div className="flex items-center gap-2 font-sketch text-base text-[#1a1a1a] mb-2">
                          <SketchCheckmark className="w-5 h-5" /> Sent!
                        </div>
                        <div className="font-mono text-sm break-all text-[#1a1a1a]/60 mb-2">{txSig}</div>
                        <a href={explorerUrl(txSig, false)} target="_blank" rel="noopener noreferrer" className="font-handwritten text-sm text-[#F7931A] hover:underline">
                          View on Orb
                        </a>
                      </div>
                    )}

                    <button
                      onClick={handleTransfer}
                      disabled={!hasBothKeys || txLoading || !recipient || !amount || !isValidPublicKey(recipient) || parseFloat(amount) <= 0 || parseFloat(amount) > selHeld.balance}
                      className="btn-sketch w-full py-3.5 text-base disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {!hasBothKeys ? "Enter both keys above to send" : txLoading ? "Signing..." : "Send. Both Keys or Nothing."}
                    </button>
                    {hasBothKeys && (
                      <p className="font-handwritten text-xs text-[#1a1a1a]/25 text-center">
                        Signed by Key 1 and Key 2. Solana runtime verifies both.
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
