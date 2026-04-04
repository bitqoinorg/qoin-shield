import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { getAddress } from "ethers";

// ── EIP-6963 types ────────────────────────────────────────────────────────────
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}
interface EIP6963Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  selectedAddress?: string | null;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}
interface EIP6963AnnounceEvent extends Event {
  detail: { info: EIP6963ProviderInfo; provider: EIP6963Provider };
}

// MetaMask's official reverse-DNS identifier
const METAMASK_RDNS = "io.metamask";

// ── EIP-6963 discovery ────────────────────────────────────────────────────────
function discoverMetaMask(): Promise<EIP6963Provider> {
  return new Promise((resolve, reject) => {
    const found: EIP6963Provider[] = [];

    const handler = (e: Event) => {
      const ev = e as EIP6963AnnounceEvent;
      if (ev.detail?.info?.rdns === METAMASK_RDNS) {
        found.push(ev.detail.provider);
      }
    };

    window.addEventListener("eip6963:announceProvider", handler as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Give wallets 300 ms to announce themselves
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", handler as EventListener);
      if (found.length > 0) resolve(found[0]);
      else reject(new Error("MetaMask not found. Make sure MetaMask is installed and enabled."));
    }, 300);
  });
}

// ── Context types ─────────────────────────────────────────────────────────────
interface EvmWalletState {
  evmAddress1: string | null;
  evmAddress2: string | null;
  connecting1: boolean;
  connecting2: boolean;
  error1: string;
  error2: string;
  connectK1(): Promise<void>;
  connectK2(): Promise<void>;
  disconnectK1(): void;
  disconnectK2(): void;
  signTypedDataK1(typedData: object): Promise<string>;
  signTypedDataK2(typedData: object): Promise<string>;
  sendTransaction(params: { from: string; to: string; data: string; gas: string }): Promise<string>;
}

const EvmWalletContext = createContext<EvmWalletState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function EvmWalletProvider({ children }: { children: ReactNode }) {
  const mmRef = useRef<EIP6963Provider | null>(null);

  const [evmAddress1, setEvmAddress1] = useState<string | null>(null);
  const [evmAddress2, setEvmAddress2] = useState<string | null>(null);
  const [connecting1, setConnecting1] = useState(false);
  const [connecting2, setConnecting2] = useState(false);
  const [error1, setError1] = useState("");
  const [error2, setError2] = useState("");

  // Pre-discover MetaMask on mount so first click is instant
  useEffect(() => {
    discoverMetaMask()
      .then((p) => { mmRef.current = p; })
      .catch(() => { /* not installed yet — will retry on connect click */ });
  }, []);

  const getMetaMask = useCallback(async (): Promise<EIP6963Provider> => {
    if (mmRef.current) return mmRef.current;
    const p = await discoverMetaMask();
    mmRef.current = p;
    return p;
  }, []);

  const connectK1 = useCallback(async () => {
    setError1("");
    setConnecting1(true);
    try {
      const mm = await getMetaMask();
      await mm.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const active = mm.selectedAddress;
      if (active) {
        setEvmAddress1(getAddress(active));
      } else {
        setError1("No account selected. Please pick an account in MetaMask.");
      }
    } catch (e: unknown) {
      setError1(e instanceof Error ? e.message : "MetaMask connection failed.");
    } finally {
      setConnecting1(false);
    }
  }, [getMetaMask]);

  const connectK2 = useCallback(async () => {
    setError2("");
    setConnecting2(true);
    try {
      const mm = await getMetaMask();
      await mm.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const active = mm.selectedAddress;
      if (!active) {
        setError2("No account selected. Please pick an account in MetaMask.");
        return;
      }
      const checksummed = getAddress(active);
      if (checksummed.toLowerCase() === (evmAddress1 ?? "").toLowerCase()) {
        setError2("Key 2 must be a different account from Key 1. Switch accounts in MetaMask and try again.");
        return;
      }
      setEvmAddress2(checksummed);
    } catch (e: unknown) {
      setError2(e instanceof Error ? e.message : "MetaMask connection failed.");
    } finally {
      setConnecting2(false);
    }
  }, [evmAddress1, getMetaMask]);

  const disconnectK1 = useCallback(() => { setEvmAddress1(null); setError1(""); }, []);
  const disconnectK2 = useCallback(() => { setEvmAddress2(null); setError2(""); }, []);

  const signTypedDataK1 = useCallback(async (typedData: object): Promise<string> => {
    if (!evmAddress1) throw new Error("K1 not connected");
    const mm = await getMetaMask();
    return mm.request({ method: "eth_signTypedData_v4", params: [evmAddress1, JSON.stringify(typedData)] }) as Promise<string>;
  }, [evmAddress1, getMetaMask]);

  const signTypedDataK2 = useCallback(async (typedData: object): Promise<string> => {
    if (!evmAddress2) throw new Error("K2 not connected");
    const mm = await getMetaMask();
    return mm.request({ method: "eth_signTypedData_v4", params: [evmAddress2, JSON.stringify(typedData)] }) as Promise<string>;
  }, [evmAddress2, getMetaMask]);

  const sendTransaction = useCallback(async (params: {
    from: string; to: string; data: string; gas: string;
  }): Promise<string> => {
    const mm = await getMetaMask();
    return mm.request({ method: "eth_sendTransaction", params: [params] }) as Promise<string>;
  }, [getMetaMask]);

  return (
    <EvmWalletContext.Provider value={{
      evmAddress1, evmAddress2,
      connecting1, connecting2,
      error1, error2,
      connectK1, connectK2,
      disconnectK1, disconnectK2,
      signTypedDataK1, signTypedDataK2, sendTransaction,
    }}>
      {children}
    </EvmWalletContext.Provider>
  );
}

export function useEvmWallet() {
  const ctx = useContext(EvmWalletContext);
  if (!ctx) throw new Error("useEvmWallet must be used inside EvmWalletProvider");
  return ctx;
}
