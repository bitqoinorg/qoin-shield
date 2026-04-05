import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  isValidPrivateKey,
  isValidPublicKey,
  keypairFromPrivateKey,
  getTokenDepositAddress,
  explorerAddressUrl,
  explorerUrl,
  transferSPLToken,
  transferSPLTokenWallets,
} from "@/lib/solana";
import {
  SketchCheckmark, SketchX, SketchShield, SketchTwoKeys,
} from "@/components/sketches";
import { lookupVaultByPublicKey, saveTokenDeposit, lookupEvmVaultByAddress } from "@/lib/vaultStore";
import { useApp } from "@/contexts/AppContext";
import { useWalletPair } from "@/contexts/WalletPairContext";
import { useEvmWallet } from "@/contexts/EvmWalletContext";
import {
  buildSafeTx,
  buildTypedData,
  encodeERC20Transfer,
  packSignatures,
  encodeExecTransaction,
  parseTokenAmount,
} from "@/lib/safeExec";
import { isValidEvmPrivateKey, evmSignTypedData, evmAddressFromPrivateKey } from "@/lib/evm";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { QRCodeSVG } from "qrcode.react";

interface TokenBalance {
  mint: string;
  name: string | null;
  symbol: string | null;
  logo: string | null;
  balance: number;
  decimals: number;
  tokenAccount: string;
  authority: string;
  isLocked: boolean;
  pricePerToken: number | null;
  isNft: boolean;
}

interface ShieldData {
  solBalance: number;
  tokens: TokenBalance[];
}

const WSOL_MINT = "So11111111111111111111111111111111111111112";

