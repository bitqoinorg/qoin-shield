import { Router } from "express";
import { saveQoinVault, findQoinVaultByKeys, findQoinVaultByAnyKey } from "../lib/db";
import { logger } from "../lib/logger";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createInitializeMultisigInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  MULTISIG_SIZE,
} from "@solana/spl-token";
import bs58 from "bs58";

const router = Router();

function getHeliusRpc(): string {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) throw new Error("HELIUS_API_KEY not configured.");
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

const KNOWN_MINTS = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
  "Ce2gx9KGXJ6C9Mp5b5x1sn9Mg87JwEbrQby4Zqo3pump",
  "5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2",
  "Cm6fNnMk7NfzStP9CZpsQA2v3jjzbcYGAxdJySmHpump",
] as const;

type TokenMeta = { mint: string; name: string; symbol: string; image: string };
const tokenMetaCache = new Map<string, TokenMeta>();
const META_CACHE_TTL = 6 * 60 * 60 * 1000;
let metaCacheTs = 0;

tokenMetaCache.set("__sol__", {
  mint: "__sol__",
  name: "Solana",
  symbol: "SOL",
  image: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
});
tokenMetaCache.set("So11111111111111111111111111111111111111112", {
  mint: "So11111111111111111111111111111111111111112",
  name: "Solana",
  symbol: "SOL",
  image: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
});

async function batchFetchMeta(mints: string[]): Promise<void> {
  if (!mints.length) return;
  try {
    const rpc = getHeliusRpc();
    const r = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "batch-meta",
        method: "getAssetBatch",
        params: { ids: mints },
      }),
    });
    if (!r.ok) return;
    const data = await r.json() as { result?: Array<{ id: string; content?: { metadata?: { name?: string; symbol?: string }; links?: { image?: string } } }> };
    for (const asset of data.result ?? []) {
      if (!asset?.id) continue;
      tokenMetaCache.set(asset.id, {
        mint: asset.id,
        name: asset.content?.metadata?.name ?? asset.id.slice(0, 6),
        symbol: asset.content?.metadata?.symbol ?? "???",
        image: asset.content?.links?.image ?? "",
      });
    }
  } catch { /* silent */ }
}

async function prefetchKnownTokenMeta(): Promise<void> {
  await batchFetchMeta([...KNOWN_MINTS]);
  metaCacheTs = Date.now();
}

prefetchKnownTokenMeta().catch(() => {});

function getHeliusApiKey(): string {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) throw new Error("HELIUS_API_KEY not configured.");
  return key;
}

function getPlatformPayer(): Keypair {
  const key = process.env["PLATFORM_PAYER_KEY"];
  if (!key) throw new Error("PLATFORM_PAYER_KEY not configured.");
  return Keypair.fromSecretKey(bs58.decode(key.trim()));
}

