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
import { lookupVaultByPublicKey, saveTokenDeposit } from "@/lib/vaultStore";
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
  pricePerToken: number | null;
  isNft: boolean;
}

interface ShieldData {
  solBalance: number;
  tokens: TokenBalance[];
}

const WSOL_MINT = "So11111111111111111111111111111111111111112";

const POPULAR_TOKENS = [
  { symbol: "wSOL",     mint: WSOL_MINT },
  { symbol: "USDC",     mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { symbol: "USDT",     mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
  { symbol: "BONK",     mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "TRUMP",    mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" },
  { symbol: "FARTCOIN", mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump" },
  { symbol: "PUMP",     mint: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn" },
  { symbol: "BUTTCOIN", mint: "Cm6fNnMk7NfzStP9CZpsQA2v3jjzbcYGAxdJySmHpump" },
];

type TxRecord = {
  sig: string; ts: number;
  tokenTransfers: Array<{ mint: string; from: string; to: string; fromAccount: string; toAccount: string; amount: number }>;
  nativeTransfers: Array<{ from: string; to: string; lamports: number }>;
  err: unknown;
};

export default function AccessVault() {
  const [, navigate] = useLocation();
  const { t, dark, chain } = useApp();
  const {
    walletCombo, setWalletCombo,
    phantomPubkey, solflarePubkey, phantom2Pubkey,
    phantomConnecting, solflareConnecting, phantom2Connecting,
    phantomError, solflareError, phantom2Error,
    connectPhantom, connectSolflare, connectPhantom2,
    disconnectPhantom, disconnectSolflare, disconnectPhantom2,
    signWithPhantom, signWithSolflare, signWithPhantom2,
  } = useWalletPair();
  const {
    evmAddress1, evmAddress2,
    connecting1: evmConnecting1, connecting2: evmConnecting2,
    error1: evmError1, error2: evmError2,
    connectK1, connectK2,
    disconnectK1, disconnectK2,
    signTypedDataK1, signTypedDataK2,
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

  const [activeTab, setActiveTab] = useState<"receive" | "send" | null>(null);
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
  const [evmLoading, setEvmLoading] = useState(false);
  const [evmError, setEvmError] = useState("");
  const [evmShield, setEvmShield] = useState<{ ethBalance: number; tokens: Array<{ contract: string; name: string; symbol: string; decimals: number; logo: string; balance: number }> } | null>(null);
  const [evmActiveAddress, setEvmActiveAddress] = useState("");

  const [evmSendOpen, setEvmSendOpen] = useState(false);
  const [evmSendTokenId, setEvmSendTokenId] = useState<string>("eth");
  const [evmSendRecipient, setEvmSendRecipient] = useState("");
  const [evmSendAmount, setEvmSendAmount] = useState("");
  const [evmSendNonce, setEvmSendNonce] = useState<string | null>(null);
  const [evmSig1, setEvmSig1] = useState<string | null>(null);
  const [evmSig2, setEvmSig2] = useState<string | null>(null);
  const [evmSendStatus, setEvmSendStatus] = useState<"idle" | "fetchNonce" | "signing1" | "signing2" | "executing" | "done" | "error">("idle");
  const [evmSendTxHash, setEvmSendTxHash] = useState("");
  const [evmSendError, setEvmSendError] = useState("");

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

  const [walletMismatch, setWalletMismatch] = useState<string | null>(null);

  const [pub1Input, setPub1Input] = useState("");
  const [pub2Input, setPub2Input] = useState("");
  const [showDirectAddr, setShowDirectAddr] = useState(false);

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

  // Auto-detect Qoin when both wallets connect in Connect Wallets mode
  useEffect(() => {
    if (accessMode !== "connect-wallets") return;
    const key2Pubkey = walletCombo === "phantom+phantom" ? phantom2Pubkey : solflarePubkey;
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
  }, [phantomPubkey, solflarePubkey, phantom2Pubkey, walletCombo, accessMode]);

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
          fetch(`/api/qoin/balance?address=${encodeURIComponent(activeShieldAddress)}`),
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
    const res = await fetch(`/api/qoin/balance?address=${encodeURIComponent(addr)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load balance.");
    return data as ShieldData;
  }

  async function fetchEvmBalance(addr: string) {
    const res = await fetch(`/api/evm/balance?address=${encodeURIComponent(addr)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load EVM balance.");
    return data;
  }

  async function handleEvmView() {
    const raw = evmAddressInput.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      setEvmError("Enter a valid EVM address (0x...).");
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
    const addr = evmAddress1?.trim() ?? "";
    if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setEvmError("Connect MetaMask Key 1 first.");
      return;
    }
    setEvmError("");
    setEvmShield(null);
    setEvmLoading(true);
    try {
      const data = await fetchEvmBalance(addr);
      setEvmShield(data);
      setEvmActiveAddress(addr);
    } catch (e: unknown) {
      setEvmError((e as Error).message || "Failed to load. Check the address.");
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
      if (!d.vaults || d.vaults.length === 0) throw new Error("No Qoin vault found for this key.");
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
      setError((e as Error).message || "Vault not found.");
    } finally {
      setLoading(false);
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
    const isDualPhantom = walletCombo === "phantom+phantom";
    const key2Pubkey = isDualPhantom ? phantom2Pubkey : solflarePubkey;
    const signK2 = isDualPhantom ? signWithPhantom2 : signWithSolflare;
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
        setSigningStep(isDualPhantom ? ("phantom" as "solflare") : "solflare");
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
      setTxError((e as Error).message || "Transfer failed.");
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

      // Check if connected wallets match registered vault signers
      if (phantomPubkey || solflarePubkey || phantom2Pubkey) {
        try {
          const sigRes = await fetch(`/api/qoin/multisig-signers?address=${encodeURIComponent(addr)}`);
          if (sigRes.ok) {
            const { signers } = await sigRes.json() as { signers: string[] };
            const missing: string[] = [];
            if (phantomPubkey && !signers.includes(phantomPubkey)) missing.push("Phantom (K1)");
            if (walletCombo === "phantom+phantom") {
              if (phantom2Pubkey && !signers.includes(phantom2Pubkey)) missing.push("Phantom (K2)");
            } else {
              if (solflarePubkey && !signers.includes(solflarePubkey)) missing.push("Solflare");
            }
            if (missing.length > 0) {
              setWalletMismatch(
                `${missing.join(" & ")} connected is not a signer of this vault. ` +
                `Make sure you connect the exact same wallets used when the vault was created. ` +
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

  const selLabel = sidebarSelected === WSOL_MINT
    ? "wSOL"
    : (selHeld?.symbol ?? selMeta?.symbol ?? selPopular?.symbol ?? sidebarSelected.slice(0, 6));

  const selLogo = selHeld?.logo ?? selMeta?.image ?? null;

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
    setActiveTab(null);
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
                {addrCopied ? t.access.copied : t.access.copyAddr}
              </button>
              <span title="Live, auto-refreshing every 5s" className="flex items-center gap-1 font-handwritten text-xs text-[#1a1a1a]/30">
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
          <SketchShield className="w-14 h-14 mb-5 opacity-15" />
          <h1 className="font-sketch text-4xl text-[#1a1a1a] mb-1">{t.access.openBtn}</h1>
          <p className="font-handwritten text-base text-[#1a1a1a]/40 mb-6">
            {chain === "evm" ? "Enter an EVM address to view its balance." : t.access.enterKeys}
          </p>

          {/* Chain selector in-page */}
          <div className="w-full max-w-md mb-5">
            <div className="flex items-center gap-2 justify-center">
              <span className="font-handwritten text-xs text-[#1a1a1a]/30 uppercase tracking-widest">Chain</span>
              <div className="flex border-2 border-[#1a1a1a]/20 rounded-sm overflow-hidden">
                <button
                  onClick={() => { import("@/contexts/AppContext").then(m => void m); }}
                  className={`px-5 py-2 font-body font-bold text-xs transition-all ${chain === "solana" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:text-[#1a1a1a]"}`}
                  style={{ pointerEvents: "none", opacity: chain === "solana" ? 1 : 0.5 }}
                >
                  SOL
                </button>
                <button
                  className={`px-5 py-2 font-body font-bold text-xs border-l border-[#1a1a1a]/20 transition-all ${chain === "evm" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:text-[#1a1a1a]"}`}
                  style={{ pointerEvents: "none", opacity: chain === "evm" ? 1 : 0.5 }}
                >
                  ETH
                </button>
              </div>
              <span className="font-handwritten text-xs text-[#1a1a1a]/25">(change in navbar)</span>
            </div>
          </div>

          {/* Mode selector */}
          <div className="w-full max-w-md mb-6">
            <div className="flex border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
              <button
                onClick={() => { setAccessMode("cold-keys"); setError(""); setEvmError(""); }}
                className={`flex-1 py-3 font-body font-bold text-sm transition-all ${accessMode === "cold-keys" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
              >
                {chain === "evm" ? "Direct Address" : "Cold Keys"}
              </button>
              <button
                onClick={() => { setAccessMode("connect-wallets"); setError(""); setEvmError(""); }}
                className={`flex-1 py-3 font-body font-bold text-sm transition-all border-l-2 border-[#1a1a1a] ${accessMode === "connect-wallets" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
              >
                Connect Wallets
              </button>
            </div>
          </div>

          {/* EVM — Direct Address mode */}
          {chain === "evm" && accessMode === "cold-keys" && (
            <div className="w-full max-w-md space-y-3">
              <p className="font-handwritten text-sm text-[#1a1a1a]/40">
                Enter any EVM wallet address to inspect its ETH and token balances.
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

          {/* EVM — Connect Wallets mode (Dual MetaMask) */}
          {chain === "evm" && accessMode === "connect-wallets" && (
            <div className="w-full max-w-md space-y-4">
              <p className="font-handwritten text-sm text-[#1a1a1a]/40">
                Connect two MetaMask accounts as co-signers. Key 1 is used to look up the vault address.
              </p>

              {/* MetaMask K1 */}
              <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10 bg-[#FAFAF5]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🦊</span>
                    <span className="font-body font-bold text-sm text-[#1a1a1a]">Key 1 (MetaMask)</span>
                  </div>
                  {evmAddress1 && (
                    <span className="font-mono text-xs text-[#1a1a1a]/40">{evmAddress1.slice(0, 6)}...{evmAddress1.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {evmError1 && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{evmError1}</p>}
                  {evmAddress1 ? (
                    <button onClick={disconnectK1} className="w-full font-body font-bold text-xs py-2 border border-[#1a1a1a]/20 rounded-sm hover:bg-[#FAFAF5] transition-all">
                      Disconnect K1
                    </button>
                  ) : (
                    <button
                      onClick={connectK1}
                      disabled={evmConnecting1}
                      className="w-full font-body font-bold text-sm py-2.5 border-2 border-[#1a1a1a] rounded-sm bg-white hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-40"
                    >
                      {evmConnecting1 ? "Connecting..." : "Connect MetaMask (Key 1)"}
                    </button>
                  )}
                </div>
              </div>

              {/* MetaMask K2 */}
              <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10 bg-[#FAFAF5]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🦊</span>
                    <span className="font-body font-bold text-sm text-[#1a1a1a]">Key 2 (MetaMask)</span>
                  </div>
                  {evmAddress2 && (
                    <span className="font-mono text-xs text-[#1a1a1a]/40">{evmAddress2.slice(0, 6)}...{evmAddress2.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {evmError2 && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{evmError2}</p>}
                  {evmAddress2 ? (
                    <button onClick={disconnectK2} className="w-full font-body font-bold text-xs py-2 border border-[#1a1a1a]/20 rounded-sm hover:bg-[#FAFAF5] transition-all">
                      Disconnect K2
                    </button>
                  ) : (
                    <button
                      onClick={connectK2}
                      disabled={evmConnecting2}
                      className="w-full font-body font-bold text-sm py-2.5 border-2 border-[#1a1a1a] rounded-sm bg-white hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-40"
                    >
                      {evmConnecting2 ? "Connecting..." : "Connect MetaMask (Key 2)"}
                    </button>
                  )}
                  {!evmAddress2 && <p className="font-handwritten text-xs text-[#1a1a1a]/30 mt-1.5">Switch MetaMask account before connecting Key 2.</p>}
                </div>
              </div>

              <button
                onClick={handleEvmViewWallets}
                disabled={evmLoading || !evmAddress1}
                className="btn-sketch w-full py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {evmLoading ? "Loading..." : evmAddress1 ? `View ${evmAddress1.slice(0, 6)}...${evmAddress1.slice(-4)}` : "Connect Key 1 first"}
              </button>
              {evmError && <p className="font-handwritten text-sm text-[#F7931A]">{evmError}</p>}
            </div>
          )}

          {/* SOL — Cold Keys mode */}
          {chain === "solana" && accessMode === "cold-keys" && (
            <div className="w-full max-w-md space-y-3">
              <p className="font-handwritten text-sm text-[#1a1a1a]/40">
                Paste your Key 1 and Key 2 public keys to find your vault.
              </p>
              <input
                type="text"
                value={pub1Input}
                onChange={(e) => { setPub1Input(e.target.value); setError(""); }}
                placeholder="Key 1 public key..."
                className="input-sketch w-full text-sm py-3.5 font-mono"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                type="text"
                value={pub2Input}
                onChange={(e) => { setPub2Input(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleViewByPubkeys()}
                placeholder="Key 2 public key... (optional)"
                className="input-sketch w-full text-sm py-3.5 font-mono"
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
                  className="font-handwritten text-xs text-[#1a1a1a]/30 hover:text-[#F7931A] transition-all"
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

          {/* SOL — Connect Wallets mode (Dual Phantom or Phantom + Solflare) */}
          {chain === "solana" && accessMode === "connect-wallets" && (
            <div className="w-full max-w-md space-y-4">

              {/* Wallet combo selector */}
              <div>
                <p className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest mb-2">Wallet pair</p>
                <div className="flex border-2 border-[#1a1a1a]/20 rounded-sm overflow-hidden text-xs font-body font-bold">
                  <button
                    onClick={() => setWalletCombo("phantom+solflare")}
                    className={`flex-1 py-2 transition-all ${walletCombo === "phantom+solflare" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                  >
                    Phantom + Solflare
                  </button>
                  <button
                    onClick={() => setWalletCombo("phantom+phantom")}
                    className={`flex-1 py-2 border-l-2 border-[#1a1a1a]/20 transition-all ${walletCombo === "phantom+phantom" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                  >
                    Dual Phantom
                  </button>
                </div>
              </div>

              <p className="font-handwritten text-sm text-[#1a1a1a]/40">
                {walletCombo === "phantom+phantom"
                  ? "Connect Phantom as Key 1, switch Phantom accounts, then connect as Key 2."
                  : "Connect Phantom as Key 1 and Solflare as Key 2, then enter your Qoin address."}
              </p>

              {/* Key 1 (always Phantom) */}
              <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10 bg-[#FAFAF5]">
                  <div className="flex items-center gap-2">
                    <img src="/phantom-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" style={{ opacity: phantomPubkey ? 1 : 0.6 }} alt="Phantom" />
                    <span className="font-body font-bold text-sm text-[#1a1a1a]">Key 1 (Phantom)</span>
                  </div>
                  {phantomPubkey && (
                    <span className="font-mono text-xs text-[#1a1a1a]/40">{phantomPubkey.slice(0, 6)}...{phantomPubkey.slice(-4)}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {phantomError && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{phantomError}</p>}
                  {phantomPubkey ? (
                    <button onClick={disconnectPhantom} className="w-full font-body font-bold text-xs py-2 border border-[#1a1a1a]/20 rounded-sm hover:bg-[#FAFAF5] transition-all">
                      Disconnect Phantom
                    </button>
                  ) : (
                    <button
                      onClick={connectPhantom}
                      disabled={phantomConnecting}
                      className="w-full font-body font-bold text-sm py-2.5 border-2 border-[#1a1a1a] rounded-sm bg-white hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-40"
                    >
                      {phantomConnecting ? "Connecting..." : "Connect Phantom"}
                    </button>
                  )}
                </div>
              </div>

              {/* Key 2 — Solflare or Dual Phantom */}
              {walletCombo === "phantom+solflare" ? (
                <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10 bg-[#FAFAF5]">
                    <div className="flex items-center gap-2">
                      <img src="/solflare-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" style={{ opacity: solflarePubkey ? 1 : 0.6 }} alt="Solflare" />
                      <span className="font-body font-bold text-sm text-[#1a1a1a]">Key 2 (Solflare)</span>
                    </div>
                    {solflarePubkey && (
                      <span className="font-mono text-xs text-[#1a1a1a]/40">{solflarePubkey.slice(0, 6)}...{solflarePubkey.slice(-4)}</span>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    {solflareError && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{solflareError}</p>}
                    {solflarePubkey ? (
                      <button onClick={disconnectSolflare} className="w-full font-body font-bold text-xs py-2 border border-[#1a1a1a]/20 rounded-sm hover:bg-[#FAFAF5] transition-all">
                        Disconnect Solflare
                      </button>
                    ) : (
                      <button
                        onClick={connectSolflare}
                        disabled={solflareConnecting}
                        className="w-full font-body font-bold text-sm py-2.5 border-2 border-[#1a1a1a] rounded-sm bg-white hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-40"
                      >
                        {solflareConnecting ? "Connecting..." : "Connect Solflare"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10 bg-[#FAFAF5]">
                    <div className="flex items-center gap-2">
                      <img src="/phantom-logo.png" className="w-8 h-8 rounded-xl flex-shrink-0" style={{ opacity: phantom2Pubkey ? 1 : 0.6 }} alt="Phantom K2" />
                      <span className="font-body font-bold text-sm text-[#1a1a1a]">Key 2 (Phantom — switch account first)</span>
                    </div>
                    {phantom2Pubkey && (
                      <span className="font-mono text-xs text-[#1a1a1a]/40">{phantom2Pubkey.slice(0, 6)}...{phantom2Pubkey.slice(-4)}</span>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    {phantom2Error && <p className="font-handwritten text-xs text-[#F7931A] mb-2">{phantom2Error}</p>}
                    {!phantomPubkey && <p className="font-handwritten text-xs text-[#1a1a1a]/30 mb-2">Connect Key 1 first.</p>}
                    {phantom2Pubkey ? (
                      <button onClick={disconnectPhantom2} className="w-full font-body font-bold text-xs py-2 border border-[#1a1a1a]/20 rounded-sm hover:bg-[#FAFAF5] transition-all">
                        Disconnect Phantom (K2)
                      </button>
                    ) : (
                      <button
                        onClick={connectPhantom2}
                        disabled={phantom2Connecting || !phantomPubkey}
                        className="w-full font-body font-bold text-sm py-2.5 border-2 border-[#1a1a1a] rounded-sm bg-white hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-40"
                      >
                        {phantom2Connecting ? "Connecting..." : "Connect Phantom (Key 2)"}
                      </button>
                    )}
                    {!phantom2Pubkey && phantomPubkey && (
                      <p className="font-handwritten text-xs text-[#1a1a1a]/30 mt-1.5">Switch to your second Phantom account in the extension, then connect.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Qoin address input */}
              {(() => {
                const key2Connected = walletCombo === "phantom+phantom" ? !!phantom2Pubkey : !!solflarePubkey;
                return (
                  <div>
                    <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5 block">Qoin Address</label>
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
                      <p className="font-handwritten text-xs text-[#1a1a1a]/30 mt-1.5">Connect both wallets first.</p>
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
            className="font-handwritten text-sm text-[#1a1a1a]/30 hover:text-[#F7931A] transition-colors mt-8"
          >
            Don't have a Qoin? Create one →
          </button>
        </div>
      ) : evmShield ? (
        /* ── EVM DASHBOARD ── */
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
            {/* Header */}
            <div className="border-2 border-[#1a1a1a] rounded-sm bg-white p-5 shadow-[3px_3px_0_#1a1a1a]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest mb-1">EVM Address</div>
                  <div className="font-mono text-sm text-[#1a1a1a] break-all">{evmActiveAddress}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://etherscan.io/address/${evmActiveAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body font-bold text-xs text-[#F7931A] hover:underline"
                  >
                    Etherscan ↗
                  </a>
                  <button
                    onClick={() => { setEvmShield(null); setEvmActiveAddress(""); setEvmAddressInput(""); }}
                    className="font-body font-bold text-xs text-[#1a1a1a]/40 hover:text-[#F7931A] transition-colors ml-3"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* ETH balance */}
              <div className="flex items-end gap-3 py-4 border-t border-[#1a1a1a]/10">
                <div>
                  <div className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest mb-1">ETH Balance</div>
                  <div className="font-sketch text-3xl text-[#1a1a1a]">{evmShield.ethBalance.toFixed(6)}</div>
                  <div className="font-handwritten text-sm text-[#1a1a1a]/50">Ether</div>
                </div>
              </div>

              {/* Co-signers (if connected) */}
              {(evmAddress1 || evmAddress2) && (
                <div className="border-t border-[#1a1a1a]/10 pt-4 mt-2 space-y-2">
                  <div className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest">Co-signers connected</div>
                  {evmAddress1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🦊</span>
                      <span className="font-mono text-xs text-[#1a1a1a]/60">K1: {evmAddress1.slice(0, 10)}...{evmAddress1.slice(-6)}</span>
                    </div>
                  )}
                  {evmAddress2 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🦊</span>
                      <span className="font-mono text-xs text-[#1a1a1a]/60">K2: {evmAddress2.slice(0, 10)}...{evmAddress2.slice(-6)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ERC20 Tokens */}
            {evmShield.tokens.length > 0 ? (
              <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]/10">
                  <span className="font-sketch text-base text-[#1a1a1a]">Token Holdings</span>
                </div>
                <div className="divide-y divide-[#1a1a1a]/6">
                  {evmShield.tokens.map((tok) => (
                    <div key={tok.contract} className="flex items-center gap-3 px-4 py-3">
                      {tok.logo ? (
                        <img src={tok.logo} alt={tok.symbol} className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#1a1a1a]/10 flex items-center justify-center flex-shrink-0">
                          <span className="font-sketch text-xs text-[#1a1a1a]/40">{tok.symbol.slice(0, 2)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-bold text-sm text-[#1a1a1a]">{tok.symbol}</div>
                        <div className="font-mono text-xs text-[#1a1a1a]/40 truncate">{tok.name}</div>
                      </div>
                      <div className="font-body font-bold text-sm text-[#1a1a1a] tabular-nums">{tok.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="font-handwritten text-sm text-[#1a1a1a]/40">No ERC-20 token balances found.</p>
              </div>
            )}

            {/* EVM SEND PANEL */}
            {!evmSendOpen ? (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setEvmSendOpen(true);
                    setEvmSendStatus("idle");
                    setEvmSig1(null);
                    setEvmSig2(null);
                    setEvmSendTxHash("");
                    setEvmSendError("");
                    setEvmSendNonce(null);
                  }}
                  className="btn-sketch text-base py-3 px-8"
                >
                  Send from Vault
                </button>
              </div>
            ) : (
              <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] overflow-hidden">
                {/* Send header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#1a1a1a]/10 bg-[#FAFAF5]">
                  <span className="font-sketch text-base text-[#1a1a1a]">Send from Vault</span>
                  <button
                    onClick={() => { setEvmSendOpen(false); setEvmSendStatus("idle"); }}
                    className="font-handwritten text-xs text-[#1a1a1a]/30 hover:text-red-500 transition-colors"
                  >
                    cancel
                  </button>
                </div>

                {evmSendStatus === "done" ? (
                  <div className="px-4 py-6 text-center space-y-3">
                    <div className="font-sketch text-2xl text-[#1a1a1a]">Sent!</div>
                    <p className="font-handwritten text-sm text-[#1a1a1a]/50">Transaction submitted on-chain.</p>
                    <a
                      href={`https://etherscan.io/tx/${evmSendTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block font-body font-bold text-sm text-[#F7931A] hover:underline"
                    >
                      View on Etherscan ↗
                    </a>
                    <div>
                      <button
                        onClick={() => { setEvmSendStatus("idle"); setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); setEvmSendRecipient(""); setEvmSendAmount(""); }}
                        className="btn-sketch-outline text-sm py-2 px-5 bg-white mt-2"
                      >
                        Send another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-4 space-y-4">
                    {/* K1/K2 connect check */}
                    {(!evmAddress1 || !evmAddress2) && (
                      <div className="space-y-2">
                        <p className="font-handwritten text-sm text-[#1a1a1a]/50">Both K1 and K2 must be connected to sign a send transaction.</p>
                        {!evmAddress1 && (
                          <button onClick={connectK1} disabled={evmConnecting1} className="btn-sketch-outline w-full text-sm py-2 bg-white">
                            {evmConnecting1 ? "Connecting..." : "Connect K1 (MetaMask)"}
                          </button>
                        )}
                        {evmAddress1 && !evmAddress2 && (
                          <button onClick={connectK2} disabled={evmConnecting2} className="btn-sketch-outline w-full text-sm py-2 bg-white">
                            {evmConnecting2 ? "Connecting..." : "Connect K2 (MetaMask)"}
                          </button>
                        )}
                        {evmError1 && <p className="font-handwritten text-xs text-red-500">{evmError1}</p>}
                        {evmError2 && <p className="font-handwritten text-xs text-red-500">{evmError2}</p>}
                      </div>
                    )}

                    {evmAddress1 && evmAddress2 && (
                      <>
                        {/* Token selector */}
                        <div>
                          <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest block mb-1.5">Token to Send</label>
                          <select
                            value={evmSendTokenId}
                            onChange={(e) => { setEvmSendTokenId(e.target.value); setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); }}
                            disabled={evmSendStatus !== "idle"}
                            className="w-full border-2 border-[#1a1a1a] rounded-sm px-3 py-2 font-body text-sm bg-white disabled:opacity-40"
                          >
                            <option value="eth">ETH (Ether)</option>
                            {evmShield && evmShield.tokens.map((tok) => (
                              <option key={tok.contract} value={tok.contract}>
                                {tok.symbol} — {tok.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} available
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Recipient */}
                        <div>
                          <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest block mb-1.5">Recipient Address</label>
                          <input
                            type="text"
                            placeholder="0x..."
                            value={evmSendRecipient}
                            onChange={(e) => { setEvmSendRecipient(e.target.value); setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); }}
                            disabled={evmSendStatus !== "idle"}
                            className="w-full border-2 border-[#1a1a1a] rounded-sm px-3 py-2 font-mono text-sm bg-white placeholder:text-[#1a1a1a]/20 disabled:opacity-40"
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest block mb-1.5">Amount</label>
                          <input
                            type="number"
                            placeholder="0.0"
                            min="0"
                            step="any"
                            value={evmSendAmount}
                            onChange={(e) => { setEvmSendAmount(e.target.value); setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); }}
                            disabled={evmSendStatus !== "idle"}
                            className="w-full border-2 border-[#1a1a1a] rounded-sm px-3 py-2 font-body text-sm bg-white disabled:opacity-40"
                          />
                        </div>

                        {evmSendError && (
                          <p className="font-handwritten text-sm text-red-500">{evmSendError}</p>
                        )}

                        {/* Step 1: fetch nonce + K1 sign */}
                        {!evmSig1 && (
                          <button
                            disabled={!evmSendRecipient || !evmSendAmount || evmSendStatus === "fetchNonce" || evmSendStatus === "signing1"}
                            onClick={async () => {
                              setEvmSendError("");
                              if (!/^0x[0-9a-fA-F]{40}$/.test(evmSendRecipient)) {
                                setEvmSendError("Invalid recipient address.");
                                return;
                              }
                              const amt = parseFloat(evmSendAmount);
                              if (isNaN(amt) || amt <= 0) {
                                setEvmSendError("Invalid amount.");
                                return;
                              }
                              try {
                                setEvmSendStatus("fetchNonce");
                                const r = await fetch(`/api/evm/vault-info?address=${encodeURIComponent(evmActiveAddress)}`);
                                const d = await r.json() as { nonce?: string; error?: string };
                                if (!r.ok || d.error) throw new Error(d.error || "Failed to fetch nonce.");
                                const nonce = d.nonce!;
                                setEvmSendNonce(nonce);

                                const isEth = evmSendTokenId === "eth";
                                const decimals = isEth ? 18 : (evmShield?.tokens.find(t => t.contract === evmSendTokenId)?.decimals ?? 18);
                                const amountBig = parseTokenAmount(evmSendAmount, decimals);
                                const txTo = isEth ? evmSendRecipient : evmSendTokenId;
                                const txValue = isEth ? amountBig : 0n;
                                const txData = isEth ? "0x" : encodeERC20Transfer(evmSendRecipient, amountBig);

                                const safeTx = buildSafeTx({ to: txTo, value: txValue, data: txData, nonce });
                                const typedData = buildTypedData(evmActiveAddress, 1, safeTx);

                                setEvmSendStatus("signing1");
                                const sig1 = await signTypedDataK1(typedData);
                                setEvmSig1(sig1);
                                setEvmSendStatus("idle");
                              } catch (e: unknown) {
                                setEvmSendError((e as Error).message || "Signing failed.");
                                setEvmSendStatus("idle");
                              }
                            }}
                            className="w-full py-3 border-2 border-[#1a1a1a] rounded-sm font-sketch text-base bg-white hover:bg-[#FAFAF5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {evmSendStatus === "fetchNonce" ? "Fetching nonce..." : evmSendStatus === "signing1" ? "Waiting for K1 signature..." : "Step 1 — Sign with K1"}
                          </button>
                        )}

                        {/* K1 signed indicator */}
                        {evmSig1 && (
                          <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-sm">
                            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-green-600 flex-shrink-0"><path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span className="font-handwritten text-sm text-green-700">K1 signed</span>
                            <button onClick={() => { setEvmSig1(null); setEvmSig2(null); setEvmSendNonce(null); setEvmSendStatus("idle"); }} className="ml-auto font-handwritten text-xs text-[#1a1a1a]/30 hover:text-red-500">redo</button>
                          </div>
                        )}

                        {/* Step 2: K2 sign */}
                        {evmSig1 && !evmSig2 && (
                          <button
                            disabled={evmSendStatus === "signing2"}
                            onClick={async () => {
                              setEvmSendError("");
                              try {
                                const isEth = evmSendTokenId === "eth";
                                const decimals = isEth ? 18 : (evmShield?.tokens.find(t => t.contract === evmSendTokenId)?.decimals ?? 18);
                                const amountBig = parseTokenAmount(evmSendAmount, decimals);
                                const txTo = isEth ? evmSendRecipient : evmSendTokenId;
                                const txValue = isEth ? amountBig : 0n;
                                const txData = isEth ? "0x" : encodeERC20Transfer(evmSendRecipient, amountBig);

                                const safeTx = buildSafeTx({ to: txTo, value: txValue, data: txData, nonce: evmSendNonce! });
                                const typedData = buildTypedData(evmActiveAddress, 1, safeTx);

                                setEvmSendStatus("signing2");
                                const sig2 = await signTypedDataK2(typedData);
                                setEvmSig2(sig2);
                                setEvmSendStatus("idle");
                              } catch (e: unknown) {
                                setEvmSendError((e as Error).message || "K2 signing failed.");
                                setEvmSendStatus("idle");
                              }
                            }}
                            className="w-full py-3 border-2 border-[#F7931A] rounded-sm font-sketch text-base bg-white hover:bg-[#F7931A]/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {evmSendStatus === "signing2" ? "Waiting for K2 signature..." : "Step 2 — Sign with K2"}
                          </button>
                        )}

                        {/* K2 signed indicator */}
                        {evmSig2 && (
                          <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-sm">
                            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-green-600 flex-shrink-0"><path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span className="font-handwritten text-sm text-green-700">K2 signed</span>
                          </div>
                        )}

                        {/* Step 3: Execute */}
                        {evmSig1 && evmSig2 && (
                          <>
                            <div className="flex items-center gap-2 px-3 py-2 border border-[#1a1a1a]/10 bg-[#FAFAF5] rounded-sm">
                              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-[#1a1a1a]/40 flex-shrink-0"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              <span className="font-handwritten text-xs text-[#1a1a1a]/40">K1 pays execution gas from MetaMask wallet (not the vault).</span>
                            </div>
                            <button
                              disabled={evmSendStatus === "executing"}
                              onClick={async () => {
                                setEvmSendError("");
                                try {
                                  const isEth = evmSendTokenId === "eth";
                                  const decimals = isEth ? 18 : (evmShield?.tokens.find(t => t.contract === evmSendTokenId)?.decimals ?? 18);
                                  const amountBig = parseTokenAmount(evmSendAmount, decimals);
                                  const txTo = isEth ? evmSendRecipient : evmSendTokenId;
                                  const txValue = isEth ? amountBig : 0n;
                                  const txData = isEth ? "0x" : encodeERC20Transfer(evmSendRecipient, amountBig);

                                  const safeTx = buildSafeTx({ to: txTo, value: txValue, data: txData, nonce: evmSendNonce! });
                                  const packed = packSignatures(evmSig1!, evmAddress1!, evmSig2!, evmAddress2!);
                                  const calldata = encodeExecTransaction(safeTx, packed);

                                  setEvmSendStatus("executing");
                                  const txHash = await window.ethereum!.request({
                                    method: "eth_sendTransaction",
                                    params: [{
                                      from: evmAddress1,
                                      to: evmActiveAddress,
                                      data: calldata,
                                      gas: "0x7A120",
                                    }],
                                  }) as string;
                                  setEvmSendTxHash(txHash);
                                  setEvmSendStatus("done");
                                } catch (e: unknown) {
                                  setEvmSendError((e as Error).message || "Execution failed.");
                                  setEvmSendStatus("idle");
                                }
                              }}
                              className="btn-sketch w-full text-lg py-4"
                            >
                              {evmSendStatus === "executing" ? "Broadcasting..." : "Step 3 — Execute Transaction"}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR icon-only on mobile, full on md+ */}
          <div className="w-14 md:w-60 flex-shrink-0 border-r-2 border-[#1a1a1a]/10 bg-white flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 py-2">

              {/* Holdings label desktop only */}
              <div className="hidden md:block px-4 pt-2 pb-1">
                <span className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-widest">{t.access.tokens}</span>
              </div>

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
                        <span className="font-body font-bold text-sm text-[#1a1a1a] truncate leading-none">{t.mint === WSOL_MINT ? "wSOL" : (t.symbol ?? t.name?.slice(0, 8) ?? "Token")}</span>
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
                  <p className="font-handwritten text-sm text-[#1a1a1a]/40">{t.access.noBalance}</p>
                </div>
              )}

              {/* Quick Deposit divider desktop only label */}
              {visiblePopular.length > 0 && (
                <>
                  <div className="border-t border-[#1a1a1a]/5 mt-2 mb-1">
                    <span className="hidden md:block px-4 pt-3 pb-1 font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-widest">Available</span>
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
                          <div className="font-mono text-xs text-[#1a1a1a]/35">{dexPrices[t.mint]?.price != null ? fmtPrice(dexPrices[t.mint].price) : meta?.name ?? "SPL"}</div>
                        </div>
                        {sidebarSelected === t.mint && <span className="hidden md:inline w-1.5 h-1.5 rounded-full bg-[#F7931A] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Add Token */}
            <div className="border-t border-[#1a1a1a]/5 mt-2">
              <button
                onClick={() => { setShowAddToken(!showAddToken); setCustomMint(""); setCustomDepositAddr(""); }}
                className="w-full flex items-center justify-center md:justify-start gap-2 px-2 md:px-4 py-2.5 hover:bg-[#FAFAF5] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#1a1a1a]/5 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                    <path d="M8 3v10M3 8h10" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" opacity="0.4"/>
                  </svg>
                </div>
                <span className="hidden md:block font-handwritten text-sm text-[#1a1a1a]/40">Add Token</span>
              </button>
              {showAddToken && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Notice: SPL tokens only */}
                  <div className="flex items-start gap-1.5 px-2 py-2 bg-[#1a1a1a]/4 rounded-sm border border-[#1a1a1a]/10">
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><circle cx="8" cy="8" r="6.5" stroke="#F7931A" strokeWidth="1.3"/><path d="M8 5v3.5M8 10.5v.5" stroke="#F7931A" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <p className="font-handwritten text-xs text-[#1a1a1a]/60 leading-relaxed">
                      <span className="font-bold text-[#1a1a1a]">SPL tokens only.</span> Never send native SOL to this vault. SOL cannot be managed by a multisig account. Use <span className="font-bold">wSOL</span> (Wrapped SOL) to hold SOL inside your vault.
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
                      <p className="font-body font-bold text-xs text-[#F7931A]">wSOL is already in your vault</p>
                      <p className="font-handwritten text-xs text-[#1a1a1a]/60 leading-relaxed">
                        That address is <span className="font-bold">Wrapped SOL (wSOL)</span>. It is already available at the top of your token list. No need to add it again. Open the wSOL tab and copy its receive address.
                      </p>
                      <p className="font-handwritten text-xs text-[#1a1a1a]/40 mt-1">
                        Want to hold SOL? Wrap it to wSOL in Phantom or Solflare first, then send wSOL to the receive address.
                      </p>
                    </div>
                  )}
                  {/* Native SOL system program address */}
                  {customMint === "11111111111111111111111111111111" && (
                    <div className="border-2 border-red-300 bg-red-50 rounded-sm px-3 py-2.5 space-y-1">
                      <p className="font-body font-bold text-xs text-red-500">Not an SPL token</p>
                      <p className="font-handwritten text-xs text-[#1a1a1a]/60 leading-relaxed">
                        That is the Solana System Program address, not a token mint. Native SOL <span className="font-bold text-red-500">cannot</span> enter a Qoin vault. Use <span className="font-bold">wSOL</span> already available in your sidebar.
                      </p>
                    </div>
                  )}
                  {customMint && customMint !== WSOL_MINT && customMint !== "11111111111111111111111111111111" && !isValidPublicKey(customMint) && (
                    <p className="font-handwritten text-xs text-[#1a1a1a]/30">Enter a valid token mint address (CA).</p>
                  )}
                  {customTaError && (
                    <p className="font-handwritten text-xs text-[#F7931A]">{customTaError}</p>
                  )}
                  {isValidPublicKey(customMint) && customMint !== WSOL_MINT && !customDepositAddr && (

                    <button
                      onClick={handleCreateTokenAccountSidebar}
                      disabled={customCreating}
                      className="w-full font-body font-bold text-xs py-2 border-2 border-[#1a1a1a] rounded-sm bg-white hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {customCreating ? "Creating..." : "Get Receive Address"}
                    </button>
                  )}
                  {customDepositAddr && (
                    <div className="border border-[#1a1a1a]/10 rounded-sm p-2 bg-[#FAFAF5]">
                      <div className="font-handwritten text-xs text-[#1a1a1a]/40 mb-1">
                        Receive address:{customTaSig && <span className="ml-1 text-[#F7931A]">Created on-chain.</span>}
                      </div>
                      <div className="font-mono text-xs text-[#1a1a1a] break-all mb-2">{customDepositAddr.slice(0, 22)}...</div>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(customDepositAddr);
                          setCustomMintCopied(true);
                          setTimeout(() => setCustomMintCopied(false), 2000);
                        }}
                        className="w-full font-body font-bold text-xs py-1.5 border border-[#1a1a1a]/20 rounded-sm hover:bg-[#F7931A] hover:text-white hover:border-[#F7931A] transition-all"
                      >
                        {customMintCopied ? "Copied!" : "Copy Address"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar footer desktop only */}
            <div className="hidden md:block border-t-2 border-[#1a1a1a]/10 px-4 py-3 flex-shrink-0">
              <div className="font-body font-bold text-xs text-[#1a1a1a]/50 mb-0.5">{t.access.portfolio}</div>
              <div className="font-sketch text-lg text-[#1a1a1a]">
                {totalUSD > 0 ? `$${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
              </div>
              <div className="font-mono text-xs text-[#1a1a1a]/40 mt-0.5">{1 + shield.tokens.length} assets</div>
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
                  <div className="w-14 h-14 rounded-full bg-[#1a1a1a]/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-sketch text-base text-[#1a1a1a]/30">{selLabel.slice(0, 3)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-sketch text-3xl text-[#1a1a1a] leading-none">{selLabel}</div>
                  {selHeld && (
                    <div className="font-sketch text-xl text-[#F7931A] mt-0.5 leading-none">
                      {selHeld.balance.toLocaleString()} {selLabel}
                    </div>
                  )}
                  {selDex && (
                    <div className="font-mono text-sm text-[#1a1a1a]/50 mt-1">{fmtPrice(selDex.price)} per token</div>
                  )}
                  {selHeld && (() => {
                    const p = selHeld.pricePerToken ?? selDex?.price ?? null;
                    return p ? (
                      <div className="font-mono text-sm text-[#1a1a1a]/60 mt-0.5">{fmtPrice(selHeld.balance * p)} total</div>
                    ) : null;
                  })()}
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

              {/* PORTFOLIO SUMMARY CARD — visible when vault has >1 token with value */}
              {totalUSD > 0 && shield.tokens.filter(t => !t.isNft && (t.pricePerToken ?? dexPrices[t.mint]?.price) != null).length > 1 && (
                <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-widest">Vault Portfolio</span>
                    <span className="font-sketch text-xl text-[#1a1a1a]">${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            <div className="w-4 h-4 rounded-full bg-[#1a1a1a]/10 flex-shrink-0" />
                          )}
                          <span className="font-body font-bold text-xs text-[#1a1a1a]/70 w-14 truncate flex-shrink-0">{t.symbol}</span>
                          <div className="flex-1 h-1.5 bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#F7931A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-xs text-[#1a1a1a]/50 w-20 text-right flex-shrink-0">${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="font-mono text-xs text-[#1a1a1a]/30 w-10 text-right flex-shrink-0">{pct.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS — Receive / Send */}
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab(activeTab === "receive" ? null : "receive")}
                  className={`flex-1 py-4 font-body font-bold text-base rounded-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "receive"
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
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
              </div>

              {/* RECEIVE PANEL */}
              {activeTab === "receive" && (
                <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] overflow-hidden">
                  <div className="flex flex-col items-center px-6 py-8 space-y-5">
                    <div className="font-sketch text-2xl text-[#1a1a1a]">Receive {selLabel}</div>
                    {sidebarSelected === WSOL_MINT && (
                      <div className="w-full border-2 border-red-400 bg-red-50 rounded-sm px-4 py-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 flex-shrink-0"><path d="M10 2L2 17h16L10 2z" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 8v4M10 13.5v.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/></svg>
                          <p className="font-body font-bold text-sm text-red-500">Send wSOL only, not native SOL</p>
                        </div>
                        <p className="font-handwritten text-xs text-[#1a1a1a]/60 leading-relaxed">
                          This accepts <span className="font-bold">wSOL (Wrapped SOL)</span> only. Native SOL sent here will be permanently lost. Wrap SOL to wSOL in Phantom or Solflare first.
                        </p>
                      </div>
                    )}
                    <div className="border-4 border-[#1a1a1a] p-4 rounded-sm bg-white shadow-[4px_4px_0_#1a1a1a]">
                      <QRCodeSVG value={receiveAddr} size={200} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
                    </div>
                    <div className="w-full bg-[#FAFAF5] border-2 border-[#1a1a1a]/10 rounded-sm px-4 py-3 text-center">
                      <div className="font-mono text-xs text-[#1a1a1a]/40 mb-1">Address</div>
                      <div className="font-mono text-sm text-[#1a1a1a] break-all">{receiveAddr}</div>
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
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 border-2 border-[#1a1a1a]/20 rounded-sm font-body font-bold text-sm text-[#1a1a1a]/60 hover:border-[#F7931A] hover:text-[#F7931A] transition-all bg-white"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5.5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7.5M8 1h4m0 0v4m0-4L5.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Orb
                      </a>
                    </div>
                    {sidebarSelected === WSOL_MINT ? (
                      <div className="w-full border-2 border-[#1a1a1a]/10 bg-[#FAFAF5] rounded-sm px-4 py-3 space-y-1.5">
                        <p className="font-body font-bold text-xs text-[#1a1a1a] uppercase tracking-wide">How to add SOL to your vault:</p>
                        <ol className="space-y-1.5">
                          <li className="flex items-start gap-2"><span className="font-sketch text-xs text-[#F7931A] mt-0.5">1</span><span className="font-handwritten text-sm text-[#1a1a1a]/70">Open Phantom or Solflare</span></li>
                          <li className="flex items-start gap-2"><span className="font-sketch text-xs text-[#F7931A] mt-0.5">2</span><span className="font-handwritten text-sm text-[#1a1a1a]/70">Use <span className="font-bold">Swap or Wrap</span> to convert SOL to wSOL</span></li>
                          <li className="flex items-start gap-2"><span className="font-sketch text-xs text-[#F7931A] mt-0.5">3</span><span className="font-handwritten text-sm text-[#1a1a1a]/70">Send <span className="font-bold">wSOL</span> to the address above</span></li>
                        </ol>
                      </div>
                    ) : (
                      <p className="font-handwritten text-xs text-[#1a1a1a]/35 text-center">
                        Use this address to receive {selLabel} on Solana. Do not send to the Qoin address directly.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SEND PANEL */}
              {activeTab === "send" && (
                <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] overflow-hidden">
                  <div className="px-5 py-5 space-y-4">
                    {accessMode === "connect-wallets" && (
                      <div className="border-2 border-[#1a1a1a]/10 rounded-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAF5] border-b border-[#1a1a1a]/10">
                          <SketchTwoKeys className="w-7 h-4 flex-shrink-0" />
                          <span className="font-sketch text-sm text-[#1a1a1a]">Signing wallets</span>
                          {phantomPubkey && solflarePubkey && !txLoading && (
                            <span className="ml-auto font-handwritten text-sm text-[#F7931A]">Both ready</span>
                          )}
                          {txLoading && signingStep && (
                            <span className="ml-auto font-handwritten text-sm text-[#F7931A] animate-pulse">
                              {signingStep === "phantom" && "Waiting for Phantom..."}
                              {signingStep === "solflare" && "Waiting for Solflare..."}
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
                              <span className="font-body font-bold text-xs text-[#1a1a1a]/60">Phantom (Key 1)</span>
                              {txLoading && signingStep === "phantom" && <span className="font-handwritten text-xs text-[#F7931A]">Approve in Phantom</span>}
                              {(signingStep === "solflare" || signingStep === "broadcasting") && <span className="font-handwritten text-xs text-green-600">Signed</span>}
                            </div>
                            {phantomPubkey ? (
                              <span className="font-mono text-xs text-[#1a1a1a]/40">{phantomPubkey.slice(0, 6)}...{phantomPubkey.slice(-4)}</span>
                            ) : (
                              <span className="font-handwritten text-xs text-[#1a1a1a]/25">Not connected</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {txLoading && signingStep === "solflare" ? (
                                <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-pulse flex-shrink-0" />
                              ) : signingStep === "broadcasting" ? (
                                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: solflarePubkey ? "#F7931A" : "#1a1a1a", opacity: solflarePubkey ? 1 : 0.15 }} />
                              )}
                              <img src="/solflare-logo.png" className="w-5 h-5 rounded-lg flex-shrink-0" alt="Solflare" />
                              <span className="font-body font-bold text-xs text-[#1a1a1a]/60">Solflare (Key 2)</span>
                              {txLoading && signingStep === "solflare" && <span className="font-handwritten text-xs text-[#F7931A]">Approve in Solflare</span>}
                              {signingStep === "broadcasting" && <span className="font-handwritten text-xs text-green-600">Signed</span>}
                            </div>
                            {solflarePubkey ? (
                              <span className="font-mono text-xs text-[#1a1a1a]/40">{solflarePubkey.slice(0, 6)}...{solflarePubkey.slice(-4)}</span>
                            ) : (
                              <span className="font-handwritten text-xs text-[#1a1a1a]/25">Not connected</span>
                            )}
                          </div>
                          <p className="font-handwritten text-xs text-[#1a1a1a]/25 pt-0.5">
                            Phantom signs first, then Solflare. Two separate approvals. One transaction on-chain.
                          </p>
                        </div>
                      </div>
                    )}
                    {accessMode === "connect-wallets" && walletMismatch && (
                      <div className="border-2 border-[#F7931A] bg-[#FFF7ED] rounded-sm p-3 flex gap-2.5 items-start">
                        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 flex-shrink-0 mt-0.5">
                          <path d="M10 3L18 17H2L10 3Z" stroke="#F7931A" strokeWidth="1.8" strokeLinejoin="round"/>
                          <path d="M10 9v4M10 14.5v.5" stroke="#F7931A" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        <p className="font-handwritten text-sm text-[#1a1a1a]/80 leading-relaxed">{walletMismatch}</p>
                      </div>
                    )}
                    {accessMode === "cold-keys" && (
                      <div className="border-2 border-[#1a1a1a]/10 rounded-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAF5] border-b border-[#1a1a1a]/10">
                          <SketchTwoKeys className="w-7 h-4 flex-shrink-0" />
                          <span className="font-sketch text-sm text-[#1a1a1a]">Paste your two cold keys</span>
                          {hasBothKeys && <span className="ml-auto font-handwritten text-sm text-[#F7931A]">Both keys loaded</span>}
                        </div>
                        <p className="font-handwritten text-xs text-[#1a1a1a]/30 px-4 pt-2.5">Keys are used to sign locally. They are never sent to any server.</p>
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-wide mb-1 block">Private Key 1</label>
                            <div className="relative">
                              <input type={showPk1 ? "text" : "password"} placeholder="base58 private key..." value={pk1} onChange={(e) => setPk1(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} className="input-sketch text-sm font-mono py-2 pr-16" />
                              <button onClick={() => setShowPk1(!showPk1)} className="absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors">{showPk1 ? "Hide" : "Show"}</button>
                            </div>
                          </div>
                          <div>
                            <label className="font-body font-bold text-xs text-[#1a1a1a]/50 uppercase tracking-wide mb-1 block">Private Key 2</label>
                            <div className="relative">
                              <input type={showPk2 ? "text" : "password"} placeholder="base58 private key..." value={pk2} onChange={(e) => setPk2(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} className="input-sketch text-sm font-mono py-2 pr-16" />
                              <button onClick={() => setShowPk2(!showPk2)} className="absolute right-2 top-1/2 -translate-y-1/2 font-handwritten text-sm text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors">{showPk2 ? "Hide" : "Show"}</button>
                            </div>
                          </div>
                          {(pk1 && !pk1Valid) && <p className="font-handwritten text-sm text-[#F7931A]">Key 1 is invalid.</p>}
                          {(pk2 && !pk2Valid) && <p className="font-handwritten text-sm text-[#F7931A]">Key 2 is invalid.</p>}
                        </div>
                      </div>
                    )}
                    {(() => {
                      const canSendKeys = accessMode === "cold-keys" && hasBothKeys;
                      const canSendWallets = accessMode === "connect-wallets" && !!(phantomPubkey && solflarePubkey);
                      const canSend = canSendKeys || canSendWallets;
                      return (
                        <>
                          <div>
                            <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5 block">Recipient Address</label>
                            <input type="text" placeholder="Solana wallet address..." value={recipient} onChange={(e) => setRecipient(e.target.value)} disabled={!canSend || !selHeld} className="input-sketch text-sm font-mono py-2.5 disabled:opacity-30" />
                            {recipient && !isValidPublicKey(recipient) && (
                              <div className="flex items-center gap-1.5 mt-1 font-handwritten text-sm"><SketchX className="w-4 h-4" /> Invalid address</div>
                            )}
                          </div>
                          <div>
                            <label className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5 block">
                              Amount
                              <span className="ml-2 text-[#1a1a1a]/25 normal-case">balance: {(selHeld?.balance ?? 0).toLocaleString()} {selHeld?.symbol ?? selLabel}</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" disabled={!canSend || !selHeld} className="input-sketch text-sm py-2.5 flex-1 disabled:opacity-30" />
                              <button onClick={() => setAmount((selHeld?.balance ?? 0).toString())} disabled={!canSend || !selHeld} className="font-body font-bold text-xs px-3 border-2 border-[#1a1a1a] rounded-sm hover:bg-[#1a1a1a] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed">MAX</button>
                            </div>
                            {amount && parseFloat(amount) > (selHeld?.balance ?? 0) && (
                              <p className="font-handwritten text-sm text-[#1a1a1a]/60 mt-1">Exceeds balance</p>
                            )}
                          </div>
                          {txError && <div className="border-2 border-[#F7931A] bg-white rounded-sm p-3 font-body text-sm text-[#1a1a1a]/70">{txError}</div>}
                          {txSig && (
                            <div className="border-2 border-[#1a1a1a] bg-white rounded-sm p-4 shadow-[3px_3px_0_#1a1a1a]">
                              <div className="flex items-center gap-2 font-sketch text-base text-[#1a1a1a] mb-2"><SketchCheckmark className="w-5 h-5" /> Sent!</div>
                              <div className="font-mono text-sm break-all text-[#1a1a1a]/60 mb-2">{txSig}</div>
                              <a href={explorerUrl(txSig, false)} target="_blank" rel="noopener noreferrer" className="font-handwritten text-sm text-[#F7931A] hover:underline">View on Orb</a>
                            </div>
                          )}
                          <button
                            onClick={accessMode === "connect-wallets" ? handleTransferWallets : handleTransfer}
                            disabled={!canSend || !selHeld || txLoading || !recipient || !amount || !isValidPublicKey(recipient) || parseFloat(amount) <= 0 || parseFloat(amount) > (selHeld?.balance ?? 0)}
                            className="btn-sketch w-full py-3.5 text-base disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {!canSend
                              ? (accessMode === "connect-wallets" ? "Connect both wallets to send" : "Load both cold keys above to send")
                              : txLoading
                                ? signingStep === "phantom" ? "Step 1/2: Approve in Phantom..."
                                : signingStep === "solflare" ? "Step 2/2: Approve in Solflare..."
                                : signingStep === "broadcasting" ? "Broadcasting to Solana..."
                                : "Signing..."
                              : t.access.sendBtn}
                          </button>
                          {canSend && !txLoading && (
                            <p className="font-handwritten text-xs text-[#1a1a1a]/25 text-center">
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
                <div className="border-2 border-[#1a1a1a] rounded-sm bg-white overflow-hidden shadow-[3px_3px_0_#1a1a1a]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/10">
                    <span className="font-sketch text-base text-[#1a1a1a]">7-Day Price</span>
                    {chartLoading && <span className="font-handwritten text-sm text-[#1a1a1a]/30">Loading...</span>}
                    {!chartLoading && chartData.length === 0 && (
                      <span className="font-handwritten text-sm text-[#1a1a1a]/50">No price data</span>
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
                  <div className="h-56 flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-sketch text-2xl text-[#1a1a1a]/10 mb-1">--</div>
                      <div className="font-handwritten text-sm text-[#1a1a1a]/40">Price chart not available</div>
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
              <div className="border-2 border-[#1a1a1a] rounded-sm bg-white shadow-[3px_3px_0_#1a1a1a] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#1a1a1a]/10">
                  <div className="flex items-center gap-2">
                    <span className="font-sketch text-base text-[#1a1a1a]">History</span>
                    {txHistoryLoading && <span className="font-handwritten text-xs text-[#1a1a1a]/30">Loading...</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setHistoryTab("received")}
                      className={`px-3 py-1 text-xs font-body font-bold rounded-sm transition-all ${historyTab === "received" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                    >
                      Received
                    </button>
                    <button
                      onClick={() => setHistoryTab("sent")}
                      className={`px-3 py-1 text-xs font-body font-bold rounded-sm transition-all ${historyTab === "sent" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
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
                          <p className="font-handwritten text-sm text-[#1a1a1a]/30">
                            {historyTab === "received" ? "No received transactions yet." : "No sent transactions yet."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-[#1a1a1a]/6">
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
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF5] transition-all group"
                            >
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${tx.err ? "bg-red-100 text-red-500" : isIn === true ? "bg-green-100 text-green-600" : "bg-[#F7931A]/10 text-[#F7931A]"}`}
                              >
                                {tx.err ? "!" : isIn === true ? "↓" : "↑"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-xs text-[#1a1a1a]/60 truncate">{tx.sig.slice(0, 20)}...</div>
                                <div className="font-handwritten text-xs text-[#1a1a1a]/35 mt-0.5">{date}</div>
                              </div>
                              {amt && (
                                <span className="font-body font-bold text-sm text-[#1a1a1a] flex-shrink-0 tabular-nums">
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
                              className="w-full py-2.5 border-2 border-[#1a1a1a]/20 rounded-sm font-body font-bold text-xs text-[#1a1a1a]/50 hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-all disabled:opacity-30"
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
