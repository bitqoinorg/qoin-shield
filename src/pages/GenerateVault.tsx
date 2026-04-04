import { useState } from "react";
import { useLocation } from "wouter";
import {
  generateKeypair,
  explorerUrl,
} from "@/lib/solana";
import { saveVaultAssociation, saveEvmVaultAssociation } from "@/lib/vaultStore";
import {
  SketchKey, SketchTwoKeys, SketchLock,
  SketchWarning, SketchWave, SketchAtom, SketchShield
} from "@/components/sketches";
import Navbar from "@/components/Navbar";
import { useApp } from "@/contexts/AppContext";
import { useWalletPair } from "@/contexts/WalletPairContext";
import { useEvmWallet } from "@/contexts/EvmWalletContext";

type Step = "intro" | "keys" | "creating" | "done";
type CreateMode = "cold-keys" | "connect-wallets";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

const stepDefs = [
  { id: "intro", label: "Start" },
  { id: "keys", label: "Keys" },
  { id: "creating", label: "Activate" },
  { id: "done", label: "Locked" },
] as const;

function CheckSVG() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5">
      <path d="M3 8.5L6.5 12L13 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GenerateVault() {
  const [, navigate] = useLocation();
  const { t, dark, chain, setChain } = useApp();
  const stepLabels = [t.generate.step1, t.generate.step2, t.generate.step3, t.generate.step4];
  const {
    phantomPubkey, phantom2Pubkey,
    phantomConnecting, phantom2Connecting,
    phantomError, phantom2Error,
    connectPhantom, connectPhantom2,
    disconnectPhantom, disconnectPhantom2,
  } = useWalletPair();
  const {
    evmAddress1, evmAddress2,
    connecting1: evmConnecting1, connecting2: evmConnecting2,
    error1: evmError1, error2: evmError2,
    connectK1, connectK2,
    disconnectK1, disconnectK2,
  } = useEvmWallet();

  const [createMode, setCreateMode] = useState<CreateMode>("cold-keys");
  const [step, setStep] = useState<Step>("intro");
  const [pk1, setPk1] = useState<KeyPair | null>(null);
  const [pk2, setPk2] = useState<KeyPair | null>(null);
  const [shieldAddress, setShieldAddress] = useState("");
  const [txSig, setTxSig] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [keysConfirmed, setKeysConfirmed] = useState(false);
  const [evmVaultAddress, setEvmVaultAddress] = useState("");
  const [evmVaultTxHash, setEvmVaultTxHash] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [savedChecked, setSavedChecked] = useState(false);

  function handleGenerateKeys() {
    setPk1(generateKeypair());
    setPk2(generateKeypair());
    setStep("keys");
  }

  async function callCreateApi(pub1: string, pub2: string) {
    setError("");
    setStep("creating");
    try {
      const res = await fetch("/api/qoin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pk1PublicKey: pub1,
          pk2PublicKey: pub2,
          network: "mainnet",
        }),
      });
      const data = await res.json() as { multisigAddress?: string; signature?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Failed to create Qoin.");
      setShieldAddress(data.multisigAddress!);
      setTxSig(data.signature!);
      saveVaultAssociation(pub1, pub2, data.multisigAddress!, "mainnet");
      setStep("done");
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to create Qoin on-chain.");
      setStep(createMode === "connect-wallets" ? "intro" : "keys");
    }
  }

  async function handleActivateShield() {
    if (!pk1 || !pk2) return;
    await callCreateApi(pk1.publicKey, pk2.publicKey);
  }

  async function handleCreateWithWallets() {
    if (!phantomPubkey || !phantom2Pubkey) return;
    if (phantomPubkey === phantom2Pubkey) {
      setError("Key 1 and Key 2 must be different Phantom accounts.");
      return;
    }
    await callCreateApi(phantomPubkey, phantom2Pubkey);
  }

  async function handleCreateEvmVault() {
    if (!evmAddress1 || !evmAddress2) return;
    if (evmAddress1.toLowerCase() === evmAddress2.toLowerCase()) {
      setError("K1 and K2 must be different MetaMask accounts.");
      return;
    }
    setError("");
    setStep("creating");
    try {
      const res = await fetch("/api/evm/create-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k1Address: evmAddress1, k2Address: evmAddress2 }),
      });
      const data = await res.json() as { vaultAddress?: string; txHash?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Vault creation failed.");
      setEvmVaultAddress(data.vaultAddress!);
      setEvmVaultTxHash(data.txHash!);
      saveEvmVaultAssociation(evmAddress1!, evmAddress2!, data.vaultAddress!);
      setStep("done");
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to create EVM vault.");
      setStep("intro");
    }
  }

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const steps: Step[] = ["intro", "keys", "creating", "done"];
  const currentIdx = createMode === "connect-wallets"
    ? (step === "intro" ? 0 : step === "creating" ? 2 : step === "done" ? 3 : 0)
    : steps.indexOf(step);

  return (
    <div className={`min-h-screen font-body ${dark ? "bg-[#0f0f0f] text-[#FAFAF5]" : "bg-[#FAFAF5] text-[#1a1a1a]"}`}>

      <Navbar />

      {/* DARK HEADER SECTION */}
      <section className="bg-[#1a1a1a] py-14 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none opacity-30">
          <svg viewBox="0 0 1440 200" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <line x1="200" y1="40" x2="600" y2="80" stroke="white" strokeWidth="0.7" opacity="0.3"/>
            <line x1="600" y1="80" x2="1000" y2="50" stroke="white" strokeWidth="0.7" opacity="0.3"/>
            <line x1="1000" y1="50" x2="1300" y2="90" stroke="white" strokeWidth="0.7" opacity="0.3"/>
            <circle cx="200" cy="40" r="8" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.15)"/>
            <circle cx="600" cy="80" r="12" stroke="#F7931A" strokeWidth="2" fill="rgba(247,147,26,0.12)"/>
            <circle cx="1000" cy="50" r="8" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.15)"/>
            <circle cx="1300" cy="90" r="6" stroke="#F7931A" strokeWidth="1.5" fill="rgba(247,147,26,0.1)"/>
          </svg>
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-[#F7931A] text-[#F7931A] font-body font-bold text-xs px-4 py-2 mb-6 uppercase tracking-widest">
            Qonjoint Protected
          </div>
          <h1 className="font-sketch text-4xl md:text-5xl text-white mb-4">{t.generate.title}</h1>
          <p className="text-lg text-white/50 font-body">
            {t.generate.subtitle}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* CONNECTED STEPPER */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            {stepDefs.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              const skip = createMode === "connect-wallets" && i === 1 && step !== "keys";
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-sketch text-sm transition-all duration-300 ${
                      skip
                        ? "bg-white border-[#1a1a1a] border-opacity-10 text-[#1a1a1a] opacity-15"
                        : done
                        ? "bg-[#1a1a1a] border-[#1a1a1a] text-[#F7931A] shadow-[2px_2px_0_#F7931A]"
                        : active
                        ? "bg-[#F7931A] border-[#1a1a1a] text-white shadow-[3px_3px_0_#1a1a1a]"
                        : "bg-white border-[#1a1a1a] border-opacity-20 text-[#1a1a1a] opacity-30"
                    }`}>
                      {done && !skip ? <CheckSVG /> : <span>{i + 1}</span>}
                    </div>
                    <span className={`font-handwritten text-sm leading-none hidden sm:block ${
                      skip ? "text-[#1a1a1a] opacity-20"
                        : active ? "text-[#F7931A] font-bold" : done ? "text-[#1a1a1a]" : "text-[#1a1a1a] opacity-30"
                    }`}>
                      {stepLabels[i]}
                    </span>
                  </div>
                  {i < stepDefs.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-0 sm:-mt-5 transition-colors duration-500 ${
                      i < currentIdx && !(createMode === "connect-wallets" && i === 1) ? "bg-[#F7931A]" : "bg-[#1a1a1a] opacity-10"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: INTRO */}
        {step === "intro" && (
          <div className="grid md:grid-cols-2 gap-10 items-start">

            {/* Left: copy + CTA */}
            <div>
              <div className="mb-6">
                <SketchTwoKeys className="w-28 h-20 mb-5" />
                <h1 className="font-sketch text-4xl sm:text-5xl mb-4 leading-tight">Activate Quantum Shield</h1>
                <SketchWave className="w-40 mb-5" />
                <p className="text-lg text-[#1a1a1a]/60 leading-relaxed">
                  We generate independent signing keys and deploy your Qoin on-chain. All registered keys must sign every transfer. Enforced by the Solana protocol, not just this UI.
                </p>
              </div>

              {/* Mode selector */}
              <div className="mb-5">
                <div className="flex border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                  <button
                    onClick={() => { setCreateMode("cold-keys"); setError(""); }}
                    className={`flex-1 py-3 font-body font-bold text-sm transition-all ${createMode === "cold-keys" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
                  >
                    Cold Keys
                  </button>
                  <button
                    onClick={() => { setCreateMode("connect-wallets"); setError(""); }}
                    className={`flex-1 py-3 font-body font-bold text-sm transition-all border-l-2 border-[#1a1a1a] ${createMode === "connect-wallets" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/50 hover:bg-[#FAFAF5]"}`}
                  >
                    Connect Wallets
                  </button>
                </div>
              </div>

              {/* Cold Keys: inline chain selector then action */}
              {createMode === "cold-keys" && (
                <div className="space-y-4 mb-4">
                  <div>
                    <p className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest mb-2">Chain</p>
                    <div className="flex border-2 border-[#1a1a1a]/20 rounded-sm overflow-hidden text-sm font-body font-bold">
                      <button
                        onClick={() => setChain("evm")}
                        className={`flex-1 py-2.5 transition-all ${chain === "evm" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                      >
                        EVM
                      </button>
                      <button
                        onClick={() => setChain("solana")}
                        className={`flex-1 py-2.5 border-l-2 border-[#1a1a1a]/20 transition-all ${chain === "solana" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                      >
                        Solana
                      </button>
                    </div>
                  </div>
                  {chain === "evm" ? (
                    <div className="border border-dashed border-[#F7931A]/40 rounded-sm px-4 py-5 text-center space-y-2">
                      <p className="font-sketch text-base text-[#1a1a1a]">EVM Cold Keys</p>
                      <p className="font-handwritten text-sm text-[#1a1a1a]/50">
                        EVM cold-key vaults are coming soon. Switch to Connect Wallets to create an EVM vault now.
                      </p>
                    </div>
                  ) : (
                    <button onClick={handleGenerateKeys} className="btn-sketch w-full text-xl py-5">
                      {t.generate.generateBtn}
                    </button>
                  )}
                </div>
              )}

              {/* Connect Wallets mode */}
              {createMode === "connect-wallets" && (
                <div className="space-y-4 mb-4">

                  {/* Inline chain selector: EVM left, Solana right */}
                  <div>
                    <p className="font-handwritten text-xs text-[#1a1a1a]/40 uppercase tracking-widest mb-2">Chain</p>
                    <div className="flex border-2 border-[#1a1a1a]/20 rounded-sm overflow-hidden text-sm font-body font-bold">
                      <button
                        onClick={() => setChain("evm")}
                        className={`flex-1 py-2.5 transition-all ${chain === "evm" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                      >
                        EVM
                      </button>
                      <button
                        onClick={() => setChain("solana")}
                        className={`flex-1 py-2.5 border-l-2 border-[#1a1a1a]/20 transition-all ${chain === "solana" ? "bg-[#1a1a1a] text-white" : "text-[#1a1a1a]/40 hover:bg-[#FAFAF5]"}`}
                      >
                        Solana
                      </button>
                    </div>
                  </div>

                  {/* EVM connect-wallets flow */}
                  {chain === "evm" ? (
                    <div className="space-y-4">
                      <p className="font-handwritten text-sm text-[#1a1a1a]/40">
                        Connect two MetaMask accounts. The server deploys a 2-of-2 Qonjoint Vault on Ethereum. Deployment gas is covered by us.
                      </p>

                      {/* K1 */}
                      <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAF5] border-b-2 border-[#1a1a1a]">
                          <div className="flex items-center gap-2">
                            <SketchKey className="w-6 h-5 text-[#1a1a1a]" />
                            <span className="font-sketch text-base text-[#1a1a1a]">Key 1</span>
                          </div>
                          {evmAddress1 && (
                            <button onClick={disconnectK1} className="font-handwritten text-xs text-[#1a1a1a]/30 hover:text-red-500 transition-colors">disconnect</button>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          {evmAddress1 ? (
                            <div className="flex items-center gap-2">
                              <img src="/metamask-logo.png" className="w-5 h-5 rounded-lg flex-shrink-0" alt="MetaMask" />
                              <span className="font-mono text-xs text-[#1a1a1a]/60 break-all">{evmAddress1}</span>
                            </div>
                          ) : (
                            <button
                              onClick={connectK1}
                              disabled={evmConnecting1}
                              className="btn-sketch-outline w-full text-sm py-2 bg-white"
                            >
                              {evmConnecting1 ? "Connecting..." : "Connect MetaMask (K1)"}
                            </button>
                          )}
                          {evmError1 && <p className="font-handwritten text-xs text-red-500 mt-1.5">{evmError1}</p>}
                        </div>
                      </div>

                      {/* K2 */}
                      <div className="border-2 border-[#1a1a1a] rounded-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAF5] border-b-2 border-[#1a1a1a]">
                          <div className="flex items-center gap-2">
                            <SketchKey className="w-6 h-5 text-[#F7931A]" />
                            <span className="font-sketch text-base text-[#1a1a1a]">Key 2</span>
                          </div>
                          {evmAddress2 && (
                            <button onClick={disconnectK2} className="font-handwritten text-xs text-[#1a1a1a]/30 hover:text-red-500 transition-colors">disconnect</button>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          {evmAddress2 ? (
                            <div className="flex items-center gap-2">
                              <img src="/metamask-logo.png" className="w-5 h-5 rounded-lg flex-shrink-0" alt="MetaMask" />
                              <span className="font-mono text-xs text-[#1a1a1a]/60 break-all">{evmAddress2}</span>
                            </div>
                          ) : (
                            <button
                              onClick={connectK2}
                              disabled={evmConnecting2 || !evmAddress1}
                              className="btn-sketch-outline w-full text-sm py-2 bg-white disabled:opacity-30"
                            >
                              {evmConnecting2 ? "Connecting..." : "Connect MetaMask (K2)"}
                            </button>
                          )}
                          {evmError2 && <p className="font-handwritten text-xs text-red-500 mt-1.5">{evmError2}</p>}
                          {!evmAddress1 && !evmAddress2 && (
                            <p className="font-handwritten text-xs text-[#1a1a1a]/30 mt-1.5">Connect K1 first, then switch MetaMask accounts before connecting K2.</p>
                          )}
                        </div>
                      </div>

                      {evmAddress1 && evmAddress2 && evmAddress1.toLowerCase() === evmAddress2.toLowerCase() && (
                        <p className="font-handwritten text-xs text-red-500">K1 and K2 must be different accounts. Switch accounts in MetaMask before connecting K2.</p>
                      )}

                      {error && <p className="font-handwritten text-sm text-red-500">{error}</p>}

                      <button
                        onClick={handleCreateEvmVault}
                        disabled={!evmAddress1 || !evmAddress2 || evmAddress1.toLowerCase() === evmAddress2.toLowerCase()}
                        className="btn-sketch w-full text-lg py-4 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Create Qonjoint Vault
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-handwritten text-sm text-[#1a1a1a]/40">
                        Connect Phantom as Key 1, switch accounts in the extension, then connect as Key 2. Both public keys register on-chain as Qonjoint signers.
                      </p>

                      {/* Key 1 — Phantom */}
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

                      {/* Key 2 — Phantom (second account) */}
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
                            <p className="font-handwritten text-xs text-[#1a1a1a]/30 mt-1.5">Switch to your second Phantom account in the extension first.</p>
                          )}
                        </div>
                      </div>

                      {error && <p className="font-handwritten text-sm text-[#F7931A]">{error}</p>}

                      <button
                        onClick={handleCreateWithWallets}
                        disabled={!phantomPubkey || !phantom2Pubkey}
                        className="btn-sketch w-full text-xl py-5 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {!phantomPubkey || !phantom2Pubkey ? "Connect both wallets first" : "Create My Qoin"}
                      </button>
                      <p className="font-handwritten text-sm text-center text-[#1a1a1a]/30">
                        No keys generated. Your wallet pubkeys register as Qonjoint signers.
                      </p>
                    </>
                  )}
                </div>
              )}

              <p className="text-center font-handwritten text-lg text-[#1a1a1a]/50">
                Already have a Qoin?{" "}
                <button onClick={() => navigate("/qoin/open")} className="text-[#F7931A] underline underline-offset-2">
                  Open it
                </button>
              </p>
            </div>

            {/* Right: vault diagram card — unchanged */}
            <div className="sketch-card p-6">
              <div className="flex items-center justify-center gap-4 mb-5 py-3 border-b-2 border-dashed border-[#1a1a1a]/10">
                <div className="flex flex-col items-center gap-1">
                  <SketchKey className="w-12 h-8 text-[#1a1a1a]" />
                  <span className="font-handwritten text-xs text-[#1a1a1a]/50">Key 1</span>
                </div>
                <svg viewBox="0 0 60 24" fill="none" className="w-14 flex-shrink-0">
                  <path d="M2 12 L20 12" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
                  <path d="M40 12 L58 12" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
                  <circle cx="30" cy="12" r="5" stroke="#F7931A" strokeWidth="2" fill="none"/>
                  <path d="M27.5 12.5 L29.5 14.5 L33 10.5" stroke="#F7931A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="flex flex-col items-center gap-1">
                  <SketchKey className="w-12 h-8 text-[#F7931A]" />
                  <span className="font-handwritten text-xs text-[#1a1a1a]/50">Key 2</span>
                </div>
                <svg viewBox="0 0 20 40" fill="none" className="w-5 h-10 flex-shrink-0">
                  <path d="M10 2 L10 38" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
                </svg>
                <SketchLock className="w-10 h-10 flex-shrink-0 text-[#1a1a1a]" />
              </div>
              <div className="font-handwritten text-sm text-[#1a1a1a]/30 uppercase tracking-widest mb-5">What You Will Get</div>

              <div className="space-y-4 mb-6">
                {[
                  { label: "Key 1", desc: "Your first private key. Keep it secret.", color: "#1a1a1a" },
                  { label: "Key 2", desc: "Your second private key. Store it separately.", color: "#F7931A" },
                  { label: "Qoin Address", desc: "On-chain. Public. Safe to share.", color: "#1a1a1a" },
                  { label: "Deposit Address", desc: "Per-token address. Where people send tokens.", color: "#1a1a1a" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ borderColor: item.color }}>
                      <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
                        <path d="M2 5.5L4 7.5L8 3" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <span className="font-handwritten text-lg font-bold" style={{ color: item.color }}>{item.label}:</span>
                      <span className="font-body text-base text-[#1a1a1a]/60 ml-1">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-[#1a1a1a]/10 pt-4">
                <div className="flex items-center gap-3 p-3 bg-[#FAFAF5] border border-[#1a1a1a]/10 rounded-sm">
                  <SketchShield className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <div className="font-sketch text-sm">Qonjoint</div>
                    <div className="font-handwritten text-sm text-[#1a1a1a]/50">Both keys sign. Protocol enforces. No exceptions.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: KEYS (cold-keys mode only) */}
        {step === "keys" && pk1 && pk2 && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="font-sketch text-4xl mb-2">Save Both Keys First</h1>
              <p className="text-lg text-[#1a1a1a]/60">Copy and store both keys before activating. After this, we hit the blockchain.</p>
            </div>

            {error && <div className="error-sketch mb-6 font-body text-base text-[#1a1a1a]/70">{error}</div>}

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {[
                { label: "Key 1", tag: "You hold this", tagColor: "#1a1a1a", key: pk1, id: "pk1" },
                { label: "Key 2", tag: "Store separately", tagColor: "#F7931A", key: pk2, id: "pk2" },
              ].map(({ label, tag, tagColor, key, id }) => (
                <div key={id} className="overflow-hidden border-2 border-[#1a1a1a] rounded-sm shadow-[4px_4px_0_#1a1a1a] flex flex-col">
                  <div className="flex items-center justify-between px-5 py-3 bg-white border-b-2 border-[#1a1a1a]">
                    <span className="font-sketch text-xl">{label}</span>
                    <span className="font-handwritten text-sm px-2.5 py-0.5 border rounded-sm" style={{ color: tagColor, borderColor: tagColor }}>{tag}</span>
                  </div>

                  <div className="px-5 py-4 bg-[#FAFAF5] border-b border-dashed border-[#1a1a1a]/10">
                    <div className="font-handwritten text-xs text-[#1a1a1a]/30 uppercase tracking-widest mb-1.5">Public Key (safe to share)</div>
                    <div className="font-mono text-xs text-[#1a1a1a]/40 break-all leading-relaxed">{key.publicKey}</div>
                  </div>

                  <div className="px-5 py-4 bg-[#FAFAF5] flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SketchWarning className="w-4 h-4 flex-shrink-0" />
                      <div className="font-handwritten text-xs text-[#F7931A] uppercase tracking-widest">Private Key. Save This Now.</div>
                    </div>
                    <div className="font-mono text-sm text-[#1a1a1a] break-all leading-relaxed mb-3 p-2.5 bg-white border border-[#F7931A] rounded-sm flex-1">{key.privateKey}</div>
                    <button
                      onClick={() => copyText(key.privateKey, id)}
                      className={`w-full py-2.5 text-base font-sketch border-2 border-[#1a1a1a] rounded-sm transition-all ${
                        copied === id
                          ? "bg-[#1a1a1a] text-white shadow-none translate-x-0.5 translate-y-0.5"
                          : "bg-[#F7931A] text-white shadow-[3px_3px_0_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a]"
                      }`}
                    >
                      {copied === id ? "Copied!" : `Copy ${label} Private Key`}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-[#F7931A] bg-[#FAFAF5] rounded-sm shadow-[4px_4px_0_#F7931A] mb-6 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F7931A] border-opacity-30 bg-[#F7931A]">
                <span className="flex-shrink-0" style={{ filter: "brightness(10)" }}><SketchWarning className="w-6 h-6" /></span>
                <span className="font-sketch text-lg text-white">Before You Continue</span>
              </div>
              <label className="flex items-start gap-4 px-5 py-4 cursor-pointer">
                <div className={`mt-0.5 w-6 h-6 flex-shrink-0 border-2 rounded-sm flex items-center justify-center transition-all ${
                  keysConfirmed ? "bg-[#F7931A] border-[#F7931A]" : "bg-white border-[#F7931A]"
                }`}>
                  {keysConfirmed && (
                    <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={keysConfirmed}
                  onChange={(e) => setKeysConfirmed(e.target.checked)}
                  className="sr-only"
                />
                <span className="font-body text-base text-[#1a1a1a]/60 leading-relaxed">
                  {t.generate.confirmed}
                </span>
              </label>
            </div>

            <button
              onClick={handleActivateShield}
              disabled={!keysConfirmed}
              className="btn-sketch w-full text-xl py-5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t.generate.activateBtn}
            </button>
          </div>
        )}

        {/* STEP 3: CREATING */}
        {step === "creating" && (
          <div className="max-w-md mx-auto">
            <div className="sketch-card p-10 text-center border-[#F7931A] shadow-[6px_6px_0_#F7931A]" style={{ borderColor: "#F7931A" }}>
              <div className="w-24 h-24 mx-auto mb-6 animate-spin" style={{ animationDuration: "3s" }}>
                <SketchAtom className="w-full h-full" />
              </div>
              <h2 className="font-sketch text-3xl mb-3">{t.generate.activating}</h2>
              <div className="space-y-2">
                <p className="font-handwritten text-xl text-[#1a1a1a]/50">{t.generate.successSub}</p>
                <p className="font-handwritten text-base text-[#1a1a1a]/25">{t.generate.fundNote}</p>
              </div>
              <div className="flex justify-center gap-1.5 mt-6">
                <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DONE */}
        {step === "done" && (
          <div className="max-w-7xl mx-auto">

            {/* SAVE NOW NOTICE */}
            <div className="mb-8 border-2 border-[#1a1a1a] bg-[#fff8f0] rounded-sm shadow-[5px_5px_0_#1a1a1a] overflow-hidden">
              <div className="bg-[#1a1a1a] px-5 py-3 flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0 text-[#F7931A]"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-sketch text-base text-[#F7931A] tracking-wide">Save These Now. We Cannot Help You Recover.</span>
              </div>
              <div className="px-5 py-5">
                <p className="font-body text-sm text-[#1a1a1a]/70 mb-4">
                  Zero server access. Zero recovery. Zero exceptions. If you lose any of the items below, your Qoin is gone forever. No support ticket, no recovery phrase, no way back.
                </p>
                <div className="space-y-2 mb-5">
                  {createMode === "cold-keys" ? (
                    <>
                      <div className="flex items-center gap-3 bg-white border border-[#1a1a1a]/10 rounded-sm px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#F7931A] flex-shrink-0" />
                        <span className="font-body font-semibold text-sm text-[#1a1a1a]">Key 1 private key</span>
                        <span className="ml-auto font-body text-xs text-[#1a1a1a]/40">shown below</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-[#1a1a1a]/10 rounded-sm px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#F7931A] flex-shrink-0" />
                        <span className="font-body font-semibold text-sm text-[#1a1a1a]">Key 2 private key</span>
                        <span className="ml-auto font-body text-xs text-[#1a1a1a]/40">shown below</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-[#1a1a1a]/10 rounded-sm px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#F7931A] flex-shrink-0" />
                        <span className="font-body font-semibold text-sm text-[#1a1a1a]">Your Qoin address</span>
                        <span className="ml-auto font-body text-xs text-[#1a1a1a]/40">shown below</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 bg-white border border-[#1a1a1a]/10 rounded-sm px-4 py-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#F7931A] flex-shrink-0" />
                      <span className="font-body font-semibold text-sm text-[#1a1a1a]">Your Qoin address</span>
                      <span className="ml-auto font-body text-xs text-[#1a1a1a]/40">shown below</span>
                    </div>
                  )}
                </div>
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={savedChecked}
                    onChange={e => setSavedChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-[#F7931A] flex-shrink-0 cursor-pointer"
                  />
                  <span className="font-body text-sm font-semibold text-[#1a1a1a] group-hover:text-[#F7931A] transition-colors">
                    {createMode === "cold-keys"
                      ? "I have saved all three — Key 1, Key 2, and my Qoin address — in a safe place."
                      : "I have saved my Qoin address in a safe place."}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* LEFT COLUMN */}
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 flex-shrink-0">
                    <SketchLock className="w-full h-full text-[#1a1a1a]" />
                  </div>
                  <div>
                    <h1 className="font-sketch text-4xl text-[#1a1a1a]">{t.generate.successTitle}</h1>
                    <p className="font-handwritten text-lg text-[#1a1a1a]/50">{t.generate.successSub}</p>
                  </div>
                </div>

                {/* Vault address hero card */}
                <div className="mb-8 overflow-hidden border-2 border-[#1a1a1a] rounded-sm shadow-[5px_5px_0_#1a1a1a]">
                  <div className="flex items-center justify-between px-5 py-3 bg-[#F7931A] border-b-2 border-[#1a1a1a]">
                    <span className="font-sketch text-xl text-[#FAFAF5]">{t.generate.addressLabel}</span>
                    <span className="font-handwritten text-sm text-[#1a1a1a] bg-[#FAFAF5] border border-[#1a1a1a] px-2.5 py-0.5 rounded-sm font-bold shadow-[2px_2px_0_#1a1a1a]">Share Publicly</span>
                  </div>
                  <div className="px-5 py-5 bg-[#FAFAF5]">
                    <p className="font-handwritten text-base text-[#1a1a1a]/60 mb-1">Save this to open your Qoin later.</p>
                    {chain !== "evm" && (
                      <p className="font-body font-bold text-sm text-[#F7931A] mb-4">Do not send tokens here. Tokens will be lost.</p>
                    )}
                    <div className="code-sketch text-sm text-[#1a1a1a] mb-5 p-3 bg-white break-all">
                      {chain === "evm" ? evmVaultAddress : shieldAddress}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => copyText(chain === "evm" ? evmVaultAddress : shieldAddress, "shield")}
                        className="btn-sketch-outline flex-1 text-base py-3 bg-white"
                      >
                        {copied === "shield" ? "Copied!" : "Copy Qoin Address"}
                      </button>
                      {chain === "evm" ? (
                        <a
                          href={`https://etherscan.io/tx/${evmVaultTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sketch flex-1 text-base py-3 text-center"
                        >
                          View on Etherscan
                        </a>
                      ) : (
                        <a
                          href={explorerUrl(txSig, false)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sketch flex-1 text-base py-3 text-center"
                        >
                          View on Orb
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key recap accordion — cold-keys mode only */}
                {createMode === "cold-keys" && pk1 && pk2 && (
                  <div className="space-y-4">
                    <div className="font-sketch text-2xl text-[#1a1a1a] mb-2">Your Private Keys</div>
                    {[{ label: "Key 1", key: pk1, id: "done-pk1" }, { label: "Key 2", key: pk2, id: "done-pk2" }].map(({ label, key, id }) => {
                      const isOpen = openAccordion === id;
                      return (
                        <div key={id} className="overflow-hidden border-2 border-[#1a1a1a] rounded-sm shadow-[3px_3px_0_#1a1a1a]">
                          <button
                            onClick={() => setOpenAccordion(isOpen ? null : id)}
                            className="flex items-center justify-between w-full px-5 py-4 bg-[#F7931A] border-b-2 border-[#1a1a1a] text-left hover:brightness-95 transition-all"
                          >
                            <span className="font-sketch text-lg text-[#FAFAF5]">{label} Private Key</span>
                            <svg viewBox="0 0 20 20" fill="none" className={`w-6 h-6 text-[#FAFAF5] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                              <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="px-5 py-4 bg-[#FAFAF5] mode-panel-enter">
                              <div className="font-handwritten text-sm text-[#1a1a1a]/40 mb-2 uppercase tracking-wide">Private Key</div>
                              <div className="font-mono text-sm text-[#1a1a1a] break-all mb-4 leading-relaxed p-3 bg-white border border-[#1a1a1a] border-opacity-10 rounded-sm">{key.privateKey}</div>
                              <button onClick={() => copyText(key.privateKey, id)} className="btn-sketch-outline w-full text-base py-3 bg-white">
                                {copied === id ? "Copied!" : `Copy ${label} Private Key`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Connect Wallets mode done: remind which wallets were used */}
                {createMode === "connect-wallets" && (
                  <div className="border-2 border-[#1a1a1a]/10 rounded-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#1a1a1a]/10 bg-[#FAFAF5]">
                      <div className="font-sketch text-base text-[#1a1a1a]">Registered Signers</div>
                    </div>
                    <div className="px-5 py-4 space-y-2">
                      {chain === "evm" ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img src="/metamask-logo.png" className="w-7 h-7 rounded-xl flex-shrink-0" alt="MetaMask" />
                              <span className="font-body font-bold text-sm text-[#1a1a1a]/50">Key 1 (MetaMask)</span>
                            </div>
                            <span className="font-mono text-xs text-[#F7931A]">{evmAddress1 ? `${evmAddress1.slice(0, 8)}...${evmAddress1.slice(-6)}` : "n/a"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img src="/metamask-logo.png" className="w-7 h-7 rounded-xl flex-shrink-0" alt="MetaMask" />
                              <span className="font-body font-bold text-sm text-[#1a1a1a]/50">Key 2 (MetaMask)</span>
                            </div>
                            <span className="font-mono text-xs text-[#F7931A]">{evmAddress2 ? `${evmAddress2.slice(0, 8)}...${evmAddress2.slice(-6)}` : "n/a"}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img src="/phantom-logo.png" className="w-7 h-7 rounded-xl flex-shrink-0" alt="Phantom" />
                              <span className="font-body font-bold text-sm text-[#1a1a1a]/50">Key 1 (Phantom)</span>
                            </div>
                            <span className="font-mono text-xs text-[#F7931A]">{phantomPubkey ? `${phantomPubkey.slice(0, 8)}...${phantomPubkey.slice(-6)}` : "n/a"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img src="/phantom-logo.png" className="w-7 h-7 rounded-xl flex-shrink-0" alt="Phantom K2" />
                              <span className="font-body font-bold text-sm text-[#1a1a1a]/50">Key 2 (Phantom)</span>
                            </div>
                            <span className="font-mono text-xs text-[#F7931A]">{phantom2Pubkey ? `${phantom2Pubkey.slice(0, 8)}...${phantom2Pubkey.slice(-6)}` : "n/a"}</span>
                          </div>
                        </>
                      )}
                      <p className="font-handwritten text-sm text-[#1a1a1a]/30 pt-1">
                        Keep these wallets to sign transactions. Losing access to either means losing your tokens.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <div className="border-2 border-[#F7931A] bg-[#FAFAF5] rounded-sm shadow-[4px_4px_0_#F7931A] p-5 mb-8">
                  <div className="flex items-start gap-4">
                    <SketchWarning className="w-8 h-8 flex-shrink-0 text-[#F7931A]" />
                    <div>
                      <div className="font-sketch text-xl text-[#1a1a1a] mb-1">Keys Needed to Move: Both</div>
                      <p className="font-body text-base text-[#1a1a1a]/70">
                        {createMode === "cold-keys"
                          ? "Save Key 1, Key 2, and the Qoin Address. All three. We do not store any of this. Losing them means losing your tokens permanently."
                          : chain === "evm"
                          ? "Save the Vault Address. Both MetaMask keys must be available to sign any transfer. Losing access to either means losing your tokens permanently."
                          : "Save the Qoin Address. Both Phantom accounts must be available to sign any transfer. Losing access to either means losing your tokens permanently."}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/qoin/open")}
                  disabled={!savedChecked}
                  className={`btn-sketch w-full text-2xl py-6 shadow-[6px_6px_0_#1a1a1a] transition-opacity ${!savedChecked ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {t.generate.openBtn}
                </button>
                {!savedChecked && (
                  <p className="font-body text-xs text-center text-[#1a1a1a]/40 mt-3">Tick the checkbox above to continue.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