router.post("/qoin/create", async (req, res) => {
  try {
    const { pk1PublicKey, pk2PublicKey, network } = req.body as {
      pk1PublicKey: string;
      pk2PublicKey: string;
      network: "devnet" | "mainnet";
    };

    if (!pk1PublicKey || !pk2PublicKey) {
      res.status(400).json({ error: "pk1PublicKey and pk2PublicKey required." });
      return;
    }

    const connection = new Connection(getHeliusRpc(), "confirmed");

    const payer = getPlatformPayer();
    const kp1Pub = new PublicKey(pk1PublicKey);
    const kp2Pub = new PublicKey(pk2PublicKey);

    const multisigKeypair = Keypair.generate();
    const minimumBalance = await connection.getMinimumBalanceForRentExemption(MULTISIG_SIZE);
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payer.publicKey });
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: multisigKeypair.publicKey,
        space: MULTISIG_SIZE,
        lamports: minimumBalance,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMultisigInstruction(
        multisigKeypair.publicKey,
        [kp1Pub, kp2Pub],
        2,
        TOKEN_PROGRAM_ID
      )
    );

    tx.sign(payer, multisigKeypair);
    const rawTx = tx.serialize();
    const signature = await connection.sendRawTransaction(rawTx);
    await connection.confirmTransaction(signature, "confirmed");

    const qoinAddress = multisigKeypair.publicKey.toBase58();

    // Persist mapping permanently to database (public keys only, no private keys)
    try {
      await saveQoinVault(pk1PublicKey, pk2PublicKey, qoinAddress);
      logger.info({ qoinAddress }, "qoin vault saved to db");
    } catch (dbErr) {
      logger.error({ err: dbErr }, "db save failed for new qoin vault");
    }

    res.json({ multisigAddress: qoinAddress, signature });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/balance", async (req, res) => {
  try {
    const { address } = req.query as { address: string };
    if (!address) { res.status(400).json({ error: "address required." }); return; }
    const apiKey = getHeliusApiKey();
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

    type ParsedTokenAccount = {
      pubkey: string;
      account: {
        data: {
          parsed: {
            info: {
              mint: string;
              owner: string;
              state: string;
              tokenAmount: { amount: string; decimals: number; uiAmount: number | null };
            };
          };
        };
      };
    };

    // Fetch token accounts from both programs + native SOL balance in parallel
    const [tok1Res, tok2Res, solRes] = await Promise.all([
      fetch(rpcUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "tok1", method: "getTokenAccountsByOwner", params: [address, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }] }),
      }),
      fetch(rpcUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "tok2", method: "getTokenAccountsByOwner", params: [address, { programId: TOKEN_2022_PROGRAM }, { encoding: "jsonParsed" }] }),
      }),
      fetch(rpcUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "sol", method: "getBalance", params: [address] }),
      }),
    ]);

    const [tok1Data, tok2Data, solData] = await Promise.all([
      tok1Res.json() as Promise<{ result?: { value: ParsedTokenAccount[] } }>,
      tok2Res.json() as Promise<{ result?: { value: ParsedTokenAccount[] } }>,
      solRes.json() as Promise<{ result?: { value: number } }>,
    ]);

    const solBalance = (solData.result?.value ?? 0) / LAMPORTS_PER_SOL;

    // Merge both token program results, keep only positive balances
    const allAccounts = [
      ...(tok1Data.result?.value ?? []),
      ...(tok2Data.result?.value ?? []),
    ].filter((item) => (item.account.data.parsed.info.tokenAmount.uiAmount ?? 0) > 0);

    if (allAccounts.length === 0) {
      res.set("Cache-Control", "no-store");
      res.json({ solBalance, tokens: [] });
      return;
    }

    // Fetch metadata for all mints in one batch DAS call
    const mints = allAccounts.map((item) => item.account.data.parsed.info.mint);

    type AssetMeta = {
      id: string;
      content?: { metadata?: { name?: string; symbol?: string }; links?: { image?: string } };
      token_info?: { price_info?: { price_per_token?: number } };
    };

    let assetMap = new Map<string, AssetMeta>();
    try {
      const batchRes = await fetch(rpcUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "batch", method: "getAssetBatch", params: { ids: mints } }),
      });
      const batchData = await batchRes.json() as { result?: AssetMeta[] };
      for (const asset of batchData.result ?? []) {
        if (asset?.id) assetMap.set(asset.id, asset);
      }
    } catch { /* metadata is best-effort; proceed without it */ }

    const tokens = allAccounts.map((item) => {
      const info = item.account.data.parsed.info;
      const meta = assetMap.get(info.mint);
      return {
        mint: info.mint,
        name: meta?.content?.metadata?.name ?? null,
        symbol: meta?.content?.metadata?.symbol ?? null,
        logo: meta?.content?.links?.image ?? null,
        balance: info.tokenAmount.uiAmount ?? 0,
        rawBalance: parseInt(info.tokenAmount.amount, 10),
        decimals: info.tokenAmount.decimals,
        tokenAccount: item.pubkey,
        pricePerToken: meta?.token_info?.price_info?.price_per_token ?? null,
        isNft: false,
      };
    });

    res.set("Cache-Control", "no-store");
    res.json({ solBalance, tokens });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/blockhash", async (req, res) => {
  try {
    const connection = new Connection(getHeliusRpc(), "confirmed");
    const { blockhash } = await connection.getLatestBlockhash();
    res.json({ blockhash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/multisig-signers", async (req, res) => {
  try {
    const { address } = req.query as { address: string };
    if (!address) { res.status(400).json({ error: "address required." }); return; }
    const connection = new Connection(getHeliusRpc(), "confirmed");
    const info = await connection.getAccountInfo(new PublicKey(address));
    if (!info) { res.status(404).json({ error: "Account not found." }); return; }
    const data = info.data;
    // SPL Token multisig layout: byte0=m, byte1=n, byte2=is_initialized, bytes3+: signers (32 bytes each, max 11)
    if (data.length < 355) { res.status(400).json({ error: "Not a multisig account." }); return; }
    const n = data[1];
    const signers: string[] = [];
    for (let i = 0; i < n && i < 11; i++) {
      const start = 3 + i * 32;
      const keyBytes = data.slice(start, start + 32);
      signers.push(new PublicKey(keyBytes).toBase58());
    }
    res.json({ m: data[0], n, signers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Find Qoin vault by one OR two signer pubkeys — DB first, on-chain fallback (two-key only)
router.get("/qoin/find-vault", async (req, res) => {
  try {
    const { key1, key2 } = req.query as { key1?: string; key2?: string };
    if (!key1) { res.status(400).json({ error: "key1 required." }); return; }

    // ── Single-key lookup (DB only) ────────────────────────────────────────────
    if (!key2) {
      try {
        const dbResult = await findQoinVaultByAnyKey(key1);
        if (dbResult) {
          res.json({ vaults: [dbResult], source: "db" });
        } else {
          res.json({ vaults: [], source: "db" });
        }
      } catch {
        res.json({ vaults: [], source: "db_error" });
      }
      return;
    }

    // ── Two-key lookup: DB first, on-chain fallback ────────────────────────────
    try {
      const dbResult = await findQoinVaultByKeys(key1, key2);
      if (dbResult) {
        res.json({ vaults: [dbResult], source: "db" });
        return;
      }
    } catch {
      // DB unavailable — fall through to on-chain scan
    }

    const pk1 = new PublicKey(key1);
    const pk2 = new PublicKey(key2);
    const connection = new Connection(getHeliusRpc(), "confirmed");

    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: MULTISIG_SIZE },
        { memcmp: { offset: 3, bytes: pk1.toBase58() } },
      ],
    });

    const results: string[] = [];
    for (const { pubkey, account } of accounts) {
      const data = account.data;
      const n = data[1];
      for (let i = 0; i < n && i < 11; i++) {
        const start = 3 + i * 32;
        const signer = new PublicKey(data.slice(start, start + 32)).toBase58();
        if (signer === pk2.toBase58()) {
          results.push(pubkey.toBase58());
          try { await saveQoinVault(key1, key2, pubkey.toBase58()); logger.info({ qoinAddress: pubkey.toBase58() }, "qoin vault saved to db via find-vault"); } catch (dbErr) { logger.error({ err: dbErr }, "db save failed in find-vault"); }
          break;
        }
      }
    }

    res.json({ vaults: results, source: "onchain" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/account", async (req, res) => {
  try {
    const { address } = req.query as { address: string };
    if (!address) { res.status(400).json({ error: "address required." }); return; }
    const connection = new Connection(getHeliusRpc(), "confirmed");
    const info = await connection.getAccountInfo(new PublicKey(address));
    res.json({ exists: info !== null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/platform-pubkey", (_req, res) => {
  try {
    const payer = getPlatformPayer();
    res.json({ publicKey: payer.publicKey.toBase58() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.post("/qoin/broadcast", async (req, res) => {
  try {
    const { transaction } = req.body as { transaction: number[] };
    if (!transaction) { res.status(400).json({ error: "transaction required." }); return; }
    const connection = new Connection(getHeliusRpc(), "confirmed");
    const payer = getPlatformPayer();
    const tx = Transaction.from(Buffer.from(transaction));
    tx.partialSign(payer);
    const rawTx = tx.serialize();
    const signature = await connection.sendRawTransaction(rawTx);
    await connection.confirmTransaction(signature, "confirmed");
    res.json({ signature });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.post("/qoin/create-token-account", async (req, res) => {
  try {
    const { multisigAddress, mintAddress } = req.body as {
      multisigAddress: string;
      mintAddress: string;
    };

    if (!multisigAddress || !mintAddress) {
      res.status(400).json({ error: "multisigAddress and mintAddress required." });
      return;
    }

    const connection = new Connection(getHeliusRpc(), "confirmed");
    const payer = getPlatformPayer();
    const multisigPubkey = new PublicKey(multisigAddress);
    const mintPubkey = new PublicKey(mintAddress);

    const ataAddress = await getAssociatedTokenAddress(mintPubkey, multisigPubkey, true);

    // If already exists, just return it
    try {
      await getAccount(connection, ataAddress);
      res.json({ tokenAccountAddress: ataAddress.toBase58(), signature: null });
      return;
    } catch {
      // Doesn't exist create it
    }

    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payer.publicKey });
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ataAddress,
        multisigPubkey,
        mintPubkey
      )
    );

    tx.sign(payer);
    const rawTx = tx.serialize();
    const signature = await connection.sendRawTransaction(rawTx);
    await connection.confirmTransaction(signature, "confirmed");

    res.json({ tokenAccountAddress: ataAddress.toBase58(), signature });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/token-meta", async (req, res) => {
  try {
    const mintsParam = (req.query["mints"] as string) || "";
    const mints = mintsParam.split(",").map((m) => m.trim()).filter(Boolean);
    if (!mints.length) return res.json([]);

    if (Date.now() - metaCacheTs > META_CACHE_TTL) {
      await prefetchKnownTokenMeta();
    }

    const missing = mints.filter(m => !tokenMetaCache.has(m));
    if (missing.length > 0) {
      await batchFetchMeta(missing);
      for (const m of missing) {
        if (!tokenMetaCache.has(m)) {
          tokenMetaCache.set(m, { mint: m, name: m.slice(0, 6), symbol: "???", image: "" });
        }
      }
    }

    const results = mints.map(m => tokenMetaCache.get(m) ?? { mint: m, name: m.slice(0, 6), symbol: "???", image: "" });
    res.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/tx-history", async (req, res) => {
  try {
    const address = (req.query["address"] as string) ?? "";
    const owner = (req.query["owner"] as string) ?? "";
    const mintFilter = (req.query["mint"] as string) ?? "";
    const limit = Math.min(parseInt((req.query["limit"] as string) ?? "10", 10) || 10, 20);
    if (!address) return res.json([]);

    const before = (req.query["before"] as string) ?? "";
    const apiKey = getHeliusApiKey();
    const beforeParam = before ? `&before=${encodeURIComponent(before)}` : "";

    type HeliusTx = {
      signature: string;
      timestamp: number;
      type: string;
      tokenTransfers?: Array<{ mint: string; fromUserAccount?: string; toUserAccount?: string; fromTokenAccount?: string; toTokenAccount?: string; tokenAmount: number }>;
      nativeTransfers?: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
      feePayer?: string;
      err?: unknown;
    };

    const fetchTxs = async (addr: string, typeFilter?: string): Promise<HeliusTx[]> => {
      const typeParam = typeFilter ? `&type=${typeFilter}` : "";
      const url = `https://api.helius.xyz/v0/addresses/${addr}/transactions?api-key=${apiKey}&limit=${limit}${typeParam}${beforeParam}`;
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data as HeliusTx[] : [];
    };

    let txs: HeliusTx[];

    if (mintFilter && owner && owner !== address) {
      const [ataTxs, ownerTxs] = await Promise.all([
        fetchTxs(address),
        fetchTxs(owner),
      ]);
      const seen = new Set<string>();
      const merged: HeliusTx[] = [];
      for (const tx of [...ataTxs, ...ownerTxs]) {
        if (!seen.has(tx.signature)) {
          seen.add(tx.signature);
          merged.push(tx);
        }
      }
      merged.sort((a, b) => b.timestamp - a.timestamp);
      txs = merged.slice(0, limit);
    } else {
      txs = await fetchTxs(address, "TRANSFER");
    }

    let results = txs.map(tx => ({
      sig: tx.signature,
      ts: tx.timestamp,
      type: tx.type,
      tokenTransfers: (tx.tokenTransfers ?? []).map(t => ({
        mint: t.mint,
        from: t.fromUserAccount ?? "",
        to: t.toUserAccount ?? "",
        fromAccount: t.fromTokenAccount ?? "",
        toAccount: t.toTokenAccount ?? "",
        amount: t.tokenAmount,
      })),
      nativeTransfers: (tx.nativeTransfers ?? []).map(t => ({
        from: t.fromUserAccount,
        to: t.toUserAccount,
        lamports: t.amount,
      })),
      err: tx.err ?? null,
    }));

    if (mintFilter) {
      results = results.filter(tx =>
        tx.tokenTransfers.some(t => t.mint === mintFilter)
      );
    }

    res.setHeader("Cache-Control", "no-store");
    res.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/qoin/dex-price", async (req, res) => {
  try {
    const mintsParam = (req.query["mints"] as string) ?? "";
    const mints = mintsParam.split(",").map(m => m.trim()).filter(Boolean).slice(0, 30);
    if (mints.length === 0) return res.json({});

    const solMints = mints.map(m => m === "__sol__" ? "So11111111111111111111111111111111111111112" : m);
    const url = `https://api.dexscreener.com/latest/dex/tokens/${solMints.join(",")}`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) return res.json({});
    const data = await r.json() as { pairs?: Array<{ baseToken: { address: string; symbol: string }; priceUsd?: string; priceChange?: { h24?: number }; volume?: { h24?: number }; fdv?: number }> };
    const pairs = data.pairs ?? [];

    const result: Record<string, { price: number; change24h: number | null; volume24h: number | null; fdv: number | null }> = {};
    for (const mint of mints) {
      const addr = mint === "__sol__" ? "So11111111111111111111111111111111111111112" : mint;
      const best = pairs.filter(p => p.baseToken.address.toLowerCase() === addr.toLowerCase())
        .sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0];
      if (best && best.priceUsd) {
        const key = mint === "So11111111111111111111111111111111111111112" ? "__sol__" : mint;
        result[mint] = {
          price: parseFloat(best.priceUsd),
          change24h: best.priceChange?.h24 ?? null,
          volume24h: best.volume?.h24 ?? null,
          fdv: best.fdv ?? null,
        };
      }
    }
    res.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

const MINT_TO_COINGECKO: Record<string, string> = {
  "__sol__":                                          "solana",
  "So11111111111111111111111111111111111111112":       "solana",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v":   "usd-coin",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263":   "bonk",
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump":   "fartcoin",
};

const chartCache = new Map<string, { data: { prices: { time: number; price: number }[]; change24h: number | null }; ts: number }>();
const CHART_CACHE_TTL = 10 * 60 * 1000;

type ChartResult = { prices: { time: number; price: number }[]; change24h: number | null };

function calcChange24h(prices: { time: number; price: number }[]): number | null {
  if (prices.length < 2) return null;
  const prev = prices[prices.length - 2].price;
  const last = prices[prices.length - 1].price;
  return ((last - prev) / prev) * 100;
}

async function fetchFromDexScreenerChart(mint: string): Promise<ChartResult | null> {
  try {
    const solMint = mint === "__sol__" ? "So11111111111111111111111111111111111111112" : mint;
    const url = `https://api.dexscreener.com/latest/dex/tokens/${solMint}`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) return null;
    const data = await r.json() as {
      pairs?: Array<{
        priceUsd?: string;
        priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
        volume?: { h24?: number };
      }>
    };
    const pairs = data.pairs ?? [];
    const best = pairs.sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0];
    if (!best?.priceUsd) return null;

    const now = Date.now();
    const current = parseFloat(best.priceUsd);
    const pc = best.priceChange ?? {};

    const pointAt = (msAgo: number, changePct: number | undefined) => ({
      time: now - msAgo,
      price: changePct != null ? current / (1 + changePct / 100) : current,
    });

    const prices = [
      pointAt(7 * 86400000, undefined),
      pointAt(6 * 86400000, undefined),
      pointAt(5 * 86400000, undefined),
      pointAt(4 * 86400000, undefined),
      pointAt(3 * 86400000, undefined),
      pointAt(24 * 3600000, pc.h24),
      pointAt(6 * 3600000, pc.h6),
      pointAt(1 * 3600000, pc.h1),
      pointAt(5 * 60000,   pc.m5),
      { time: now, price: current },
    ];

    return { prices, change24h: pc.h24 ?? null };
  } catch {
    return null;
  }
}

router.get("/qoin/price-chart", async (req, res) => {
  try {
    const mint = (req.query["mint"] as string) ?? "";
    const days = parseInt((req.query["days"] as string) ?? "7", 10) || 7;
    if (!mint) return res.json({ prices: [], change24h: null });

    const cacheKey = `${mint}-${days}`;
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CHART_CACHE_TTL) {
      return res.json(cached.data);
    }

    let result: ChartResult | null = null;

    const cgId = MINT_TO_COINGECKO[mint];
    if (cgId) {
      try {
        const url = `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
        const r = await fetch(url, { headers: { "Accept": "application/json" } });
        if (r.ok) {
          const raw = await r.json() as { prices?: [number, number][] };
          const prices = (raw.prices ?? []).map(([time, price]) => ({ time, price }));
          if (prices.length > 0) {
            result = { prices, change24h: calcChange24h(prices) };
          }
        }
      } catch { /* fall through */ }
    }

    if (!result) {
      result = await fetchFromDexScreenerChart(mint);
    }

    if (!result) {
      if (cached) return res.json(cached.data);
      return res.json({ prices: [], change24h: null });
    }

    chartCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

export default router;
