/**
 * Local vault store: associates public keys with their Qonjoint vault address.
 * On vault creation, we store pk1pubkey → vaultAddress and pk2pubkey → vaultAddress.
 * On access, entering pk1 or pk2 allows auto-discovery of the vault address.
 */

const STORE_KEY = "bitQoin_vaults";

interface VaultEntry {
  vaultAddress: string;
  network: "devnet" | "mainnet";
  createdAt: number;
}

type VaultStore = Record<string, VaultEntry>;

function load(): VaultStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as VaultStore) : {};
  } catch {
    return {};
  }
}

function save(store: VaultStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // localStorage may not be available (e.g. private browsing)
  }
}

export function saveVaultAssociation(
  pk1PublicKey: string,
  pk2PublicKey: string,
  vaultAddress: string,
  network: "devnet" | "mainnet"
): void {
  const store = load();
  const entry: VaultEntry = { vaultAddress, network, createdAt: Date.now() };
  store[pk1PublicKey] = entry;
  store[pk2PublicKey] = entry;
  save(store);
}

export function lookupVaultByPublicKey(
  publicKey: string
): VaultEntry | null {
  const store = load();
  return store[publicKey] ?? null;
}

export function listStoredVaults(): Array<VaultEntry & { publicKey: string }> {
  const store = load();
  const seen = new Set<string>();
  return Object.entries(store)
    .filter(([, entry]) => {
      if (seen.has(entry.vaultAddress)) return false;
      seen.add(entry.vaultAddress);
      return true;
    })
    .map(([publicKey, entry]) => ({ publicKey, ...entry }));
}

export function clearVaultStore(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
}

// ── Token deposit address storage ─────────────────────────────────────────────

const DEPOSIT_STORE_KEY = "bitQoin_deposit_addresses";

export interface TokenDeposit {
  mintAddress: string;
  depositAddress: string;
  createdAt: number;
}

type DepositStore = Record<string, TokenDeposit[]>;

function loadDeposits(): DepositStore {
  try {
    const raw = localStorage.getItem(DEPOSIT_STORE_KEY);
    return raw ? (JSON.parse(raw) as DepositStore) : {};
  } catch {
    return {};
  }
}

function saveDepositStore(store: DepositStore): void {
  try {
    localStorage.setItem(DEPOSIT_STORE_KEY, JSON.stringify(store));
  } catch {}
}

export function saveTokenDeposit(
  vaultAddress: string,
  mintAddress: string,
  depositAddress: string
): void {
  const store = loadDeposits();
  const existing = store[vaultAddress] ?? [];
  const filtered = existing.filter((d) => d.mintAddress !== mintAddress);
  filtered.unshift({ mintAddress, depositAddress, createdAt: Date.now() });
  store[vaultAddress] = filtered;
  saveDepositStore(store);
}

export function getTokenDeposits(vaultAddress: string): TokenDeposit[] {
  const store = loadDeposits();
  return store[vaultAddress] ?? [];
}

// ── EVM vault storage ──────────────────────────────────────────────────────────

const EVM_STORE_KEY = "bitQoin_evm_vaults";

interface EvmVaultEntry {
  vaultAddress: string;
  k1Address: string;
  k2Address: string;
  createdAt: number;
}

type EvmVaultStore = Record<string, EvmVaultEntry>;

function loadEvmVaults(): EvmVaultStore {
  try {
    const raw = localStorage.getItem(EVM_STORE_KEY);
    return raw ? (JSON.parse(raw) as EvmVaultStore) : {};
  } catch {
    return {};
  }
}

function saveEvmVaultStore(store: EvmVaultStore): void {
  try {
    localStorage.setItem(EVM_STORE_KEY, JSON.stringify(store));
  } catch {}
}

export function saveEvmVaultAssociation(
  k1Address: string,
  k2Address: string,
  vaultAddress: string,
): void {
  const store = loadEvmVaults();
  const entry: EvmVaultEntry = {
    vaultAddress,
    k1Address: k1Address.toLowerCase(),
    k2Address: k2Address.toLowerCase(),
    createdAt: Date.now(),
  };
  store[k1Address.toLowerCase()] = entry;
  store[k2Address.toLowerCase()] = entry;
  saveEvmVaultStore(store);
}

export function lookupEvmVaultByAddress(evmAddress: string): EvmVaultEntry | null {
  const store = loadEvmVaults();
  return store[evmAddress.toLowerCase()] ?? null;
}
