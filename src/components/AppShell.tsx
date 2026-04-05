import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { SketchCoin, SketchShield } from "@/components/sketches";


function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" className="w-5 h-5 flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 12h2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

const navItems = [
  { path: "/qoin/create", label: "Create Qoin Shield", shortLabel: "Create", Icon: PlusIcon },
  { path: "/qoin/open", label: "My Qoin Shield", shortLabel: "My Qoin Shield", Icon: WalletIcon },
];


export default function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(path: string) {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  }

  function go(path: string) {
    navigate(path);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] text-[#1a1a1a]">

      {/* SIDEBAR desktop only */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r-2 border-[#1a1a1a] z-50">

        {/* Brand header */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 px-5 py-4 border-b-2 border-[#1a1a1a] hover:bg-[#FAFAF5] transition-colors w-full text-left group"
        >
          <div className="w-9 h-9 flex-shrink-0">
            <SketchCoin className="w-full h-full" />
          </div>
          <span className="font-body font-bold text-xl tracking-tight leading-none group-hover:text-[#F7931A] transition-colors">bitQoin</span>
        </button>

        {/* Nav section */}
        <div className="px-5 pt-5 pb-2">
          <span className="font-handwritten text-xs text-[#1a1a1a]/25 uppercase tracking-widest">Menu</span>
        </div>

        <nav className="flex flex-col gap-1 px-3 flex-1">
          {navItems.map(({ path, label, Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative flex items-center gap-3 px-4 py-3.5 font-handwritten text-lg text-left w-full transition-all rounded-sm overflow-hidden ${
                  active
                    ? "bg-[#F7931A] text-white border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a]"
                    : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#FAFAF5] border-2 border-transparent"
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
                {active && (
                  <span className="ml-auto">
                    <svg viewBox="0 0 8 12" fill="none" className="w-2 h-3 opacity-60">
                      <path d="M1 1l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer status card */}
        <div className="px-3 pb-4">
          <div className="border-2 border-[#1a1a1a] bg-[#FAFAF5] rounded-sm p-3 shadow-[3px_3px_0_#1a1a1a]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7931A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F7931A]"></span>
              </span>
              <span className="font-sketch text-sm tracking-tight">EVM and Solana</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <SketchShield className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
              <span className="font-handwritten text-xs text-[#1a1a1a]/50">Qonjoint</span>
            </div>
            <p className="font-handwritten text-xs text-[#1a1a1a]/25">Gas sponsored by platform</p>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b-2 border-[#1a1a1a] z-50 h-14 flex items-center px-4">
        <button onClick={() => go("/")} className="flex items-center gap-2 flex-1 min-w-0">
          <SketchCoin className="w-8 h-8 flex-shrink-0" />
          <span className="font-body font-bold text-lg leading-none">bitQoin</span>
        </button>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex-shrink-0 p-2 -mr-2 flex flex-col gap-1.5 justify-center"
          aria-label="Open menu"
        >
          <span className="block w-6 h-0.5 bg-[#1a1a1a]" />
          <span className="block w-6 h-0.5 bg-[#1a1a1a]" />
          <span className="block w-6 h-0.5 bg-[#1a1a1a]" />
        </button>
      </header>

      {/* MOBILE FULLSCREEN NAV OVERLAY */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#1a1a1a] z-[100] flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 flex-shrink-0">
            <button onClick={() => go("/")} className="flex items-center gap-2">
              <SketchCoin className="w-8 h-8 flex-shrink-0" />
              <span className="font-body font-bold text-lg text-white leading-none">bitQoin</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 -mr-2 text-white"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col px-6 pt-6 flex-1">
            {navItems.map(({ path, label }) => (
              <button
                key={path}
                onClick={() => go(path)}
                className={`text-left py-5 border-b border-white/10 font-body text-2xl transition-colors ${
                  isActive(path) ? "text-[#F7931A]" : "text-white hover:text-[#F7931A]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="px-6 pb-8 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7931A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7931A]"></span>
              </span>
              <span className="font-handwritten text-sm text-white/40">EVM and Solana</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="md:ml-64 pt-14 md:pt-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}
