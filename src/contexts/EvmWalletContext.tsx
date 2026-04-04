import { createContext, useContext, useState, useCallback, ReactNode } from "react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

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
}

const EvmWalletContext = createContext<EvmWalletState | null>(null);

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  const [evmAddress1, setEvmAddress1] = useState<string | null>(null);
  const [evmAddress2, setEvmAddress2] = useState<string | null>(null);
  const [connecting1, setConnecting1] = useState(false);
  const [connecting2, setConnecting2] = useState(false);
  const [error1, setError1] = useState("");
  const [error2, setError2] = useState("");

  const connectK1 = useCallback(async () => {
    if (!window.ethereum) {
      setError1("MetaMask not detected. Install MetaMask to continue.");
      return;
    }
    setError1("");
    setConnecting1(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (accounts && accounts.length > 0) {
        setEvmAddress1(accounts[0]);
      } else {
        setError1("No accounts returned from MetaMask.");
      }
    } catch (e: unknown) {
      setError1(e instanceof Error ? e.message : "MetaMask connection failed.");
    } finally {
      setConnecting1(false);
    }
  }, []);

  const connectK2 = useCallback(async () => {
    if (!window.ethereum) {
      setError2("MetaMask not detected. Install MetaMask to continue.");
      return;
    }
    setError2("");
    setConnecting2(true);
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
      if (accounts && accounts.length > 0) {
        setEvmAddress2(accounts[0]);
      } else {
        setError2("No account returned from MetaMask.");
      }
    } catch (e: unknown) {
      setError2(e instanceof Error ? e.message : "MetaMask connection failed.");
    } finally {
      setConnecting2(false);
    }
  }, []);

  const disconnectK1 = useCallback(() => {
    setEvmAddress1(null);
    setError1("");
  }, []);

  const disconnectK2 = useCallback(() => {
    setEvmAddress2(null);
    setError2("");
  }, []);

  const signTypedDataK1 = useCallback(async (typedData: object): Promise<string> => {
    if (!window.ethereum) throw new Error("MetaMask not detected");
    if (!evmAddress1) throw new Error("K1 not connected");
    const sig = await window.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [evmAddress1, JSON.stringify(typedData)],
    });
    return sig as string;
  }, [evmAddress1]);

  const signTypedDataK2 = useCallback(async (typedData: object): Promise<string> => {
    if (!window.ethereum) throw new Error("MetaMask not detected");
    if (!evmAddress2) throw new Error("K2 not connected");
    const sig = await window.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [evmAddress2, JSON.stringify(typedData)],
    });
    return sig as string;
  }, [evmAddress2]);

  return (
    <EvmWalletContext.Provider value={{
      evmAddress1,
      evmAddress2,
      connecting1,
      connecting2,
      error1,
      error2,
      connectK1,
      connectK2,
      disconnectK1,
      disconnectK2,
      signTypedDataK1,
      signTypedDataK2,
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