const POPULAR_TOKENS = [
  { symbol: "wSOL",  mint: WSOL_MINT },
  { symbol: "USDC",  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { symbol: "wBTC",  mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh" },
];

const DISPLAY_SYMBOL: Record<string, string> = {
  [WSOL_MINT]: "wSOL",
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": "wBTC",
};

type TxRecord = {
  sig: string; ts: number;
  tokenTransfers: Array<{ mint: string; from: string; to: string; fromAccount: string; toAccount: string; amount: number }>;
  nativeTransfers: Array<{ from: string; to: string; lamports: number }>;
  err: unknown;
};

export default function AccessVault() {
  const [, navigate] = useLocation();
  const { t, dark, chain, setChain } = useApp();

  const dm = {
    topBar: dark ? "bg-[#0f0f0f] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]",
    text: dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]",
    muted: dark ? "text-[#FAFAF5]/50" : "text-[#1a1a1a]/50",
    faint: dark ? "text-[#FAFAF5]/30" : "text-[#1a1a1a]/30",
    faint40: dark ? "text-[#FAFAF5]/40" : "text-[#1a1a1a]/40",
    sep: dark ? "text-[#FAFAF5]/20" : "text-[#1a1a1a]/20",
    card: dark ? "bg-[#111111]" : "bg-white",
    cardBorder: dark ? "border-[#FAFAF5]/8" : "border-[#1a1a1a]/10",
    sidebar: dark ? "bg-[#0a0a0a] border-[#FAFAF5]/8" : "bg-[#FAFAF5] border-[#1a1a1a]/15",
    sidebarSelected: dark ? "bg-[#F7931A]/10 border-l-4 border-l-[#F7931A]" : "bg-[#F7931A]/10 border-l-4 border-l-[#F7931A]",
    sidebarHover: dark ? "border-l-4 border-l-transparent hover:bg-[#FAFAF5]/5" : "border-l-4 border-l-transparent hover:bg-[#FAFAF5]",
    iconCircle: dark ? "bg-[#FAFAF5]/10" : "bg-[#1a1a1a]/10",
    inputBg: dark ? "bg-[#111] border-[#FAFAF5]/15 text-[#FAFAF5] placeholder-[#FAFAF5]/30" : "bg-white border-[#1a1a1a]/20 text-[#1a1a1a] placeholder-[#1a1a1a]/30",
    sectionHead: dark ? "bg-[#FAFAF5]/5 border-[#FAFAF5]/8" : "bg-[#FAFAF5] border-[#1a1a1a]/10",
    btnOutline: dark ? "border-[#FAFAF5]/20 text-[#FAFAF5]/60 hover:bg-[#FAFAF5]/5" : "border-[#1a1a1a]/20 text-[#1a1a1a]/60 hover:bg-[#FAFAF5]",
    divider: dark ? "border-[#FAFAF5]/8" : "border-[#1a1a1a]/10",
  };
  const {
    phantomPubkey, phantom2Pubkey,
    phantomConnecting, phantom2Connecting,
    phantomError, phantom2Error,
    connectPhantom, connectPhantom2,
    disconnectPhantom, disconnectPhantom2,
    signWithPhantom, signWithPhantom2,
  } = useWalletPair();
  const {
    evmAddress1, evmAddress2,
    connecting1: evmConnecting1, connecting2: evmConnecting2,
    error1: evmError1, error2: evmError2,
    connectK1, connectK2,
    disconnectK1, disconnectK2,
    signTypedDataK1, signTypedDataK2, sendTransaction,
  } = useEvmWallet();

  const [accessMode, setAccessMode] = useState<"cold-keys" | "connect-wallets">("cold-keys");

  const [shieldInput, setShieldInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shield, setShield] = useState<ShieldData | null>(null);
  const [activeShieldAddress, setActiveShieldAddress] = useState("");
  const [addrCopied, setAddrCopied] = useState(false);

  const [sidebarSelected, setSidebarSelected] = useState(WSOL_MINT);

  const [tokenMeta, setTokenMeta] = useState<Record<string, { name: string; symbol: string; image: string }>>({});

  const [activeTab, setActiveTab] = useState<"receive" | "send" | "swap" | null>(null);
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
  const [signingStep, setSigningStep] = useState<"phantom" | "solflare" | "broadcasting" | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);

  const [evmAddressInput, setEvmAddressInput] = useState("");
  const [evmConnectVaultInput, setEvmConnectVaultInput] = useState("");
  const [evmLoading, setEvmLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsDone, setSlotsDone] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [evmError, setEvmError] = useState("");
  const [evmShield, setEvmShield] = useState<{ ethBalance: number; ethLogo: string; tokens: Array<{ contract: string; name: string; symbol: string; decimals: number; logo: string; balance: number }> } | null>(null);
  const [evmPrices, setEvmPrices] = useState<Record<string, { price: number; change24h: number | null }>>({});
  const [evmChartData, setEvmChartData] = useState<{ time: number; price: number }[]>([]);
  const [evmChartLoading, setEvmChartLoading] = useState(false);
  const [evmChartChange, setEvmChartChange] = useState<number | null>(null);
  const [evmActiveAddress, setEvmActiveAddress] = useState("");

  const [evmAddrCopied, setEvmAddrCopied] = useState(false);
  const [evmSendRecipient, setEvmSendRecipient] = useState("");
  const [evmSendAmount, setEvmSendAmount] = useState("");
  const [evmSendNonce, setEvmSendNonce] = useState<string | null>(null);
  const [evmSig1, setEvmSig1] = useState<string | null>(null);
  const [evmSig2, setEvmSig2] = useState<string | null>(null);
  const [evmSendStatus, setEvmSendStatus] = useState<"idle" | "fetchNonce" | "signing1" | "signing2" | "executing" | "done" | "error">("idle");
  const [evmSendTxHash, setEvmSendTxHash] = useState("");
  const [evmSendError, setEvmSendError] = useState("");
  const [evmPk1, setEvmPk1] = useState("");
  const [evmPk2, setEvmPk2] = useState("");
  const [showEvmPk1, setShowEvmPk1] = useState(false);
  const [showEvmPk2, setShowEvmPk2] = useState(false);
  const [evmColdSig1Addr, setEvmColdSig1Addr] = useState<string | null>(null);
  const [evmColdSig2Addr, setEvmColdSig2Addr] = useState<string | null>(null);
  const [evmSidebarSelected, setEvmSidebarSelected] = useState<string>("eth");
  const [evmActiveTab, setEvmActiveTab] = useState<"receive" | "send" | "swap" | null>(null);

  const [chartData, setChartData] = useState<{ time: number; price: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartChange, setChartChange] = useState<number | null>(null);

  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [txHistoryLoading, setTxHistoryLoading] = useState(false);
  const [txHistoryHasMore, setTxHistoryHasMore] = useState(false);
  const [txHistoryLoadingMore, setTxHistoryLoadingMore] = useState(false);
  const [historyTab, setHistoryTab] = useState<"received" | "sent">("received");
  const [newDepositAlert, setNewDepositAlert] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evmPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [walletMismatch, setWalletMismatch] = useState<string | null>(null);

  const [pub1Input, setPub1Input] = useState("");
  const [pub2Input, setPub2Input] = useState("");
  const [showDirectAddr, setShowDirectAddr] = useState(true);

  const [showAddToken, setShowAddToken] = useState(false);
  const [customMint, setCustomMint] = useState("");
  const [customDepositAddr, setCustomDepositAddr] = useState("");
  const [customMintCopied, setCustomMintCopied] = useState(false);
  const [customCreating, setCustomCreating] = useState(false);
  const [customTaError, setCustomTaError] = useState("");
  const [customTaSig, setCustomTaSig] = useState("");

  const [dexPrices, setDexPrices] = useState<Record<string, { price: number; change24h: number | null }>>({});

  const pk1Valid = isValidPrivateKey(pk1.trim());
  const pk2Valid = isValidPrivateKey(pk2.trim());
  const hasBothKeys = pk1Valid && pk2Valid;

  const evmPk1Valid = isValidEvmPrivateKey(evmPk1);
  const evmPk2Valid = isValidEvmPrivateKey(evmPk2);
  const hasBothEvmColdKeys = evmPk1Valid && evmPk2Valid;

  // Track the last pubkey that loaded the current shield so we can detect account switches
  const loadedForPubkeyRef = useRef<string | null>(null);

  // When Phantom account changes while in Connect Wallets mode, reset the shield
  // so the auto-detect effect below re-runs for the new account
  useEffect(() => {
    if (accessMode !== "connect-wallets") return;
    if (loadedForPubkeyRef.current === null) {
      loadedForPubkeyRef.current = phantomPubkey;
      return;
    }
    if (phantomPubkey !== loadedForPubkeyRef.current) {
      loadedForPubkeyRef.current = phantomPubkey;
      // Clear current Qoin — auto-detect will pick up the new account below
      setShield(null);
      setActiveShieldAddress("");
      setShieldInput("");
      setSlotsDone(false);
      setWalletMismatch(null);
      setActiveTab(null);
      setTxSig(""); setTxError("");
    }
  }, [phantomPubkey, accessMode]);

  // Auto-detect Qoin when both wallets connect in Connect Wallets mode
  useEffect(() => {
    if (accessMode !== "connect-wallets") return;
    const key2Pubkey = phantom2Pubkey;
    if (!phantomPubkey || !key2Pubkey) return;
    if (shield) return;
    if (loading) return;

    // 1. Try localStorage first (instant)
    const cached = lookupVaultByPublicKey(phantomPubkey);
    if (cached?.vaultAddress) {
      setShieldInput(cached.vaultAddress);
      handleViewWallets(cached.vaultAddress);
      return;
    }

    // 2. Fall back to on-chain scan
    setLoading(true);
    fetch(`/api/qoin/find-vault?key1=${encodeURIComponent(phantomPubkey)}&key2=${encodeURIComponent(key2Pubkey)}`)
      .then((r) => r.json())
      .then((data: { vaults?: string[]; error?: string }) => {
        if (data.vaults && data.vaults.length > 0) {
          const addr = data.vaults[0];
          setShieldInput(addr);
          handleViewWallets(addr);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [phantomPubkey, phantom2Pubkey, accessMode]);

  useEffect(() => {
    if (!evmAddress1 || accessMode !== "connect-wallets") return;
    const cached = lookupEvmVaultByAddress(evmAddress1);
    if (cached && !evmConnectVaultInput) {
      setEvmConnectVaultInput(cached.vaultAddress);
    }
  }, [evmAddress1, accessMode]);

  // Auto-open vault from URL params (e.g. navigated from GenerateVault after creation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vaultParam = params.get("vault");
    const chainParam = params.get("chain") as "evm" | "solana" | null;
    if (!vaultParam) return;

    if (chainParam === "evm" && /^0x[0-9a-fA-F]{40}$/.test(vaultParam)) {
      setChain("evm");
      setEvmAddressInput(vaultParam);
      setEvmShield(null);
      setEvmLoading(true);
      fetch(`/api/evm/balance?address=${encodeURIComponent(vaultParam)}`)
        .then(r => r.json())
        .then(data => { setEvmShield(data); setEvmActiveAddress(vaultParam); })
        .catch(e => setEvmError((e as Error).message || "Failed to load."))
        .finally(() => setEvmLoading(false));
    } else if (chainParam === "solana" && vaultParam) {
      setChain("solana");
      setShieldInput(vaultParam);
      setShield(null);
      setLoading(true);
      fetch(`/api/qoin/balance?address=${encodeURIComponent(vaultParam)}`, { cache: "no-store" })
        .then(r => r.json())
        .then(data => {
          setShield(data as ShieldData);
          setActiveShieldAddress(vaultParam);
          setShieldInput(vaultParam);
        })
        .catch(e => setError((e as Error).message || "Failed to load."))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mints = POPULAR_TOKENS.map((t) => t.mint).join(",");
    fetch(`/api/qoin/token-meta?mints=${mints}`)
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
    fetch(`/api/qoin/price-chart?mint=${encodeURIComponent(mint)}&days=7`)
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

  const PAGE_LIMIT = 20;

  const getTxAddr = useCallback((shieldAddr: string, mint: string) =>
    getTokenDepositAddress(shieldAddr, mint),
  []);

  const buildTxUrl = useCallback((shieldAddr: string, mint: string, limit: number, before?: string): string => {
    const addr = getTxAddr(shieldAddr, mint);
    const base = `/api/qoin/tx-history?address=${encodeURIComponent(addr)}&limit=${limit}`;
    const beforePart = before ? `&before=${encodeURIComponent(before)}` : "";
    const ownerPart = `&owner=${encodeURIComponent(shieldAddr)}&mint=${encodeURIComponent(mint)}`;
    return `${base}${ownerPart}${beforePart}`;
  }, [getTxAddr]);

  useEffect(() => {
    if (!activeShieldAddress) return;
    const url = buildTxUrl(activeShieldAddress, sidebarSelected, PAGE_LIMIT);
    setTxHistory([]);
    setTxHistoryHasMore(false);
    setTxHistoryLoading(true);
    fetch(url)
      .then(r => r.json())
      .then((d: TxRecord[]) => {
        const list = Array.isArray(d) ? d : [];
        setTxHistory(list);
        setTxHistoryHasMore(list.length === PAGE_LIMIT);
      })
      .catch(() => setTxHistory([]))
      .finally(() => setTxHistoryLoading(false));
  }, [sidebarSelected, activeShieldAddress, buildTxUrl]);

  const loadMoreTxHistory = useCallback(async () => {
    if (!activeShieldAddress || txHistoryLoadingMore || txHistory.length === 0) return;
    const lastSig = txHistory[txHistory.length - 1].sig;
    setTxHistoryLoadingMore(true);
    try {
      const url = buildTxUrl(activeShieldAddress, sidebarSelected, PAGE_LIMIT, lastSig);
      const r = await fetch(url);
      const d: TxRecord[] = await r.json();
      const list = Array.isArray(d) ? d : [];
      setTxHistory(prev => [...prev, ...list]);
      setTxHistoryHasMore(list.length === PAGE_LIMIT);
    } catch { /* ignore */ }
    finally { setTxHistoryLoadingMore(false); }
  }, [activeShieldAddress, sidebarSelected, txHistory, txHistoryLoadingMore, buildTxUrl]);

  useEffect(() => {
    if (!activeShieldAddress) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    const poll = async () => {
      try {
        const pollUrl = buildTxUrl(activeShieldAddress, sidebarSelected, 1);
        const [txRes, balRes] = await Promise.all([
          fetch(pollUrl),
          fetch(`/api/qoin/balance?address=${encodeURIComponent(activeShieldAddress)}`, { cache: "no-store" }),
        ]);
        const [latestList, balData] = await Promise.all([txRes.json(), balRes.json()]);
        if (Array.isArray(latestList) && latestList.length > 0) {
          setTxHistory(prev => {
            if (prev.length === 0 || latestList[0].sig !== prev[0].sig) {
              setNewDepositAlert(true);
              setTimeout(() => setNewDepositAlert(false), 6000);
              fetch(buildTxUrl(activeShieldAddress, sidebarSelected, PAGE_LIMIT))
                .then(r => r.json())
                .then((d: TxRecord[]) => {
                  const list = Array.isArray(d) ? d : [];
                  setTxHistory(list);
                  setTxHistoryHasMore(list.length === PAGE_LIMIT);
                }).catch(() => {});
            }
            return prev;
          });
        }
        if (balRes.ok && balData && !balData.error) {
          setShield(balData);
        }
      } catch { /* ignore */ }
    };
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(poll, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeShieldAddress, sidebarSelected, getTxAddr]);

  useEffect(() => {
    if (!evmActiveAddress) return;
    const poll = async () => {
      try {
        const data = await fetchEvmBalance(evmActiveAddress);
        setEvmShield(data);
      } catch { /* ignore */ }
    };
    if (evmPollingRef.current) clearInterval(evmPollingRef.current);
    evmPollingRef.current = setInterval(poll, 10000);
    return () => { if (evmPollingRef.current) clearInterval(evmPollingRef.current); };
  }, [evmActiveAddress]);

  useEffect(() => {
    if (!evmActiveAddress) return;
    fetch("/api/evm/prices")
      .then((r) => r.json())
      .then((d: Record<string, { price: number; change24h: number | null }>) => setEvmPrices(d))
      .catch(() => {});
  }, [evmActiveAddress]);

  useEffect(() => {
    if (!evmActiveAddress) return;
    const token = evmSidebarSelected === "eth" ? "eth" : evmSidebarSelected.toLowerCase();
    setEvmChartLoading(true);
    setEvmChartData([]);
    fetch(`/api/evm/price-chart?token=${encodeURIComponent(token)}&days=7`)
      .then((r) => r.json())
      .then((d: { prices?: { time: number; price: number }[]; change24h?: number | null }) => {
        setEvmChartData(d.prices ?? []);
        setEvmChartChange(d.change24h ?? null);
      })
      .catch(() => {})
      .finally(() => setEvmChartLoading(false));
  }, [evmActiveAddress, evmSidebarSelected]);

  const selHeldForSync = shield?.tokens.find((t) => t.mint === sidebarSelected) ?? null;
  useEffect(() => {
    if (selHeldForSync) setSelectedToken(selHeldForSync);
  }, [selHeldForSync]);

  const fetchDexPrices = useCallback((mints: string[]) => {
    if (mints.length === 0) return;
    const query = mints.join(",");
    fetch(`/api/qoin/dex-price?mints=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d: Record<string, { price: number; change24h: number | null }>) => {
        setDexPrices(d);
      })
      .catch(() => {});
  }, []);

  async function fetchBalance(addr: string): Promise<ShieldData> {
    const res = await fetch(`/api/qoin/balance?address=${encodeURIComponent(addr)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load balance.");
    return data as ShieldData;
  }

  async function fetchEvmBalance(addr: string) {
    const res = await fetch(`/api/evm/balance?address=${encodeURIComponent(addr)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load Ethereum balance.");
    return data;
  }

  async function handleEvmView() {
    const raw = evmAddressInput.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      setEvmError("Enter a valid Ethereum address (0x...).");
      return;
    }
    setEvmError("");
    setEvmShield(null);
    setEvmLoading(true);
    try {
      const data = await fetchEvmBalance(raw);
      setEvmShield(data);
      setEvmActiveAddress(raw);
    } catch (e: unknown) {
      setEvmError((e as Error).message || "Failed to load. Check the address.");
    } finally {
      setEvmLoading(false);
    }
  }

  async function handleEvmViewWallets() {
    if (!evmAddress1) {
      setEvmError("Connect MetaMask Key 1 first.");
      return;
    }
    let vaultAddr = evmConnectVaultInput.trim();
    if (!vaultAddr) {
      const cached = lookupEvmVaultByAddress(evmAddress1);
      if (cached) vaultAddr = cached.vaultAddress;
    }
    if (!vaultAddr || !/^0x[0-9a-fA-F]{40}$/.test(vaultAddr)) {
      setEvmError("Enter your Qoin address below, or create a Qoin first.");
      return;
    }
    setEvmError("");
    setEvmShield(null);
    setEvmLoading(true);
    try {
      const data = await fetchEvmBalance(vaultAddr);
      setEvmShield(data);
      setEvmActiveAddress(vaultAddr);
    } catch (e: unknown) {
      setEvmError((e as Error).message || "Failed to load. Check the Qoin address.");
    } finally {
      setEvmLoading(false);
    }
  }

  async function handleView() {
    const raw = shieldInput.trim();
    let addr = raw;
    if (isValidPrivateKey(raw)) {
      try {
        addr = keypairFromPrivateKey(raw).publicKey.toBase58();
      } catch {
        setError("Invalid private key.");
        return;
      }
    } else if (!isValidPublicKey(raw)) {
      setError("Enter a Qoin address, Key 1, or Key 2.");
      return;
    }
    setError("");
    setShield(null);
    setDexPrices({});
    setLoading(true);
    try {
      const data = await fetchBalance(addr);
      setShield(data);
      setActiveShieldAddress(addr);
      setShieldInput(addr);
      setSidebarSelected(WSOL_MINT);
      setActiveTab(null);
      fetchChart(WSOL_MINT);
      fetchDexPrices(["__sol__", ...data.tokens.map(t => t.mint)]);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load. Check the address.");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewByPubkeys() {
    const p1 = pub1Input.trim();
    const p2 = pub2Input.trim();
    if (!isValidPublicKey(p1)) {
      setError("Key 1 must be a valid public key.");
      return;
    }
    if (p2 && !isValidPublicKey(p2)) {
      setError("Key 2 must be a valid public key.");
      return;
    }
    setError("");
    setShield(null);
    setDexPrices({});
    setLoading(true);
    try {
      const url = p2
        ? `/api/qoin/find-vault?key1=${encodeURIComponent(p1)}&key2=${encodeURIComponent(p2)}`
        : `/api/qoin/find-vault?key1=${encodeURIComponent(p1)}`;
      const r = await fetch(url);
      const d = await r.json() as { vaults?: string[]; error?: string };
      if (!d.vaults || d.vaults.length === 0) throw new Error("No Qoin found for this key.");
      const vaultAddr = d.vaults[0];
      const data = await fetchBalance(vaultAddr);
      setShield(data);
      setActiveShieldAddress(vaultAddr);
      setShieldInput(vaultAddr);
      setSidebarSelected(WSOL_MINT);
      setActiveTab(null);
      fetchChart(WSOL_MINT);
      fetchDexPrices(["__sol__", ...data.tokens.map(t => t.mint)]);
    } catch (e: unknown) {
      setError((e as Error).message || "Qoin not found.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupSlots() {
    if (!activeShieldAddress) return;
    setSlotsLoading(true);
    setSlotsError("");
    setSlotsDone(false);
    try {
      const res = await fetch("/api/qoin/init-all-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multisigAddress: activeShieldAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to setup slots.");
      setSlotsDone(true);
      // Refresh balance after setup
      const updated = await fetchBalance(activeShieldAddress);
      setShield(updated);
    } catch (e: unknown) {
      setSlotsError((e as Error).message || "Failed to setup slots.");
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleCreateTokenAccountSidebar() {
    if (!activeShieldAddress || !customMint.trim() || !isValidPublicKey(customMint.trim())) return;
    setCustomCreating(true);
    setCustomTaError("");
    setCustomTaSig("");
    try {
      const res = await fetch("/api/qoin/create-token-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multisigAddress: activeShieldAddress, mintAddress: customMint.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create token account.");
      setCustomDepositAddr(data.tokenAccountAddress);
      if (data.signature) setCustomTaSig(data.signature);
      saveTokenDeposit(activeShieldAddress, customMint.trim(), data.tokenAccountAddress);
    } catch (e: unknown) {
      setCustomTaError((e as Error).message || "Failed to create token account.");
    } finally {
      setCustomCreating(false);
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

  async function handleTransferWallets() {
    if (!shield || !selectedToken) return;
    const key2Pubkey = phantom2Pubkey;
    const signK2 = signWithPhantom2;
    if (!signWithPhantom || !signK2 || !phantomPubkey || !key2Pubkey) return;
    setTxLoading(true);
    setTxError("");
    setTxSig("");
    setSigningStep(null);
    try {
      if (!recipient || !isValidPublicKey(recipient)) throw new Error("Invalid recipient address.");
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) throw new Error("Enter a valid amount.");
      if (parseFloat(amount) > selectedToken.balance) throw new Error("Insufficient balance.");

      const wrappedPhantom = async (tx: import("@solana/web3.js").Transaction) => {
        setSigningStep("phantom");
        return signWithPhantom(tx);
      };
      const wrappedK2 = async (tx: import("@solana/web3.js").Transaction) => {
        setSigningStep("solflare");
        return signK2(tx);
      };

      setSigningStep("phantom");
      const sig = await transferSPLTokenWallets(
        phantomPubkey,
        key2Pubkey,
        wrappedPhantom,
        wrappedK2,
        activeShieldAddress,
        selectedToken.mint,
        selectedToken.tokenAccount,
        recipient,
        parseFloat(amount),
        selectedToken.decimals
      );
      setSigningStep("broadcasting");
      setTxSig(sig);
      const updated = await fetchBalance(activeShieldAddress);
      setShield(updated);
    } catch (e: unknown) {
      console.error("Transfer error:", e);
      let msg = "Transfer failed.";
      if (typeof e === "string" && e) {
        msg = e;
      } else if (e && typeof e === "object") {
        const obj = e as { message?: unknown; error?: unknown };
        const inner = obj.error instanceof Error ? obj.error.message
          : (typeof obj.error === "string" ? obj.error : null);
        const outer = typeof obj.message === "string" ? obj.message : null;
        msg = inner || outer || msg;
      }
      setTxError(msg);
    } finally {
      setTxLoading(false);
      setSigningStep(null);
    }
  }

  async function handleViewWallets(overrideAddress?: string) {
    const addr = overrideAddress ?? shieldInput.trim();
    if (!addr || !isValidPublicKey(addr)) {
      setError("Enter a valid Qoin address.");
      return;
    }
    if (!overrideAddress) setShieldInput(addr);
    setError("");
    setShield(null);
    setDexPrices({});
    setWalletMismatch(null);
    setLoading(true);
    try {
      const data = await fetchBalance(addr);
      setShield(data);
      setActiveShieldAddress(addr);
      setSidebarSelected(WSOL_MINT);
      setActiveTab(null);
      fetchChart(WSOL_MINT);
      fetchDexPrices(["__sol__", ...data.tokens.map(t => t.mint)]);
      // Mark which pubkey loaded this shield so account-switch reset knows not to re-trigger
      loadedForPubkeyRef.current = phantomPubkey;

      // Check if connected wallets match registered vault signers
      if (phantomPubkey || phantom2Pubkey) {
        try {
          const sigRes = await fetch(`/api/qoin/multisig-signers?address=${encodeURIComponent(addr)}`);
          if (sigRes.ok) {
            const { signers } = await sigRes.json() as { signers: string[] };
            const missing: string[] = [];
            if (phantomPubkey && !signers.includes(phantomPubkey)) missing.push("Phantom (K1)");
            if (phantom2Pubkey && !signers.includes(phantom2Pubkey)) missing.push("Solflare (K2)");
            if (missing.length > 0) {
              setWalletMismatch(
                `${missing.join(" & ")} connected is not a signer of this Qoin. ` +
                `Make sure you connect the exact same wallets used when the Qoin was created. ` +
                `You can still view balances, but Send will be rejected on-chain.`
              );
            }
          }
        } catch {
          // Signer check is advisory only — don't block vault load if it fails
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load. Check the address.");
    } finally {
      setLoading(false);
    }
  }

  const selHeld = shield?.tokens.find((t) => t.mint === sidebarSelected) ?? null;
  const selPopular = POPULAR_TOKENS.find((t) => t.mint === sidebarSelected) ?? null;
  const selMeta = tokenMeta[sidebarSelected];
  const receiveAddr = getTokenDepositAddress(activeShieldAddress || "11111111111111111111111111111111", sidebarSelected);

  const solDex = dexPrices["__sol__"];
  const selDex = dexPrices[sidebarSelected];

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

  const selLabel = DISPLAY_SYMBOL[sidebarSelected]
    ?? (selHeld?.symbol ?? selMeta?.symbol ?? selPopular?.symbol ?? sidebarSelected.slice(0, 6));

  const selLogo = selHeld?.logo ?? selMeta?.image ?? null;

  const activeChange = chartChange ?? selDex?.change24h ?? null;
  const chartIsPositive = !activeChange || activeChange >= 0;
  const chartColor = chartIsPositive ? "#F7931A" : "#1a1a1a";

  function fmtPrice(p: number): string {
    if (p >= 1) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 0.01) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(8)}`;
  }

  function fmtBalance(n: number): string {
    if (n === 0) return "0.00";
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (n >= 0.0001) return n.toFixed(6);
    return n.toPrecision(4);
  }

  function selectToken(mint: string, held?: TokenBalance) {
    setSidebarSelected(mint);
    setActiveTab(null);
    setRecipient(""); setAmount(""); setTxSig(""); setTxError("");
    if (held) setSelectedToken(held);
  }

  const needsSetup = !!(shield && activeShieldAddress && (shield.tokens.some(tk => tk.isLocked) || shield.tokens.length === 0) && !slotsDone);

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${dark ? "bg-[#0f0f0f]" : "bg-[#FAFAF5]"}`}>

      {/* TOP BAR always visible */}
      <div className={`flex-shrink-0 border-b-2 ${dm.topBar} px-5 py-3 flex items-center gap-4`}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 flex-shrink-0 group">
          <SketchShield className={`w-7 h-7 group-hover:opacity-70 transition-opacity ${dm.text}`} />
          <span className={`font-sketch text-lg ${dm.text}`}>Qoin</span>
        </button>

        {/* Only show address bar + info when vault is loaded */}
        {shield && (
          <>
            <span className={`${dm.sep} text-lg flex-shrink-0`}>/</span>
            <div className="flex-1 min-w-0 hidden md:block">
              <span className={`font-mono text-xs ${dm.faint40} truncate block`}>{activeShieldAddress}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`font-mono text-sm font-bold ${dm.muted} md:hidden`}>
                {activeShieldAddress.slice(0, 6)}…{activeShieldAddress.slice(-4)}
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
                className={`font-body font-bold text-sm ${dm.muted} hover:text-[#F7931A] transition-colors`}
              >
                {addrCopied ? t.access.copied : t.access.copyAddr}
              </button>
              <button
                onClick={() => { setShield(null); setActiveShieldAddress(""); setShieldInput(""); setActiveTab(null); }}
                className={`font-body font-bold text-sm ${dm.faint} hover:text-red-500 transition-colors`}
              >Close</button>
              <span title="Live, auto-refreshing every 5s" className={`flex items-center gap-1 font-handwritten text-xs ${dm.faint}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                Live
              </span>
            </div>
          </>
        )}
        {evmShield && (
          <>
            <span className={`${dm.sep} text-lg flex-shrink-0`}>/</span>
            <div className="flex-1 min-w-0 hidden md:block">
              <span className={`font-mono text-xs ${dm.faint40} truncate block`}>{evmActiveAddress}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`font-mono text-sm font-bold ${dm.muted} md:hidden`}>
                {evmActiveAddress.slice(0, 6)}…{evmActiveAddress.slice(-4)}
              </span>
              <a
                href={`https://blockchair.com/ethereum/address/${evmActiveAddress}`}
                target="_blank" rel="noopener noreferrer"
                className="font-body font-bold text-sm text-[#F7931A] hover:underline"
              >Blockchair</a>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(evmActiveAddress);
                  setEvmAddrCopied(true);
                  setTimeout(() => setEvmAddrCopied(false), 2000);
                }}
                className={`font-body font-bold text-sm ${dm.muted} hover:text-[#F7931A] transition-colors`}
              >
                {evmAddrCopied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => { setEvmShield(null); setEvmActiveAddress(""); setEvmAddressInput(""); setEvmSidebarSelected("eth"); setEvmActiveTab(null); }}
                className={`font-body font-bold text-sm ${dm.faint} hover:text-red-500 transition-colors`}
              >Close</button>
              <span title="Live, auto-refreshing every 10s" className={`flex items-center gap-1 font-handwritten text-xs ${dm.faint}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                Live
              </span>
            </div>
          </>
        )}
        {error && <span className="font-handwritten text-sm text-[#F7931A] ml-auto">{error}</span>}
      </div>

      {/* BODY */}
      {!shield && !evmShield ? (
        /* ── ENTRY SCREEN ── */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SketchShield className={`w-14 h-14 mb-5 opacity-15 ${dm.text}`} />
          <h1 className={`font-sketch text-4xl ${dm.text} mb-1`}>{t.access.openBtn}</h1>
          <p className={`font-handwritten text-base ${dm.faint40} mb-6`}>
            {t.access.enterKeys}
          </p>

          {/* Mode selector */}
          <div className="w-full max-w-md mb-6">
            <div className={`flex border-2 ${dark ? "border-[#FAFAF5]/20" : "border-[#1a1a1a]"} rounded-sm overflow-hidden`}>
              <button
                onClick={() => { setAccessMode("cold-keys"); setError(""); setEvmError(""); }}
                className={`flex-1 py-3 font-body font-bold text-sm transition-all ${accessMode === "cold-keys" ? "bg-[#1a1a1a] text-white" : dark ? "text-[#FAFAF5]/50 hover:bg-[#FAFAF5]/5" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
              >
                Cold Keys
              </button>
              <button
                onClick={() => { setAccessMode("connect-wallets"); setError(""); setEvmError(""); }}
                className={`flex-1 py-3 font-body font-bold text-sm transition-all ${dark ? "border-l-2 border-[#FAFAF5]/20" : "border-l-2 border-[#1a1a1a]"} ${accessMode === "connect-wallets" ? "bg-[#1a1a1a] text-white" : dark ? "text-[#FAFAF5]/50 hover:bg-[#FAFAF5]/5" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
              >
                Connect Wallets
              </button>
            </div>
          </div>

          {/* Cold Keys inline chain selector */}
          {accessMode === "cold-keys" && (
            <div className="w-full max-w-md mb-3">
              <div className={`flex border-2 ${dark ? "border-[#FAFAF5]/15" : "border-[#1a1a1a]/20"} rounded-sm overflow-hidden text-sm font-body font-bold`}>
                <button
                  onClick={() => setChain("evm")}
                  className={`flex-1 py-2.5 transition-all ${chain === "evm" ? "bg-[#1a1a1a] text-white" : dark ? "text-[#FAFAF5]/40 hover:bg-[#FAFAF5]/5" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                >
                  EVM
                </button>
                <button
                  onClick={() => setChain("solana")}
                  className={`flex-1 py-2.5 ${dark ? "border-l-2 border-[#FAFAF5]/15" : "border-l-2 border-[#1a1a1a]/20"} transition-all ${chain === "solana" ? "bg-[#1a1a1a] text-white" : dark ? "text-[#FAFAF5]/40 hover:bg-[#FAFAF5]/5" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                >
                  Solana
                </button>
              </div>
            </div>
          )}

          {/* EVM — Direct Address mode */}
          {chain === "evm" && accessMode === "cold-keys" && (
            <div className="w-full max-w-md space-y-3">
              <p className={`font-handwritten text-sm ${dm.faint40}`}>
                Enter your Qoin address to view your ETH and ERC-20 balances.
              </p>
              <input
                type="text"
                value={evmAddressInput}
                onChange={(e) => { setEvmAddressInput(e.target.value); setEvmError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleEvmView()}
                placeholder="0x..."
                className="input-sketch w-full text-sm py-3.5 font-mono"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={handleEvmView}
                disabled={evmLoading || !evmAddressInput.trim()}
                className="btn-sketch w-full py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {evmLoading ? "Loading..." : t.access.openBtn}
              </button>
              {evmError && <p className="font-handwritten text-sm text-[#F7931A]">{evmError}</p>}
            </div>
          )}

          {/* Connect Wallets inline chain selector */}
          {accessMode === "connect-wallets" && (
            <div className="w-full max-w-md mb-3">
              <div className={`flex border-2 ${dark ? "border-[#FAFAF5]/15" : "border-[#1a1a1a]/20"} rounded-sm overflow-hidden text-sm font-body font-bold`}>
                <button
                  onClick={() => setChain("evm")}
                  className={`flex-1 py-2.5 transition-all ${chain === "evm" ? "bg-[#1a1a1a] text-white" : dark ? "text-[#FAFAF5]/40 hover:bg-[#FAFAF5]/5" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                >
                  EVM
                </button>
                <button
                  onClick={() => setChain("solana")}
                  className={`flex-1 py-2.5 ${dark ? "border-l-2 border-[#FAFAF5]/15" : "border-l-2 border-[#1a1a1a]/20"} transition-all ${chain === "solana" ? "bg-[#1a1a1a] text-white" : dark ? "text-[#FAFAF5]/40 hover:bg-[#FAFAF5]/5" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                >
                  Solana
                </button>
              </div>
            </div>
          )}

          {/* EVM — Connect Wallets mode (Dual MetaMask) */}
          {chain === "evm" && accessMode === "connect-wallets" && (
            <div className="w-full max-w-md space-y-4">
              <p className={`font-handwritten text-sm ${dm.faint40}`}>
                Connect two MetaMask accounts as co-signers. Key 1 is used to look up the Qoin address.
              </p>

              {/* MetaMask K1 */}
              <div className={`border-2 ${dark ? "border-[#FAFAF5]/15" : "border-[#1a1a1a]"} rounded-sm overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${dm.cardBorder} ${dm.sectionHead}`}>
                  <div className="flex items-center gap-2">
                    <img src="/metamask-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" alt="MetaMask" />
                    <span className={`font-body font-bold text-sm ${dm.text}`}>Key 1 (MetaMask)</span>
                  </div>
                  {evmAddress1 && (
                    <span className={`font-mono text-xs ${dm.faint40}`}>{evmAddress1.slice(0, 6)}...{evmAddress1.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {evmError1 && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{evmError1}</p>}
                  {evmAddress1 ? (
                    <button onClick={disconnectK1} className={`w-full font-body font-bold text-xs py-2 border ${dm.btnOutline} rounded-sm transition-all`}>
                      Disconnect K1
                    </button>
                  ) : (
                    <button
                      onClick={connectK1}
                      disabled={evmConnecting1}
                      className={`w-full font-body font-bold text-sm py-2.5 border-2 ${dark ? "border-[#FAFAF5]/20 bg-transparent text-[#FAFAF5] hover:bg-[#FAFAF5]/10" : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"} rounded-sm transition-all disabled:opacity-40`}
                    >
                      {evmConnecting1 ? "Connecting..." : "Connect MetaMask (Key 1)"}
                    </button>
                  )}
                </div>
              </div>

              {/* MetaMask K2 */}
              <div className={`border-2 ${dark ? "border-[#FAFAF5]/15" : "border-[#1a1a1a]"} rounded-sm overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${dm.cardBorder} ${dm.sectionHead}`}>
                  <div className="flex items-center gap-2">
                    <img src="/metamask-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" alt="MetaMask" />
                    <span className={`font-body font-bold text-sm ${dm.text}`}>Key 2 (MetaMask)</span>
                  </div>
                  {evmAddress2 && (
                    <span className={`font-mono text-xs ${dm.faint40}`}>{evmAddress2.slice(0, 6)}...{evmAddress2.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {evmError2 && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{evmError2}</p>}
                  {evmAddress2 ? (
                    <button onClick={disconnectK2} className={`w-full font-body font-bold text-xs py-2 border ${dm.btnOutline} rounded-sm transition-all`}>
                      Disconnect K2
                    </button>
                  ) : (
                    <button
                      onClick={connectK2}
                      disabled={evmConnecting2}
                      className={`w-full font-body font-bold text-sm py-2.5 border-2 ${dark ? "border-[#FAFAF5]/20 bg-transparent text-[#FAFAF5] hover:bg-[#FAFAF5]/10" : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"} rounded-sm transition-all disabled:opacity-40`}
                    >
                      {evmConnecting2 ? "Connecting..." : "Connect MetaMask (Key 2)"}
                    </button>
                  )}
                  {!evmAddress2 && <p className={`font-handwritten text-xs ${dm.faint} mt-1.5`}>Switch MetaMask account before connecting Key 2.</p>}
                </div>
              </div>

              {/* Qoin address input — auto-filled from localStorage if known */}
              <div>
                <label className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-widest block mb-1.5`}>
                  Qoin Address
                </label>
                <input
                  type="text"
                  placeholder="0x... (your Qonjoint Qoin)"
                  value={evmConnectVaultInput}
                  onChange={(e) => { setEvmConnectVaultInput(e.target.value); setEvmError(""); }}
                  className="input-sketch w-full text-sm py-3 font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                {!evmConnectVaultInput && evmAddress1 && (
                  <p className={`font-handwritten text-xs ${dm.faint} mt-1`}>
                    No saved Qoin found for this key. Paste your Qoin address above, or{" "}
                    <button type="button" className="text-[#F7931A] underline" onClick={() => navigate("/qoin/create")}>create one</button>.
                  </p>
                )}
                {evmConnectVaultInput && !/^0x[0-9a-fA-F]{40}$/.test(evmConnectVaultInput.trim()) && (
                  <p className="font-handwritten text-xs text-red-500 mt-1">Invalid Ethereum address format.</p>
                )}
              </div>

              <button
                onClick={handleEvmViewWallets}
                disabled={evmLoading || !evmAddress1 || (!!evmConnectVaultInput && !/^0x[0-9a-fA-F]{40}$/.test(evmConnectVaultInput.trim()))}
                className="btn-sketch w-full py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {evmLoading ? "Loading..." : !evmAddress1 ? "Connect Key 1 first" : "Open Qoin"}
              </button>
              {evmError && <p className="font-handwritten text-sm text-[#F7931A]">{evmError}</p>}
            </div>
          )}

          {/* SOL — Cold Keys mode */}
          {chain === "solana" && accessMode === "cold-keys" && (
            <div className="w-full max-w-md space-y-3">
              <p className={`font-handwritten text-sm ${dm.faint40}`}>
                Paste either Key 1 or Key 2 to find your Qoin.
              </p>
              <input
                type="text"
                value={pub1Input}
                onChange={(e) => { setPub1Input(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleViewByPubkeys()}
                placeholder="Key 1 or Key 2 public key..."
                className="input-sketch w-full text-sm py-3.5 font-mono"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={handleViewByPubkeys}
                disabled={loading || !isValidPublicKey(pub1Input.trim())}
                className="btn-sketch w-full py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? t.access.opening : t.access.openBtn}
              </button>
              <div className="text-center pt-1">
                <button
                  onClick={() => { setShowDirectAddr(v => !v); setError(""); }}
                  className={`font-handwritten text-sm ${dm.muted} hover:text-[#F7931A] transition-all`}
                >
                  {showDirectAddr ? "Hide direct entry" : "Have your Qoin address? Enter directly →"}
                </button>
                {showDirectAddr && (
                  <div className="flex gap-3 mt-2">
                    <input
                      type="text"
                      value={shieldInput}
                      onChange={(e) => { setShieldInput(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleView()}
                      placeholder="Qoin address..."
                      className="input-sketch flex-1 text-sm py-3 font-mono"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <button
                      onClick={handleView}
                      disabled={loading || !shieldInput.trim()}
                      className="btn-sketch px-5 py-3 text-sm flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? t.access.opening : t.access.openBtn}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SOL — Connect Wallets mode (Phantom + Solflare) */}
          {chain === "solana" && accessMode === "connect-wallets" && (
            <div className="w-full max-w-md space-y-4">

              <p className={`font-handwritten text-sm ${dm.faint40}`}>
                Connect Phantom as Key 1 and Solflare as Key 2. Both must be installed.
              </p>

              {/* Key 1 (always Phantom) */}
              <div className={`border-2 ${dark ? "border-[#FAFAF5]/15" : "border-[#1a1a1a]"} rounded-sm overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${dm.cardBorder} ${dm.sectionHead}`}>
                  <div className="flex items-center gap-2">
                    <img src="/phantom-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" style={{ opacity: phantomPubkey ? 1 : 0.6 }} alt="Phantom" />
                    <span className={`font-body font-bold text-sm ${dm.text}`}>Key 1 (Phantom)</span>
                  </div>
                  {phantomPubkey && (
                    <span className={`font-mono text-xs ${dm.faint40}`}>{phantomPubkey.slice(0, 6)}...{phantomPubkey.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {phantomError && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{phantomError}</p>}
                  {phantomPubkey ? (
                    <button onClick={disconnectPhantom} className={`w-full font-body font-bold text-xs py-2 border ${dm.btnOutline} rounded-sm transition-all`}>
                      Disconnect Phantom
                    </button>
                  ) : (
                    <button
                      onClick={connectPhantom}
                      disabled={phantomConnecting}
                      className={`w-full font-body font-bold text-sm py-2.5 border-2 ${dark ? "border-[#FAFAF5]/20 bg-transparent text-[#FAFAF5] hover:bg-[#FAFAF5]/10" : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"} rounded-sm transition-all disabled:opacity-40`}
                    >
                      {phantomConnecting ? "Connecting..." : "Connect Phantom"}
                    </button>
                  )}
                </div>
              </div>

              {/* Key 2 — Solflare */}
              <div className={`border-2 ${dark ? "border-[#FAFAF5]/15" : "border-[#1a1a1a]"} rounded-sm overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${dm.cardBorder} ${dm.sectionHead}`}>
                  <div className="flex items-center gap-2">
                    <img src="/solflare-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" style={{ opacity: phantom2Pubkey ? 1 : 0.6 }} alt="Solflare" />
                    <span className={`font-body font-bold text-sm ${dm.text}`}>Key 2 (Solflare)</span>
                  </div>
                  {phantom2Pubkey && (
                    <span className={`font-mono text-xs ${dm.faint40}`}>{phantom2Pubkey.slice(0, 6)}...{phantom2Pubkey.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {phantom2Error && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{phantom2Error}</p>}
                  {!phantomPubkey && <p className={`font-handwritten text-xs ${dm.faint} mb-2`}>Connect Key 1 first.</p>}
                  {phantom2Pubkey ? (
                    <button onClick={disconnectPhantom2} className={`w-full font-body font-bold text-xs py-2 border ${dm.btnOutline} rounded-sm transition-all`}>
                      Disconnect Solflare (K2)
                    </button>
                  ) : (
                    <button
                      onClick={connectPhantom2}
                      disabled={phantom2Connecting || !phantomPubkey}
                      className={`w-full font-body font-bold text-sm py-2.5 border-2 ${dark ? "border-[#FAFAF5]/20 bg-transparent text-[#FAFAF5] hover:bg-[#FAFAF5]/10" : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"} rounded-sm transition-all disabled:opacity-40`}
                    >
                      {phantom2Connecting ? "Connecting..." : "Connect Solflare (Key 2)"}
                    </button>
                  )}
                  {!phantom2Pubkey && phantomPubkey && (
                    <p className={`font-handwritten text-xs ${dm.faint} mt-1.5`}>Open Solflare extension and connect as Key 2.</p>
                  )}
                </div>
              </div>

              {/* Qoin address input */}
              {(() => {
                const key2Connected = !!phantom2Pubkey;
                return (
                  <div>
                    <label className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-wide mb-1.5 block`}>Qoin Address</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={shieldInput}
                        onChange={(e) => { setShieldInput(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && phantomPubkey && key2Connected && handleViewWallets()}
                        placeholder="Your Qoin address..."
                        className="input-sketch flex-1 text-sm py-3 font-mono"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        onClick={() => handleViewWallets()}
                        disabled={loading || !shieldInput.trim() || !phantomPubkey || !key2Connected}
                        className="btn-sketch px-5 py-3 text-sm flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {loading ? t.access.opening : t.access.openBtn}
                      </button>
                    </div>
                    {(!phantomPubkey || !key2Connected) && shieldInput && (
                      <p className={`font-handwritten text-xs ${dm.faint} mt-1.5`}>Connect both wallets first.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {error && (
            <p className="font-handwritten text-sm text-[#F7931A] mt-4">{error}</p>
          )}
          <button
            onClick={() => navigate("/qoin/create")}
            className={`font-handwritten text-base ${dm.muted} hover:text-[#F7931A] transition-colors mt-8`}
          >
            Don't have a Qoin? Create one →
          </button>
        </div>
      ) : evmShield ? (() => {
        const evmSelIsEth = evmSidebarSelected === "eth";
        const evmSelToken = evmSelIsEth ? null : evmShield.tokens.find(t => t.contract === evmSidebarSelected);
        const evmSelSymbol = evmSelIsEth ? "ETH" : (evmSelToken?.symbol ?? "");
        const evmSelName   = evmSelIsEth ? "Ether" : (evmSelToken?.name ?? "");
        const evmSelBal    = evmSelIsEth ? evmShield.ethBalance : (evmSelToken?.balance ?? 0);
        const evmSelLogo   = evmSelIsEth ? (evmShield.ethLogo || "/eth-logo.png") : (evmSelToken?.logo ?? "");
        const evmSelDec    = evmSelIsEth ? 18 : (evmSelToken?.decimals ?? 18);

        function resetSend() {
          setEvmSendStatus("idle"); setEvmSig1(null); setEvmSig2(null);
          setEvmSendNonce(null); setEvmSendRecipient(""); setEvmSendAmount(""); setEvmSendError("");
        }

        return (
        /* ── EVM DASHBOARD ── */
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR */}
          <div className={`w-14 md:w-60 flex-shrink-0 border-r-2 ${dm.divider} ${dm.sidebar} flex flex-col overflow-hidden`}>
            <div className="overflow-y-auto flex-1 py-2">

              <div className="hidden md:block px-4 pt-2 pb-1">
                <span className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-widest`}>{t.access.tokens}</span>
              </div>

              {/* ETH row */}
              <button
                onClick={() => { setEvmSidebarSelected("eth"); setEvmActiveTab(null); resetSend(); }}
                className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2.5 transition-all ${evmSidebarSelected === "eth" ? dm.sidebarSelected : dm.sidebarHover}`}
              >
                <img src={evmShield.ethLogo || "/eth-logo.png"} alt="ETH" className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/eth-logo.png"; }} />
                <div className="hidden md:flex min-w-0 flex-1 items-center justify-between gap-1">
                  <span className={`font-body font-bold text-sm ${dm.text} truncate leading-none`}>ETH</span>
                  <span className={`font-mono text-xs ${dm.muted} flex-shrink-0`}>{fmtBalance(evmShield.ethBalance)}</span>
                </div>
              </button>

              {/* ERC-20 tokens */}
              {evmShield.tokens.map((tok) => (
                <button
                  key={tok.contract}
                  onClick={() => { setEvmSidebarSelected(tok.contract); setEvmActiveTab(null); resetSend(); }}
                  className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2.5 transition-all ${evmSidebarSelected === tok.contract ? dm.sidebarSelected : dm.sidebarHover}`}
                >
                  {tok.logo ? (
                    <img src={tok.logo} alt={tok.symbol} className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className={`w-9 h-9 rounded-full ${dm.iconCircle} flex items-center justify-center flex-shrink-0`}>
                      <span className={`font-sketch text-xs ${dm.faint40}`}>{tok.symbol.slice(0, 2)}</span>
                    </div>
                  )}
                  <div className="hidden md:flex min-w-0 flex-1 items-center justify-between gap-1">
                    <span className={`font-body font-bold text-sm ${dm.text} truncate leading-none`}>{tok.symbol}</span>
                    <span className={`font-mono text-xs ${dm.muted} flex-shrink-0`}>{fmtBalance(tok.balance)}</span>
                  </div>
                </button>
              ))}

              {evmShield.tokens.length === 0 && (
                <div className="hidden md:block px-4 py-3">
                  <p className={`font-handwritten text-sm ${dm.faint40}`}>No ERC-20 tokens.</p>
                </div>
              )}
            </div>

            {/* Sidebar footer */}
            <div className={`hidden md:block border-t-2 ${dm.divider} px-4 py-3 flex-shrink-0`}>
              <div className={`font-body font-bold text-xs ${dm.muted} mb-0.5`}>Qoin Address</div>
              <div className={`font-mono text-[10px] ${dm.faint40} break-all leading-relaxed`}>{evmActiveAddress}</div>
              <div className="flex gap-2 mt-2">
                <a
                  href={`https://blockchair.com/ethereum/address/${evmActiveAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="font-body font-bold text-xs text-[#F7931A] hover:underline"
                >Blockchair ↗</a>
                <button
                  onClick={() => { setEvmShield(null); setEvmActiveAddress(""); setEvmAddressInput(""); setEvmSidebarSelected("eth"); setEvmActiveTab(null); }}
                  className={`font-body font-bold text-xs ${dm.faint} hover:text-red-500 transition-colors`}
                >Close</button>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

              {/* Token header */}
              <div className="flex items-center gap-4">
                {evmSelLogo ? (
                  <img src={evmSelLogo} className="w-14 h-14 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className={`w-14 h-14 rounded-full ${dm.iconCircle} flex items-center justify-center flex-shrink-0`}>
                    <span className={`font-sketch text-base ${dm.faint}`}>{evmSelSymbol.slice(0, 3)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`font-sketch text-3xl ${dm.text} leading-none`}>{evmSelSymbol}</div>
                  <div className="font-sketch text-xl mt-0.5 leading-none" style={{ color: evmSelBal > 0 ? "#F7931A" : (dark ? "#FAFAF5" : "#1a1a1a"), opacity: evmSelBal > 0 ? 1 : 0.3 }}>
                    {fmtBalance(evmSelBal)} {evmSelSymbol}
                  </div>
                  {(() => {
                    const ep = evmPrices[evmSelIsEth ? "eth" : evmSidebarSelected.toLowerCase()];
                    if (!ep?.price) return null;
                    return (
                      <>
                        <div className={`font-mono text-sm ${dm.muted} mt-1`}>{fmtPrice(ep.price)} per token</div>
                        {evmSelBal > 0 && <div className={`font-mono text-sm ${dm.faint40} mt-0.5`}>{fmtPrice(evmSelBal * ep.price)} total</div>}
                      </>
                    );
                  })()}
                </div>
                {(() => {
                  const ep = evmPrices[evmSelIsEth ? "eth" : evmSidebarSelected.toLowerCase()];
                  if (ep?.change24h == null) return null;
                  return (
                    <div className="text-right flex-shrink-0">
                      <div className="font-sketch text-xl" style={{ color: ep.change24h >= 0 ? "#F7931A" : (dark ? "#FAFAF5" : "#1a1a1a"), opacity: ep.change24h >= 0 ? 1 : 0.7 }}>
                        {ep.change24h >= 0 ? "+" : ""}{ep.change24h.toFixed(2)}%
                      </div>
                      <div className={`font-handwritten text-sm ${dm.muted}`}>24h change</div>
                    </div>
                  );
                })()}
                {/* Mobile close */}
                <button
                  onClick={() => { setEvmShield(null); setEvmActiveAddress(""); setEvmAddressInput(""); setEvmSidebarSelected("eth"); setEvmActiveTab(null); }}
                  className={`md:hidden font-body font-bold text-xs ${dm.faint} hover:text-red-500 transition-colors flex-shrink-0`}
                >✕ Close</button>
              </div>

              {/* Co-signers strip */}
              {(evmAddress1 || evmAddress2) && (
                <div className={`flex items-center gap-4 px-4 py-3 border ${dm.cardBorder} rounded-sm ${dm.sectionHead}`}>
                  {evmAddress1 && (
                    <div className="flex items-center gap-1.5">
                      <img src="/metamask-logo.png" className="w-4 h-4 rounded flex-shrink-0" alt="MetaMask" />
                      <span className={`font-mono text-xs ${dm.muted}`}>K1 {evmAddress1.slice(0, 6)}…{evmAddress1.slice(-4)}</span>
                    </div>
                  )}
                  {evmAddress2 && (
                    <div className="flex items-center gap-1.5">
                      <img src="/metamask-logo.png" className="w-4 h-4 rounded flex-shrink-0" alt="MetaMask" />
                      <span className={`font-mono text-xs ${dm.muted}`}>K2 {evmAddress2.slice(0, 6)}…{evmAddress2.slice(-4)}</span>
                    </div>
                  )}
                  <a href={`https://blockchair.com/ethereum/address/${evmActiveAddress}`} target="_blank" rel="noopener noreferrer" className="ml-auto font-body font-bold text-xs text-[#F7931A] hover:underline md:hidden">Blockchair ↗</a>
                </div>
              )}

              {/* Receive / Send / Swap action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEvmActiveTab(evmActiveTab === "receive" ? null : "receive")}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    evmActiveTab === "receive"
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                      : dark
                        ? "border-[#FAFAF5]/20 text-[#FAFAF5]/80 hover:bg-[#FAFAF5]/10"
                        : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Receive
                </button>
                <button
                  onClick={() => { setEvmActiveTab(evmActiveTab === "send" ? null : "send"); resetSend(); }}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    evmActiveTab === "send"
                      ? "border-[#F7931A] bg-[#F7931A] text-white"
                      : "border-[#F7931A] text-[#F7931A] hover:bg-[#F7931A] hover:text-white"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14V5M4 9l4-4 4 4M2 3h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Send
                </button>
                <button
                  onClick={() => setEvmActiveTab(evmActiveTab === "swap" ? null : "swap")}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    evmActiveTab === "swap"
                      ? dark ? "border-[#FAFAF5]/20 bg-[#FAFAF5]/10 text-[#FAFAF5]/60" : "border-[#1a1a1a]/40 bg-[#1a1a1a]/10 text-[#1a1a1a]/60"
                      : dark ? "border-[#FAFAF5]/10 text-[#FAFAF5]/30 hover:border-[#FAFAF5]/20 hover:text-[#FAFAF5]/50" : "border-[#1a1a1a]/20 text-[#1a1a1a]/30 hover:border-[#1a1a1a]/40 hover:text-[#1a1a1a]/50"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Swap
                </button>
              </div>
              {/* SWAP COMING SOON PANEL */}
              {evmActiveTab === "swap" && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.sectionHead} px-6 py-8 text-center space-y-3`}>
                  <div className={`font-sketch text-2xl ${dm.faint40}`}>Swap</div>
                  <div className={`font-handwritten text-base ${dm.muted} leading-relaxed`}>
                    Swap with 2-key signing protection is in development.<br />Coming soon.
                  </div>
                  <button onClick={() => setEvmActiveTab(null)} className={`font-handwritten text-xs ${dm.faint} hover:text-red-500 transition-colors`}>close</button>
                </div>
              )}

              {/* RECEIVE PANEL */}
              {evmActiveTab === "receive" && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} shadow-[3px_3px_0_#1a1a1a] overflow-hidden`}>
                  <div className="flex flex-col items-center px-6 py-8 space-y-5">
                    <div className={`font-sketch text-2xl ${dm.text}`}>Receive {evmSelSymbol}</div>
                    <div className={`w-full border-2 ${dm.cardBorder} ${dm.sectionHead} rounded-sm px-4 py-3 space-y-1`}>
                      <div className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-widest mb-1`}>Qoin Address</div>
                      <div className={`font-mono text-sm ${dm.text} break-all`}>{evmActiveAddress}</div>
                    </div>
                    <div className={`border-4 ${dm.cardBorder} p-4 rounded-sm bg-white shadow-[4px_4px_0_#1a1a1a]`}>
                      <QRCodeSVG value={evmActiveAddress} size={200} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
                    </div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(evmActiveAddress);
                        setEvmAddrCopied(true);
                        setTimeout(() => setEvmAddrCopied(false), 2000);
                      }}
                      className="btn-sketch px-8 py-3 text-sm"
                    >
                      {evmAddrCopied ? "Copied!" : "Copy Address"}
                    </button>
                    <p className={`font-handwritten text-xs ${dm.faint40} text-center max-w-xs`}>
                      Send {evmSelSymbol} directly to this Ethereum address. ETH and all ERC-20 tokens share the same Qoin address.
                    </p>
                  </div>
                </div>
              )}

              {/* SEND PANEL */}
              {evmActiveTab === "send" && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} shadow-[3px_3px_0_#1a1a1a] overflow-hidden`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${dm.divider} ${dm.sectionHead}`}>
                    <div className="flex items-center gap-2">
                      {evmSelLogo && <img src={evmSelLogo} className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                      <span className={`font-sketch text-base ${dm.text}`}>Send {evmSelSymbol}</span>
                    </div>
                    <button onClick={() => setEvmActiveTab(null)} className={`font-handwritten text-xs ${dm.faint} hover:text-red-500 transition-colors`}>cancel</button>
                  </div>

                  {evmSendStatus === "done" ? (
                    <div className="px-4 py-6 text-center space-y-3">
                      <div className={`font-sketch text-2xl ${dm.text}`}>Sent!</div>
                      <p className={`font-handwritten text-sm ${dm.muted}`}>Transaction submitted on-chain.</p>
                      <a href={`https://blockchair.com/ethereum/transaction/${evmSendTxHash}`} target="_blank" rel="noopener noreferrer" className="inline-block font-body font-bold text-sm text-[#F7931A] hover:underline">
                        View on Blockchair ↗
                      </a>
                      <div>
                        <button onClick={resetSend} className={`btn-sketch-outline text-sm py-2 px-5 ${dm.card} mt-2`}>Send another</button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-4 space-y-4">
                      {/* Cold Keys mode: show private key inputs */}
                      {accessMode === "cold-keys" && (
                        <div className={`border-2 ${dm.cardBorder} rounded-sm overflow-hidden`}>
                          <div className={`flex items-center gap-2 px-4 py-2.5 ${dm.sectionHead} border-b ${dm.divider}`}>
                            <SketchTwoKeys className="w-7 h-4 flex-shrink-0" />
                            <span className={`font-sketch text-sm ${dm.text}`}>Paste your two cold keys</span>
                            {hasBothEvmColdKeys && <span className="ml-auto font-handwritten text-sm text-[#F7931A]">Both keys loaded</span>}
                          </div>
                          <p className={`font-handwritten text-xs ${dm.faint} px-4 pt-2.5`}>Keys are used to sign locally. They are never sent to any server.</p>
                          <div className="p-4 space-y-3">
                            <div>
                              <label className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-wide mb-1 block`}>Private Key 1</label>
                              <div className="relative">
                                <input type={showEvmPk1 ? "text" : "password"} placeholder="0x hex private key..." value={evmPk1} onChange={(e) => { setEvmPk1(e.target.value); setEvmSig1(null); setEvmSig2(null); }} autoComplete="off" autoCorrect="off" spellCheck={false} className="input-sketch text-sm font-mono py-2 pr-16 w-full" />
                                <button onClick={() => setShowEvmPk1(!showEvmPk1)} className={`absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm ${dm.muted}`}>{showEvmPk1 ? "Hide" : "Show"}</button>
                              </div>
                              {evmPk1 && !evmPk1Valid && <p className="font-handwritten text-xs text-[#F7931A] mt-1">Invalid key format.</p>}
                            </div>
                            <div>
                              <label className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-wide mb-1 block`}>Private Key 2</label>
                              <div className="relative">
                                <input type={showEvmPk2 ? "text" : "password"} placeholder="0x hex private key..." value={evmPk2} onChange={(e) => { setEvmPk2(e.target.value); setEvmSig2(null); }} autoComplete="off" autoCorrect="off" spellCheck={false} className="input-sketch text-sm font-mono py-2 pr-16 w-full" />
                                <button onClick={() => setShowEvmPk2(!showEvmPk2)} className={`absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm ${dm.muted}`}>{showEvmPk2 ? "Hide" : "Show"}</button>
                              </div>
                              {evmPk2 && !evmPk2Valid && <p className="font-handwritten text-xs text-[#F7931A] mt-1">Invalid key format.</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Connect Wallets mode: show MetaMask connect prompts */}
                      {accessMode === "connect-wallets" && (!evmAddress1 || !evmAddress2) && (
                        <div className="space-y-2">
                          <p className={`font-handwritten text-sm ${dm.muted}`}>Both K1 and K2 must be connected to sign a send transaction.</p>
                          {!evmAddress1 && (
                            <button onClick={connectK1} disabled={evmConnecting1} className={`btn-sketch-outline w-full text-sm py-2 ${dm.card}`}>
                              {evmConnecting1 ? "Connecting..." : "Connect K1 (MetaMask)"}
                            </button>
                          )}
                          {evmAddress1 && !evmAddress2 && (
                            <button onClick={connectK2} disabled={evmConnecting2} className={`btn-sketch-outline w-full text-sm py-2 ${dm.card}`}>
                              {evmConnecting2 ? "Connecting..." : "Connect K2 (MetaMask)"}
                            </button>
                          )}
                          {evmError1 && <p className="font-handwritten text-xs text-red-500">{evmError1}</p>}
                          {evmError2 && <p className="font-handwritten text-xs text-red-500">{evmError2}</p>}
                        </div>
                      )}

                      {/* Send form: shown when cold keys loaded OR MetaMask connected */}
                      {((accessMode === "cold-keys" && hasBothEvmColdKeys) || (accessMode === "connect-wallets" && evmAddress1 && evmAddress2)) && (
                        <>
                          {/* Recipient */}
                          <div>
                            <label className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-widest block mb-1.5`}>Recipient Address</label>
                            <input
                              type="text" placeholder="0x..."
                              value={evmSendRecipient}
                              onChange={(e) => { setEvmSendRecipient(e.target.value); setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); }}
                              disabled={evmSendStatus !== "idle"}
                              className={`w-full border-2 ${dm.cardBorder} rounded-sm px-3 py-2 font-mono text-sm ${dm.inputBg} ${dm.text} placeholder:opacity-20 disabled:opacity-40`}
                            />
                          </div>

                          {/* Amount */}
                          <div>
                            <label className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-widest block mb-1.5`}>Amount ({evmSelSymbol})</label>
                            <input
                              type="number" placeholder="0.0" min="0" step="any"
                              value={evmSendAmount}
                              onChange={(e) => { setEvmSendAmount(e.target.value); setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); }}
                              disabled={evmSendStatus !== "idle"}
                              className={`w-full border-2 ${dm.cardBorder} rounded-sm px-3 py-2 font-body text-sm ${dm.inputBg} ${dm.text} disabled:opacity-40`}
                            />
                          </div>

                          {evmSendError && <p className="font-handwritten text-sm text-red-500">{evmSendError}</p>}

                          {/* Step 1: fetch nonce + K1 sign */}
                          {!evmSig1 && (
                            <button
                              disabled={!evmSendRecipient || !evmSendAmount || evmSendStatus === "fetchNonce" || evmSendStatus === "signing1"}
                              onClick={async () => {
                                setEvmSendError("");
                                if (!/^0x[0-9a-fA-F]{40}$/.test(evmSendRecipient)) { setEvmSendError("Invalid recipient address."); return; }
                                const amt = parseFloat(evmSendAmount);
                                if (isNaN(amt) || amt <= 0) { setEvmSendError("Invalid amount."); return; }
                                try {
                                  setEvmSendStatus("fetchNonce");
                                  const r = await fetch(`/api/evm/vault-info?address=${encodeURIComponent(evmActiveAddress)}`);
                                  const d = await r.json() as { nonce?: string; error?: string };
                                  if (!r.ok || d.error) throw new Error(d.error || "Failed to fetch nonce.");
                                  const nonce = d.nonce!;
                                  setEvmSendNonce(nonce);
                                  const amountBig = parseTokenAmount(evmSendAmount, evmSelDec);
                                  const txTo = evmSelIsEth ? evmSendRecipient : evmSidebarSelected;
                                  const txValue = evmSelIsEth ? amountBig : 0n;
                                  const txData = evmSelIsEth ? "0x" : encodeERC20Transfer(evmSendRecipient, amountBig);
                                  const safeTx = buildSafeTx({ to: txTo, value: txValue, data: txData, nonce });
                                  const typedData = buildTypedData(evmActiveAddress, 1, safeTx);
                                  setEvmSendStatus("signing1");
                                  let sig1: string;
                                  if (accessMode === "cold-keys") {
                                    sig1 = await evmSignTypedData(evmPk1, typedData);
                                    setEvmColdSig1Addr(evmAddressFromPrivateKey(evmPk1));
                                  } else {
                                    sig1 = await signTypedDataK1(typedData);
                                  }
                                  setEvmSig1(sig1);
                                  setEvmSendStatus("idle");
                                } catch (e: unknown) {
                                  setEvmSendError((e as Error).message || "Signing failed.");
                                  setEvmSendStatus("idle");
                                }
                              }}
                              className={`w-full py-3 border-2 border-[#1a1a1a] rounded-sm font-sketch text-base ${dm.card} ${dm.sidebarHover} transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {evmSendStatus === "fetchNonce" ? "Fetching nonce..." : evmSendStatus === "signing1" ? "Signing with Key 1..." : "Step 1: Sign with Key 1"}
                            </button>
                          )}

                          {evmSig1 && (
                            <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-sm">
                              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-green-600 flex-shrink-0"><path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span className="font-handwritten text-sm text-green-700">Key 1 signed</span>
                              <button onClick={() => { setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); setEvmSendStatus("idle"); setEvmColdSig1Addr(null); setEvmColdSig2Addr(null); }} className={`ml-auto font-handwritten text-xs ${dm.faint} hover:text-red-500`}>redo</button>
                            </div>
                          )}

                          {evmSig1 && !evmSig2 && (
                            <button
                              disabled={evmSendStatus === "signing2"}
                              onClick={async () => {
                                setEvmSendError("");
                                try {
                                  const amountBig = parseTokenAmount(evmSendAmount, evmSelDec);
                                  const txTo = evmSelIsEth ? evmSendRecipient : evmSidebarSelected;
                                  const txValue = evmSelIsEth ? amountBig : 0n;
                                  const txData = evmSelIsEth ? "0x" : encodeERC20Transfer(evmSendRecipient, amountBig);
                                  const safeTx = buildSafeTx({ to: txTo, value: txValue, data: txData, nonce: evmSendNonce! });
                                  const typedData = buildTypedData(evmActiveAddress, 1, safeTx);
                                  setEvmSendStatus("signing2");
                                  let sig2: string;
                                  if (accessMode === "cold-keys") {
                                    sig2 = await evmSignTypedData(evmPk2, typedData);
                                    setEvmColdSig2Addr(evmAddressFromPrivateKey(evmPk2));
                                  } else {
                                    sig2 = await signTypedDataK2(typedData);
                                  }
                                  setEvmSig2(sig2);
                                  setEvmSendStatus("idle");
                                } catch (e: unknown) {
                                  setEvmSendError((e as Error).message || "Key 2 signing failed.");
                                  setEvmSendStatus("idle");
                                }
                              }}
                              className={`w-full py-3 border-2 border-[#F7931A] rounded-sm font-sketch text-base ${dm.card} hover:bg-[#F7931A]/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {evmSendStatus === "signing2" ? "Signing with Key 2..." : "Step 2: Sign with Key 2"}
                            </button>
                          )}

                          {evmSig2 && (
                            <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-sm">
                              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-green-600 flex-shrink-0"><path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span className="font-handwritten text-sm text-green-700">Key 2 signed</span>
                            </div>
                          )}

                          {evmSig1 && evmSig2 && (
                            <>
                              {accessMode === "cold-keys" ? (
                                <div className={`flex items-center gap-2 px-3 py-2 border ${dm.divider} ${dm.sectionHead} rounded-sm`}>
                                  <svg viewBox="0 0 16 16" fill="none" className={`w-4 h-4 ${dm.faint40} flex-shrink-0`}><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                  <span className={`font-handwritten text-xs ${dm.faint40}`}>Gas is covered by bitQoin. No MetaMask needed.</span>
                                </div>
                              ) : (
                                <div className={`flex items-center gap-2 px-3 py-2 border ${dm.divider} ${dm.sectionHead} rounded-sm`}>
                                  <svg viewBox="0 0 16 16" fill="none" className={`w-4 h-4 ${dm.faint40} flex-shrink-0`}><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                  <span className={`font-handwritten text-xs ${dm.faint40}`}>K1 pays execution gas from MetaMask (not the Qoin).</span>
                                </div>
                              )}
                              <button
                                disabled={evmSendStatus === "executing"}
                                onClick={async () => {
                                  setEvmSendError("");
                                  try {
                                    const amountBig = parseTokenAmount(evmSendAmount, evmSelDec);
                                    const txTo = evmSelIsEth ? evmSendRecipient : evmSidebarSelected;
                                    const txValue = evmSelIsEth ? amountBig : 0n;
                                    const txData = evmSelIsEth ? "0x" : encodeERC20Transfer(evmSendRecipient, amountBig);
                                    const safeTx = buildSafeTx({ to: txTo, value: txValue, data: txData, nonce: evmSendNonce! });
                                    setEvmSendStatus("executing");
                                    if (accessMode === "cold-keys") {
                                      const res = await fetch("/api/evm/relay-tx", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          vaultAddress: evmActiveAddress,
                                          safeTx,
                                          sig1: evmSig1,
                                          k1Address: evmColdSig1Addr,
                                          sig2: evmSig2,
                                          k2Address: evmColdSig2Addr,
                                        }),
                                      });
                                      const d = await res.json() as { txHash?: string; error?: string };
                                      if (!res.ok || d.error) throw new Error(d.error || "Relay failed.");
                                      setEvmSendTxHash(d.txHash!);
                                    } else {
                                      const packed = packSignatures(evmSig1!, evmAddress1!, evmSig2!, evmAddress2!);
                                      const calldata = encodeExecTransaction(safeTx, packed);
                                      const txHash = await sendTransaction({ from: evmAddress1!, to: evmActiveAddress, data: calldata, gas: "0x7A120" });
                                      setEvmSendTxHash(txHash);
                                    }
                                    setEvmSendStatus("done");
                                  } catch (e: unknown) {
                                    setEvmSendError((e as Error).message || "Execution failed.");
                                    setEvmSendStatus("idle");
                                  }
                                }}
                                className="btn-sketch w-full text-lg py-4"
                              >
                                {evmSendStatus === "executing" ? "Broadcasting..." : "Step 3: Execute Transaction"}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* EVM PRICE CHART */}
              {evmActiveTab === null && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} overflow-hidden shadow-[3px_3px_0_#1a1a1a]`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${dm.divider}`}>
                    <span className={`font-sketch text-base ${dm.text}`}>7-Day Price</span>
                    <div className="flex items-center gap-3">
                      {evmChartChange != null && (
                        <span className={`font-mono text-xs font-bold ${evmChartChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {evmChartChange >= 0 ? "+" : ""}{evmChartChange.toFixed(2)}%
                        </span>
                      )}
                      {evmChartLoading && <span className={`font-handwritten text-sm ${dm.faint}`}>Loading...</span>}
                      {!evmChartLoading && evmChartData.length === 0 && (
                        <span className={`font-handwritten text-sm ${dm.muted}`}>No price data</span>
                      )}
                    </div>
                  </div>
                  {evmChartData.length > 0 ? (
                    <div className="h-56 px-2 py-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evmChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="evmChartFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={evmChartChange != null && evmChartChange < 0 ? "#1a1a1a" : "#F7931A"} stopOpacity={0.15} />
                              <stop offset="95%" stopColor={evmChartChange != null && evmChartChange < 0 ? "#1a1a1a" : "#F7931A"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="time"
                            tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
                            tick={{ fontFamily: "monospace", fontSize: 10, fill: dark ? "#FAFAF5" : "#1a1a1a", opacity: 0.3 }}
                            axisLine={false} tickLine={false} interval="preserveStartEnd"
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            tickFormatter={(v) => v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(4)}`}
                            tick={{ fontFamily: "monospace", fontSize: 10, fill: dark ? "#FAFAF5" : "#1a1a1a", opacity: 0.3 }}
                            axisLine={false} tickLine={false} width={60}
                          />
                          <Tooltip
                            formatter={(v: number) => [`$${v >= 1 ? v.toFixed(2) : v.toFixed(6)}`, evmSelSymbol]}
                            labelFormatter={(t) => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            contentStyle={{ fontFamily: "monospace", fontSize: 12, border: `2px solid ${dark ? "#FAFAF5" : "#1a1a1a"}`, borderRadius: 0, background: dark ? "#0f0f0f" : "#fff" }}
                            itemStyle={{ color: dark ? "#FAFAF5" : "#1a1a1a" }}
                            labelStyle={{ color: dark ? "#FAFAF5" : "#1a1a1a", opacity: 0.4 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke={evmChartChange != null && evmChartChange < 0 ? "#1a1a1a" : "#F7931A"}
                            strokeWidth={2}
                            fill="url(#evmChartFill)"
                            dot={false}
                            activeDot={{ r: 4, fill: evmChartChange != null && evmChartChange < 0 ? "#1a1a1a" : "#F7931A", strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`font-sketch text-2xl ${dm.faint} mb-1`} style={{ opacity: 0.1 }}>--</div>
                        <div className={`font-handwritten text-sm ${dm.faint40}`}>Price chart not available</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })() : (
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR icon-only on mobile, full on md+ */}
          <div className={`w-14 md:w-60 flex-shrink-0 border-r-2 ${dm.divider} ${dm.sidebar} flex flex-col overflow-hidden`}>
            <div className="overflow-y-auto flex-1 py-2">

              {/* Holdings label desktop only */}
              <div className="hidden md:block px-4 pt-2 pb-1">
                <span className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-widest`}>{t.access.tokens}</span>
              </div>

              {/* SPL tokens */}
              {shield.tokens.map((t) => (
                <button
                  key={t.mint}
                  onClick={() => selectToken(t.mint, t)}
                  className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2.5 transition-all ${sidebarSelected === t.mint ? dm.sidebarSelected : dm.sidebarHover}`}
                >
                  {t.logo ? (
                    <img src={t.logo} alt={t.symbol ?? t.mint} className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className={`w-9 h-9 rounded-full ${dm.iconCircle} flex items-center justify-center flex-shrink-0`}>
                      <span className={`font-sketch text-xs ${dm.faint40}`}>{t.symbol?.slice(0, 2) ?? "?"}</span>
                    </div>
                  )}
                  <div className="hidden md:flex min-w-0 flex-1 items-center justify-between gap-1">
                    <span className={`font-body font-bold text-sm ${dm.text} truncate leading-none`}>{DISPLAY_SYMBOL[t.mint] ?? t.symbol ?? t.name?.slice(0, 8) ?? "Token"}</span>
                    <span className={`font-mono text-xs ${dm.muted} flex-shrink-0 flex items-center gap-1.5`}>
                      {t.isNft ? "NFT" : fmtBalance(t.balance)}
                      {t.isLocked && <span className="font-body text-[10px] font-bold px-1 py-0 border border-[#F7931A] text-[#F7931A] rounded leading-4">Locked</span>}
                    </span>
                  </div>
                </button>
              ))}

              {shield.tokens.length === 0 && (
                <div className="hidden md:block px-4 py-3">
                  <p className={`font-handwritten text-sm ${dm.faint40}`}>{t.access.noBalance}</p>
                </div>
              )}

              {/* Setup Slots banner sidebar — desktop only supplemental */}
              {activeShieldAddress && (shield.tokens.some(tk => tk.isLocked) || shield.tokens.length === 0) && !slotsDone && (
                <div className={`mx-3 mb-2 mt-1 border-2 border-[#F7931A]/50 ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8F0]"} rounded-sm p-3 space-y-2`}>
                  <p className={`font-body font-bold text-xs ${dm.text}`}>Setup Required</p>
                  <p className={`font-handwritten text-xs ${dm.faint40} leading-relaxed`}>
                    One-time setup needed before you can receive or send tokens.
                  </p>
                  {slotsError && <p className="font-handwritten text-xs text-[#F7931A]">{slotsError}</p>}
                  <button
                    onClick={handleSetupSlots}
                    disabled={slotsLoading}
                    className="w-full font-body font-bold text-xs py-1.5 border-2 border-[#F7931A] text-[#F7931A] rounded-sm hover:bg-[#F7931A] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {slotsLoading ? "Setting up..." : "Setup Slots (Free)"}
                  </button>
                </div>
              )}
              {slotsDone && (
                <div className={`mx-3 mb-2 mt-1 border ${dm.cardBorder} ${dm.sectionHead} rounded-sm px-3 py-2`}>
                  <p className={`font-handwritten text-xs ${dm.faint40}`}>Slots ready. Deposits to this Qoin are now sendable.</p>
                </div>
              )}

              {/* Quick Deposit divider desktop only label */}
              {visiblePopular.length > 0 && (
                <>
                  <div className={`border-t ${dm.divider} mt-2 mb-1`}>
                    <span className={`hidden md:block px-4 pt-3 pb-1 font-body font-bold text-xs ${dm.muted} uppercase tracking-widest`}>Available</span>
                  </div>
                  {visiblePopular.map((t) => {
                    const meta = tokenMeta[t.mint];
                    return (
                      <button
                        key={t.mint}
                        onClick={() => selectToken(t.mint)}
                        className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-4 py-2 transition-all ${sidebarSelected === t.mint ? dm.sidebarSelected : dm.sidebarHover}`}
                      >
                        {meta?.image ? (
                          <img src={meta.image} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className={`w-8 h-8 rounded-full ${dm.iconCircle} flex items-center justify-center flex-shrink-0`}>
                            <span className={`font-sketch text-xs ${dm.faint}`}>{t.symbol.slice(0, 2)}</span>
                          </div>
                        )}
                        <div className="hidden md:flex min-w-0 flex-1 items-center justify-between gap-1">
                          <span className={`font-body font-bold text-sm ${dm.text} truncate leading-none`}>{DISPLAY_SYMBOL[t.mint] ?? meta?.symbol ?? t.symbol}</span>
                          <span className={`font-mono text-xs ${dm.faint} flex-shrink-0`}>0.00</span>
                        </div>
                        {sidebarSelected === t.mint && <span className="hidden md:inline w-1.5 h-1.5 rounded-full bg-[#F7931A] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Add Token */}
            <div className={`border-t ${dm.divider} mt-2`}>
              <button
                onClick={() => { setShowAddToken(!showAddToken); setCustomMint(""); setCustomDepositAddr(""); }}
                className={`w-full flex items-center justify-center md:justify-start gap-2 px-2 md:px-4 py-2.5 ${dark ? "hover:bg-[#FAFAF5]/5" : "hover:bg-[#FAFAF5]"} transition-all text-left`}
              >
                <div className={`w-9 h-9 rounded-full ${dm.iconCircle} flex items-center justify-center flex-shrink-0`}>
                  <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" className={dm.text}/>
                  </svg>
                </div>
                <span className={`hidden md:block font-handwritten text-sm ${dm.faint40}`}>Add Token</span>
              </button>
              {showAddToken && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Notice: SPL tokens only */}
                  <div className={`flex items-start gap-1.5 px-2 py-2 ${dm.iconCircle} rounded-sm border ${dm.cardBorder}`}>
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><circle cx="8" cy="8" r="6.5" stroke="#F7931A" strokeWidth="1.3"/><path d="M8 5v3.5M8 10.5v.5" stroke="#F7931A" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <p className={`font-handwritten text-xs ${dm.faint40} leading-relaxed`}>
                      <span className={`font-bold ${dm.text}`}>SPL tokens only.</span> Never send native SOL to this Qoin. Use <span className="font-bold">wSOL</span> (Wrapped SOL) to hold SOL inside your Qoin.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={customMint}
                    onChange={(e) => {
                      setCustomMint(e.target.value.trim());
                      setCustomDepositAddr("");
                      setCustomTaError("");
                      setCustomTaSig("");
                    }}
                    placeholder="Paste mint address (CA)..."
                    autoComplete="off"
                    spellCheck={false}
                    className="input-sketch text-xs py-2 font-mono w-full"
                  />
                  {/* wSOL CA entered — already supported */}
                  {customMint === WSOL_MINT && (
                    <div className="border-2 border-[#F7931A]/50 bg-[#F7931A]/5 rounded-sm px-3 py-2.5 space-y-1">
                      <p className="font-body font-bold text-xs text-[#F7931A]">wSOL is already in your Qoin</p>
                      <p className={`font-handwritten text-xs ${dm.faint40} leading-relaxed`}>
                        That address is <span className="font-bold">Wrapped SOL (wSOL)</span>. It is already available at the top of your token list. No need to add it again. Open the wSOL tab and copy its receive address.
                      </p>
                      <p className={`font-handwritten text-xs ${dm.faint} mt-1`}>
                        Want to hold SOL? Wrap it to wSOL in Phantom first, then send wSOL to the receive address.
                      </p>
                    </div>
                  )}
                  {/* Native SOL system program address */}
                  {customMint === "11111111111111111111111111111111" && (
                    <div className={`border-2 border-red-300 ${dark ? "bg-red-900/20" : "bg-red-50"} rounded-sm px-3 py-2.5 space-y-1`}>
                      <p className="font-body font-bold text-xs text-red-500">Not an SPL token</p>
                      <p className={`font-handwritten text-xs ${dm.faint40} leading-relaxed`}>
                        That is the Solana System Program address, not a token mint. Native SOL <span className="font-bold text-red-500">cannot</span> enter a Qoin. Use <span className="font-bold">wSOL</span> already available in your sidebar.
                      </p>
                    </div>
                  )}
                  {customMint && customMint !== WSOL_MINT && customMint !== "11111111111111111111111111111111" && !isValidPublicKey(customMint) && (
                    <p className={`font-handwritten text-xs ${dm.faint}`}>Enter a valid token mint address (CA).</p>
                  )}
                  {customTaError && (
                    <p className="font-handwritten text-xs text-[#F7931A]">{customTaError}</p>
                  )}
                  {isValidPublicKey(customMint) && customMint !== WSOL_MINT && !customDepositAddr && (
                    <div className="space-y-1.5">
                      <p className={`font-handwritten text-xs ${dm.muted} leading-relaxed`}>
                        This creates the deposit slot on-chain. Must be done before anyone sends this token to your Qoin.
                      </p>
                      <button
                        onClick={handleCreateTokenAccountSidebar}
                        disabled={customCreating}
                        className={`w-full font-body font-bold text-xs py-2 border-2 ${dark ? "border-[#FAFAF5]/20 text-[#FAFAF5] hover:bg-[#FAFAF5]/10" : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"} rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {customCreating ? "Opening Slot..." : "Open Slot + Get Address"}
                      </button>
                    </div>
                  )}
                  {customDepositAddr && (
                    <div className={`border-2 ${dm.cardBorder} rounded-sm p-2 ${dm.card}`}>
                      <div className={`font-handwritten text-xs ${dm.muted} mb-1.5 flex items-center gap-1.5`}>
                        Slot ready. Deposit address:
                        {customTaSig && <span className="text-[#F7931A] font-bold">On-chain.</span>}
                      </div>
                      <div className={`font-mono text-xs ${dm.text} break-all mb-2`}>{customDepositAddr}</div>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(customDepositAddr);
                          setCustomMintCopied(true);
                          setTimeout(() => setCustomMintCopied(false), 2000);
                        }}
                        className={`w-full font-body font-bold text-xs py-1.5 border ${dm.cardBorder} rounded-sm hover:bg-[#F7931A] hover:text-white hover:border-[#F7931A] transition-all`}
                      >
                        {customMintCopied ? "Copied!" : "Copy Deposit Address"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar footer desktop only */}
            <div className={`hidden md:block border-t-2 ${dm.divider} px-4 py-3 flex-shrink-0`}>
              <div className={`font-body font-bold text-xs ${dm.muted} mb-0.5`}>{t.access.portfolio}</div>
              <div className={`font-sketch text-lg ${dm.text}`}>
                {totalUSD > 0 ? `$${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
              </div>
              <div className={`font-mono text-xs ${dm.faint40} mt-0.5`}>{1 + shield.tokens.length} assets</div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

              {/* Token header */}
              <div className="flex items-center gap-4">
                {selLogo ? (
                  <img src={selLogo} className="w-14 h-14 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className={`w-14 h-14 rounded-full ${dm.iconCircle} flex items-center justify-center flex-shrink-0`}>
                    <span className={`font-sketch text-base ${dm.faint}`}>{selLabel.slice(0, 3)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`font-sketch text-3xl ${dm.text} leading-none`}>{selLabel}</div>
                    {selHeld?.isLocked && <span className="font-body text-xs font-bold px-1.5 py-0.5 border border-[#F7931A] text-[#F7931A] rounded">Locked</span>}
                  </div>
                  <div className="font-sketch text-xl mt-0.5 leading-none" style={{ color: selHeld && selHeld.balance > 0 ? "#F7931A" : (dark ? "#FAFAF5" : "#1a1a1a"), opacity: selHeld && selHeld.balance > 0 ? 1 : 0.3 }}>
                    {selHeld ? fmtBalance(selHeld.balance) : "0.00"} {selLabel}
                  </div>
                  {selDex && (
                    <div className={`font-mono text-sm ${dm.muted} mt-1`}>{fmtPrice(selDex.price)} per token</div>
                  )}
                  {selHeld && (() => {
                    const p = selHeld.pricePerToken ?? selDex?.price ?? null;
                    return p ? (
                      <div className={`font-mono text-sm ${dm.faint40} mt-0.5`}>{fmtPrice(selHeld.balance * p)} total</div>
                    ) : null;
                  })()}
                </div>
                {activeChange !== null && (
                  <div className="text-right flex-shrink-0">
                    <div className="font-sketch text-xl" style={{ color: activeChange >= 0 ? "#F7931A" : (dark ? "#FAFAF5" : "#1a1a1a"), opacity: activeChange >= 0 ? 1 : 0.7 }}>
                      {activeChange >= 0 ? "+" : ""}{activeChange.toFixed(2)}%
                    </div>
                    <div className={`font-handwritten text-sm ${dm.muted}`}>24h change</div>
                  </div>
                )}
              </div>

              {/* PORTFOLIO SUMMARY CARD — visible when vault has >1 token with value */}
              {totalUSD > 0 && shield.tokens.filter(t => !t.isNft && (t.pricePerToken ?? dexPrices[t.mint]?.price) != null).length > 1 && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} shadow-[3px_3px_0_#1a1a1a] px-5 py-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-widest`}>Qoin Portfolio</span>
                    <span className={`font-sketch text-xl ${dm.text}`}>${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="space-y-2">
                    {shield.tokens.filter(t => !t.isNft).map(t => {
                      const price = t.pricePerToken ?? dexPrices[t.mint]?.price ?? null;
                      if (!price) return null;
                      const val = t.balance * price;
                      const pct = totalUSD > 0 ? (val / totalUSD) * 100 : 0;
                      return (
                        <div key={t.mint} className="flex items-center gap-2.5">
                          {t.logo ? (
                            <img src={t.logo} className="w-4 h-4 rounded-full flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className={`w-4 h-4 rounded-full ${dm.iconCircle} flex-shrink-0`} />
                          )}
                          <span className={`font-body font-bold text-xs ${dm.faint40} w-14 truncate flex-shrink-0`}>{t.symbol}</span>
                          <div className={`flex-1 h-1.5 ${dm.iconCircle} rounded-full overflow-hidden`}>
                            <div className="h-full bg-[#F7931A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`font-mono text-xs ${dm.muted} w-20 text-right flex-shrink-0`}>${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className={`font-mono text-xs ${dm.faint} w-10 text-right flex-shrink-0`}>{pct.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SETUP REQUIRED NOTICE — large, centered, mobile+desktop */}
              {needsSetup && (
                <div className={`w-full border-2 border-[#F7931A] ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8F0]"} rounded-sm p-6 md:p-10 flex flex-col items-center text-center gap-5`}>
                  <div className={`w-14 h-14 rounded-full border-2 border-[#F7931A]/40 ${dm.inputBg.split(" ")[0]} flex items-center justify-center`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#F7931A" strokeWidth="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#F7931A" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <p className={`font-sketch text-2xl md:text-3xl ${dm.text} mb-2`}>Setup Required</p>
                    <p className={`font-body text-sm md:text-base ${dm.faint40} max-w-sm leading-relaxed`}>
                      Initialize token deposit slots before you can receive or send tokens. This is a one-time setup and is completely free.
                    </p>
                  </div>
                  {slotsError && <p className="font-body text-sm text-[#F7931A]">{slotsError}</p>}
                  <button
                    onClick={handleSetupSlots}
                    disabled={slotsLoading}
                    className="w-full max-w-xs font-body font-bold text-base py-4 bg-[#F7931A] text-white rounded-sm hover:bg-[#e07d10] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0_#1a1a1a]"
                  >
                    {slotsLoading ? "Setting up..." : "Setup Slots (Free)"}
                  </button>
                  {slotsDone && (
                    <p className="font-body text-sm text-green-600">Slots ready. You can now receive tokens.</p>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS — Receive / Send / Swap */}
              <div className="flex gap-3">
                <button
                  onClick={() => { if (!needsSetup) setActiveTab(activeTab === "receive" ? null : "receive"); }}
                  disabled={needsSetup}
                  title={needsSetup ? "Setup token slots first" : undefined}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    needsSetup
                      ? dark ? "border-[#FAFAF5]/10 bg-[#FAFAF5]/5 text-[#FAFAF5]/25 cursor-not-allowed" : "border-[#1a1a1a]/20 bg-[#1a1a1a]/5 text-[#1a1a1a]/25 cursor-not-allowed"
                      : activeTab === "receive"
                        ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                        : dark
                          ? "border-[#FAFAF5]/20 text-[#FAFAF5]/80 hover:bg-[#FAFAF5]/10"
                          : "border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Receive
                </button>
                <button
                  onClick={() => { setActiveTab(activeTab === "send" ? null : "send"); if (selHeld) setSelectedToken(selHeld); }}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "send"
                      ? "border-[#F7931A] bg-[#F7931A] text-white"
                      : "border-[#F7931A] text-[#F7931A] hover:bg-[#F7931A] hover:text-white"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14V5M4 9l4-4 4 4M2 3h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Send
                </button>
                <button
                  onClick={() => setActiveTab(activeTab === "swap" ? null : "swap")}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "swap"
                      ? dark ? "border-[#FAFAF5]/20 bg-[#FAFAF5]/10 text-[#FAFAF5]/60" : "border-[#1a1a1a]/40 bg-[#1a1a1a]/10 text-[#1a1a1a]/60"
                      : dark ? "border-[#FAFAF5]/10 text-[#FAFAF5]/30 hover:border-[#FAFAF5]/20 hover:text-[#FAFAF5]/50" : "border-[#1a1a1a]/20 text-[#1a1a1a]/30 hover:border-[#1a1a1a]/40 hover:text-[#1a1a1a]/50"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Swap
                </button>
              </div>
              {/* SWAP COMING SOON PANEL */}
              {activeTab === "swap" && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.sectionHead} px-6 py-8 text-center space-y-3`}>
                  <div className={`font-sketch text-2xl ${dm.faint40}`}>Swap</div>
                  <div className={`font-handwritten text-base ${dm.muted} leading-relaxed`}>
                    Swap with 2-key signing protection is in development.<br />Coming soon.
                  </div>
                  <button onClick={() => setActiveTab(null)} className={`font-handwritten text-xs ${dm.faint} hover:text-red-500 transition-colors`}>close</button>
                </div>
              )}

              {/* RECEIVE PANEL */}
              {activeTab === "receive" && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} shadow-[3px_3px_0_#1a1a1a] overflow-hidden`}>
                  <div className="flex flex-col items-center px-6 py-8 space-y-5">
                    <div className={`font-sketch text-2xl ${dm.text}`}>Receive {selLabel}</div>
                    {sidebarSelected === WSOL_MINT && (
                      <div className={`w-full border-2 border-red-400 ${dark ? "bg-red-900/20" : "bg-red-50"} rounded-sm px-4 py-3 space-y-1.5`}>
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 flex-shrink-0"><path d="M10 2L2 17h16L10 2z" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 8v4M10 13.5v.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/></svg>
                          <p className="font-body font-bold text-sm text-red-500">Send wSOL only, not native SOL</p>
                        </div>
                        <p className={`font-handwritten text-xs ${dm.faint40} leading-relaxed`}>
                          This accepts <span className="font-bold">wSOL (Wrapped SOL)</span> only. Native SOL sent here will be permanently lost. Wrap SOL to wSOL in Phantom first.
                        </p>
                      </div>
                    )}
                    <div className={`border-4 border-[#1a1a1a] p-4 rounded-sm ${dark ? "bg-[#1a1a1a]" : "bg-white"} shadow-[4px_4px_0_#1a1a1a]`}>
                      <QRCodeSVG value={receiveAddr} size={200} bgColor={dark ? "#1a1a1a" : "#ffffff"} fgColor={dark ? "#FAFAF5" : "#1a1a1a"} level="M" />
                    </div>
                    <div className={`w-full ${dm.sectionHead} border-2 ${dm.cardBorder} rounded-sm px-4 py-3 text-center`}>
                      <div className={`font-mono text-xs ${dm.faint40} mb-1`}>Address</div>
                      <div className={`font-mono text-sm ${dm.text} break-all`}>{receiveAddr}</div>
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(receiveAddr);
                          setCopiedAddr(sidebarSelected);
                          setTimeout(() => setCopiedAddr(null), 2000);
                        }}
                        className="btn-sketch flex-1 text-sm py-3"
                      >
                        {copiedAddr === sidebarSelected ? "Copied!" : "Copy Address"}
                      </button>
                      <a
                        href={explorerAddressUrl(receiveAddr, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 border-2 ${dm.cardBorder} rounded-sm font-body font-bold text-sm ${dm.muted} hover:border-[#F7931A] hover:text-[#F7931A] transition-all ${dm.card}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5.5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7.5M8 1h4m0 0v4m0-4L5.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Orb
                      </a>
                    </div>
                    {sidebarSelected === WSOL_MINT ? (
                      <div className={`w-full border-2 ${dm.cardBorder} ${dm.sectionHead} rounded-sm px-4 py-3 space-y-1.5`}>
                        <p className={`font-body font-bold text-xs ${dm.text} uppercase tracking-wide`}>How to add SOL to your Qoin:</p>
                        <ol className="space-y-1.5">
                          <li className="flex items-start gap-2"><span className="font-sketch text-xs text-[#F7931A] mt-0.5">1</span><span className={`font-handwritten text-sm ${dm.faint40}`}>Open Phantom</span></li>
                          <li className="flex items-start gap-2"><span className="font-sketch text-xs text-[#F7931A] mt-0.5">2</span><span className={`font-handwritten text-sm ${dm.faint40}`}>Use <span className="font-bold">Swap or Wrap</span> to convert SOL to wSOL</span></li>
                          <li className="flex items-start gap-2"><span className="font-sketch text-xs text-[#F7931A] mt-0.5">3</span><span className={`font-handwritten text-sm ${dm.faint40}`}>Send <span className="font-bold">wSOL</span> to the address above</span></li>
                        </ol>
                      </div>
                    ) : (
                      <p className={`font-handwritten text-xs ${dm.faint} text-center`}>
                        Use this address to receive {selLabel} on Solana. Do not send to the Qoin address directly.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SEND PANEL */}
              {activeTab === "send" && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} shadow-[3px_3px_0_#1a1a1a] overflow-hidden`}>
                  <div className="px-5 py-5 space-y-4">
                    {accessMode === "connect-wallets" && (
                      <div className={`border-2 ${dm.cardBorder} rounded-sm overflow-hidden`}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 ${dm.sectionHead} border-b ${dm.divider}`}>
                          <SketchTwoKeys className="w-7 h-4 flex-shrink-0" />
                          <span className={`font-sketch text-sm ${dm.text}`}>Signing wallets</span>
                          {phantomPubkey && phantom2Pubkey && !txLoading && (
                            <span className="ml-auto font-handwritten text-sm text-[#F7931A]">Both ready</span>
                          )}
                          {txLoading && signingStep && (
                            <span className="ml-auto font-handwritten text-sm text-[#F7931A] animate-pulse">
                              {signingStep === "phantom" && "Waiting for Phantom (K1)..."}
                              {signingStep === "solflare" && "Waiting for Phantom (K2)..."}
                              {signingStep === "broadcasting" && "Broadcasting..."}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {txLoading && signingStep === "phantom" ? (
                                <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-pulse flex-shrink-0" />
                              ) : signingStep === "solflare" || signingStep === "broadcasting" ? (
                                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: phantomPubkey ? "#F7931A" : "#1a1a1a", opacity: phantomPubkey ? 1 : 0.15 }} />
                              )}
                              <img src="/phantom-logo.png" className="w-5 h-5 rounded-lg flex-shrink-0" alt="Phantom" />
                              <span className={`font-body font-bold text-xs ${dm.muted}`}>Phantom (Key 1)</span>
                              {txLoading && signingStep === "phantom" && <span className="font-handwritten text-xs text-[#F7931A]">Approve in Phantom</span>}
                              {(signingStep === "solflare" || signingStep === "broadcasting") && <span className="font-handwritten text-xs text-green-600">Signed</span>}
                            </div>
                            {phantomPubkey ? (
                              <span className={`font-mono text-xs ${dm.faint40}`}>{phantomPubkey.slice(0, 6)}...{phantomPubkey.slice(-4)}</span>
                            ) : (
                              <span className={`font-handwritten text-xs ${dm.faint}`}>Not connected</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {txLoading && signingStep === "solflare" ? (
                                <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-pulse flex-shrink-0" />
                              ) : signingStep === "broadcasting" ? (
                                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: phantom2Pubkey ? "#F7931A" : "#1a1a1a", opacity: phantom2Pubkey ? 1 : 0.15 }} />
                              )}
                              <img src="/solflare-logo.png" className="w-5 h-5 rounded-lg flex-shrink-0" alt="Solflare K2" />
                              <span className={`font-body font-bold text-xs ${dm.muted}`}>Solflare (Key 2)</span>
                              {txLoading && signingStep === "solflare" && <span className="font-handwritten text-xs text-[#F7931A]">Approve in Solflare</span>}
                              {signingStep === "broadcasting" && <span className="font-handwritten text-xs text-green-600">Signed</span>}
                            </div>
                            {phantom2Pubkey ? (
                              <span className={`font-mono text-xs ${dm.faint40}`}>{phantom2Pubkey.slice(0, 6)}...{phantom2Pubkey.slice(-4)}</span>
                            ) : (
                              <span className={`font-handwritten text-xs ${dm.faint}`}>Not connected</span>
                            )}
                          </div>
                          <p className={`font-handwritten text-xs ${dm.faint} pt-0.5`}>
                            Phantom signs first, then Solflare. Two separate approvals. One transaction on-chain.
                          </p>
                        </div>
                      </div>
                    )}
                    {accessMode === "connect-wallets" && walletMismatch && (
                      <div className={`border-2 border-[#F7931A] ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF7ED]"} rounded-sm p-3 flex gap-2.5 items-start`}>
                        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 flex-shrink-0 mt-0.5">
                          <path d="M10 3L18 17H2L10 3Z" stroke="#F7931A" strokeWidth="1.8" strokeLinejoin="round"/>
                          <path d="M10 9v4M10 14.5v.5" stroke="#F7931A" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        <p className={`font-handwritten text-sm ${dm.faint40} leading-relaxed`}>{walletMismatch}</p>
                      </div>
                    )}
                    {accessMode === "cold-keys" && (
                      <div className={`border-2 ${dm.cardBorder} rounded-sm overflow-hidden`}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 ${dm.sectionHead} border-b ${dm.divider}`}>
                          <SketchTwoKeys className="w-7 h-4 flex-shrink-0" />
                          <span className={`font-sketch text-sm ${dm.text}`}>Paste your two cold keys</span>
                          {hasBothKeys && <span className="ml-auto font-handwritten text-sm text-[#F7931A]">Both keys loaded</span>}
                        </div>
                        <p className={`font-handwritten text-xs ${dm.faint} px-4 pt-2.5`}>Keys are used to sign locally. They are never sent to any server.</p>
                        <div className="p-4 space-y-3">
                          <div>
                            <label className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-wide mb-1 block`}>Private Key 1</label>
                            <div className="relative">
                              <input type={showPk1 ? "text" : "password"} placeholder="base58 private key..." value={pk1} onChange={(e) => setPk1(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} className="input-sketch text-sm font-mono py-2 pr-16" />
                              <button onClick={() => setShowPk1(!showPk1)} className={`absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm ${dm.muted} hover:${dm.text} transition-colors`}>{showPk1 ? "Hide" : "Show"}</button>
                            </div>
                          </div>
                          <div>
                            <label className={`font-body font-bold text-xs ${dm.muted} uppercase tracking-wide mb-1 block`}>Private Key 2</label>
                            <div className="relative">
                              <input type={showPk2 ? "text" : "password"} placeholder="base58 private key..." value={pk2} onChange={(e) => setPk2(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} className="input-sketch text-sm font-mono py-2 pr-16" />
                              <button onClick={() => setShowPk2(!showPk2)} className={`absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm ${dm.muted} hover:${dm.text} transition-colors`}>{showPk2 ? "Hide" : "Show"}</button>
                            </div>
                          </div>
                          {(pk1 && !pk1Valid) && <p className="font-handwritten text-sm text-[#F7931A]">Key 1 is invalid.</p>}
                          {(pk2 && !pk2Valid) && <p className="font-handwritten text-sm text-[#F7931A]">Key 2 is invalid.</p>}
                        </div>
                      </div>
                    )}
                    {(() => {
                      const canSendKeys = accessMode === "cold-keys" && hasBothKeys;
                      const canSendWallets = accessMode === "connect-wallets" && !!(phantomPubkey && phantom2Pubkey);
                      const canSend = canSendKeys || canSendWallets;
                      return (
                        <>
                          <div>
                            <label className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-wide mb-1.5 block`}>Recipient Address</label>
                            <input type="text" placeholder="Solana wallet address..." value={recipient} onChange={(e) => setRecipient(e.target.value)} disabled={!canSend || !selHeld} className="input-sketch text-sm font-mono py-2.5 disabled:opacity-30" />
                            {recipient && !isValidPublicKey(recipient) && (
                              <div className="flex items-center gap-1.5 mt-1 font-handwritten text-sm"><SketchX className="w-4 h-4" /> Invalid address</div>
                            )}
                          </div>
                          <div>
                            <label className={`font-handwritten text-xs ${dm.faint40} uppercase tracking-wide mb-1.5 block`}>
                              Amount
                              <span className={`ml-2 ${dm.faint} normal-case`}>balance: {(selHeld?.balance ?? 0).toLocaleString()} {selLabel}</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" disabled={!canSend || !selHeld} className="input-sketch text-sm py-2.5 flex-1 disabled:opacity-30" />
                              <button onClick={() => setAmount((selHeld?.balance ?? 0).toString())} disabled={!canSend || !selHeld} className="font-body font-bold text-xs px-3 border-2 border-[#1a1a1a] rounded-sm hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed">MAX</button>
                            </div>
                            {amount && parseFloat(amount) > (selHeld?.balance ?? 0) && (
                              <p className={`font-handwritten text-sm ${dm.muted} mt-1`}>Exceeds balance</p>
                            )}
                          </div>
                          {selHeld?.isLocked && (
                            <div className={`border-2 border-[#F7931A] ${dark ? "bg-[#F7931A]/5" : "bg-[#FFF8F0]"} rounded-sm p-3 font-body text-sm ${dm.faint40} leading-relaxed`}>
                              <span className="font-bold">Cannot send.</span> This token was deposited to a nested account before the Qoin token slot was initialized. The token is held read-only. To receive sendable tokens, use the deposit address for this token going forward.
                            </div>
                          )}
                          {txError && <div className={`border-2 border-[#F7931A] ${dm.card} rounded-sm p-3 font-body text-sm ${dm.muted}`}>{txError}</div>}
                          {txSig && (
                            <div className={`border-2 ${dm.cardBorder} ${dm.card} rounded-sm p-4 shadow-[3px_3px_0_#1a1a1a]`}>
                              <div className={`flex items-center gap-2 font-sketch text-base ${dm.text} mb-2`}><SketchCheckmark className="w-5 h-5" /> Sent!</div>
                              <div className={`font-mono text-sm break-all ${dm.muted} mb-2`}>{txSig}</div>
                              <a href={explorerUrl(txSig, false)} target="_blank" rel="noopener noreferrer" className="font-handwritten text-sm text-[#F7931A] hover:underline">View on Orb</a>
                            </div>
                          )}
                          <button
                            onClick={accessMode === "connect-wallets" ? handleTransferWallets : handleTransfer}
                            disabled={!canSend || !selHeld || selHeld?.isLocked || txLoading || !recipient || !amount || !isValidPublicKey(recipient) || parseFloat(amount) <= 0 || parseFloat(amount) > (selHeld?.balance ?? 0)}
                            className="btn-sketch w-full py-3.5 text-base disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {selHeld?.isLocked
                              ? "Token Locked. Cannot Send."
                              : !canSend
                                ? (accessMode === "connect-wallets" ? "Connect both wallets to send" : "Load both cold keys above to send")
                                : txLoading
                                  ? signingStep === "phantom" ? "Step 1/2: Approve in Phantom..."
                                  : signingStep === "solflare" ? "Step 2/2: Approve in Phantom (K2)..."
                                  : signingStep === "broadcasting" ? "Broadcasting to Solana..."
                                  : "Signing..."
                                : t.access.sendBtn}
                          </button>
                          {canSend && !txLoading && (
                            <p className={`font-handwritten text-xs ${dm.faint} text-center`}>
                              {accessMode === "connect-wallets"
                                ? "Two wallet popups, one after the other. Both must approve."
                                : "Both keys sign locally in your browser. Never sent to any server."}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* PRICE CHART — shown when no action selected */}
              {activeTab === null && (
                <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} overflow-hidden shadow-[3px_3px_0_#1a1a1a]`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${dm.divider}`}>
                    <span className={`font-sketch text-base ${dm.text}`}>7-Day Price</span>
                    {chartLoading && <span className={`font-handwritten text-sm ${dm.faint}`}>Loading...</span>}
                    {!chartLoading && chartData.length === 0 && (
                      <span className={`font-handwritten text-sm ${dm.muted}`}>No price data</span>
                    )}
                  </div>
                {chartData.length > 0 ? (
                  <div className="h-56 px-2 py-3">
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
                          tick={{ fontFamily: "monospace", fontSize: 10, fill: dark ? "#FAFAF5" : "#1a1a1a", opacity: 0.3 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(4)}`}
                          tick={{ fontFamily: "monospace", fontSize: 10, fill: dark ? "#FAFAF5" : "#1a1a1a", opacity: 0.3 }}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          formatter={(v: number) => [`$${v >= 1 ? v.toFixed(2) : v.toFixed(6)}`, selLabel]}
                          labelFormatter={(t) => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                          contentStyle={{ fontFamily: "monospace", fontSize: 12, border: `2px solid ${dark ? "#FAFAF5" : "#1a1a1a"}`, borderRadius: 0, background: dark ? "#0f0f0f" : "#fff" }}
                          itemStyle={{ color: dark ? "#FAFAF5" : "#1a1a1a" }}
                          labelStyle={{ color: dark ? "#FAFAF5" : "#1a1a1a", opacity: 0.4 }}
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
                  <div className="h-56 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`font-sketch text-2xl ${dm.faint} mb-1`} style={{ opacity: 0.1 }}>--</div>
                      <div className={`font-handwritten text-sm ${dm.faint40}`}>Price chart not available</div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* NEW DEPOSIT ALERT */}
              {newDepositAlert && (
                <div className="flex items-center gap-3 px-4 py-3 border-2 border-[#F7931A] rounded-sm bg-[#F7931A]/8 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#F7931A] flex-shrink-0" />
                  <span className="font-body font-bold text-sm text-[#F7931A]">New transaction detected. Updating balance.</span>
                </div>
              )}

              {/* HISTORY CARD */}
              <div className={`border-2 ${dm.cardBorder} rounded-sm ${dm.card} shadow-[3px_3px_0_#1a1a1a] overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${dm.divider}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-sketch text-base ${dm.text}`}>History</span>
                    {txHistoryLoading && <span className={`font-handwritten text-xs ${dm.faint}`}>Loading...</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setHistoryTab("received")}
                      className={`px-3 py-1 text-xs font-body font-bold rounded-sm transition-all ${historyTab === "received" ? (dark ? "bg-[#FAFAF5] text-[#0f0f0f]" : "bg-[#1a1a1a] text-white") : `${dm.faint40} ${dm.sidebarHover}`}`}
                    >
                      Received
                    </button>
                    <button
                      onClick={() => setHistoryTab("sent")}
                      className={`px-3 py-1 text-xs font-body font-bold rounded-sm transition-all ${historyTab === "sent" ? (dark ? "bg-[#FAFAF5] text-[#0f0f0f]" : "bg-[#1a1a1a] text-white") : `${dm.faint40} ${dm.sidebarHover}`}`}
                    >
                      Sent
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
                  {(() => {
                    const ataAddr = getTxAddr(activeShieldAddress, sidebarSelected);
                    const isMyAddr = (addr: string) =>
                      addr === activeShieldAddress || addr === ataAddr;
                    const isMyTokenTransfer = (t: { mint: string; from: string; to: string; fromAccount: string; toAccount: string }) =>
                      t.mint === sidebarSelected &&
                      (isMyAddr(t.to) || isMyAddr(t.from) || t.toAccount === ataAddr || t.fromAccount === ataAddr);
                    const isTokenIn = (t: { to: string; toAccount: string }) =>
                      isMyAddr(t.to) || t.toAccount === ataAddr;

                    const filtered = txHistory.filter((tx) => {
                      const tt = tx.tokenTransfers.find(t => isMyTokenTransfer(t));
                      if (!tt) return false;
                      const isIn = isTokenIn(tt);
                      return historyTab === "received" ? isIn === true : isIn === false;
                    });

                    if (!txHistoryLoading && filtered.length === 0) {
                      return (
                        <div className="py-10 text-center">
                          <p className={`font-handwritten text-sm ${dm.faint}`}>
                            {historyTab === "received" ? "No received transactions yet." : "No sent transactions yet."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className={`divide-y ${dm.divider}`}>
                        {filtered.map((tx) => {
                          const tt = tx.tokenTransfers.find(t => isMyTokenTransfer(t));
                          const isIn = tt ? isTokenIn(tt) : null;
                          const amt = tt && tt.amount > 0
                            ? tt.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                            : "";
                          const sym = selHeld?.symbol ?? selMeta?.symbol ?? selPopular?.symbol ?? "";
                          const date = new Date(tx.ts * 1000).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          });
                          return (
                            <a
                              key={tx.sig}
                              href={explorerUrl(tx.sig, false)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-3 px-4 py-3 ${dm.sidebarHover} transition-all group`}
                            >
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${tx.err ? "bg-red-100 text-red-500" : isIn === true ? "bg-green-100 text-green-600" : "bg-[#F7931A]/10 text-[#F7931A]"}`}
                              >
                                {tx.err ? "!" : isIn === true ? "↓" : "↑"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className={`font-mono text-xs ${dm.muted} truncate`}>{tx.sig.slice(0, 20)}...</div>
                                <div className={`font-handwritten text-xs ${dm.faint} mt-0.5`}>{date}</div>
                              </div>
                              {amt && (
                                <span className={`font-body font-bold text-sm ${dm.text} flex-shrink-0 tabular-nums`}>
                                  {isIn === false ? "-" : ""}{amt} {sym}
                                </span>
                              )}
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 opacity-0 group-hover:opacity-30 transition-opacity"><path d="M1.5 1.5h7m0 0v7m0-7L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </a>
                          );
                        })}
                        {txHistoryHasMore && (
                          <div className="px-4 py-3">
                            <button
                              onClick={loadMoreTxHistory}
                              disabled={txHistoryLoadingMore}
                              className={`w-full py-2.5 border-2 ${dm.cardBorder} rounded-sm font-body font-bold text-xs ${dm.muted} hover:${dm.cardBorder} hover:${dm.text} transition-all disabled:opacity-30`}
                            >
                              {txHistoryLoadingMore ? "Loading..." : "Load more"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
