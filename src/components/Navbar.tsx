import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { SketchCoin } from "@/components/sketches";
import { useApp } from "@/contexts/AppContext";
import { LANGUAGES } from "@/lib/translations";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}


function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

interface NavDropdownProps {
  label: string;
  items: { label: string; href: string }[];
  onNavigate: (href: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function NavDropdown({ label, items, onNavigate, open, onOpen, onClose }: NavDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { dark } = useApp();

  function scheduleClose() {
    closeTimer.current = setTimeout(onClose, 300);
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => { cancelClose(); onOpen(); }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => open ? onClose() : onOpen()}
        className={`font-body font-bold text-sm transition-colors flex items-center gap-1 ${
          dark ? "text-[#FAFAF5]/70 hover:text-[#F7931A]" : "text-[#1a1a1a]/60 hover:text-[#F7931A]"
        }`}
      >
        {label}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 w-52 border shadow-lg z-50 py-1 ${
            dark
              ? "bg-[#1a1a1a] border-[#FAFAF5]/10"
              : "bg-white border-[#1a1a1a]/10"
          }`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {items.map((item) => (
            <button
              key={item.href}
              onMouseDown={() => { cancelClose(); onNavigate(item.href); }}
              className={`block w-full text-left font-body font-bold text-sm px-4 py-2.5 transition-colors ${
                dark
                  ? "text-[#FAFAF5]/80 hover:text-[#F7931A] hover:bg-[#F7931A]/10"
                  : "text-[#1a1a1a]/70 hover:text-[#F7931A] hover:bg-[#F7931A]/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function LangPicker() {
  const { lang, setLang, dark } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`font-body font-bold text-sm px-2.5 py-1.5 border transition-colors flex items-center gap-1.5 ${
          dark
            ? "border-[#FAFAF5]/20 text-[#FAFAF5]/80 hover:border-[#F7931A] hover:text-[#F7931A]"
            : "border-[#1a1a1a]/20 text-[#1a1a1a]/70 hover:border-[#F7931A] hover:text-[#F7931A]"
        }`}
        title="Select language"
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1.5 3.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className={`absolute top-full right-0 mt-2 w-40 border shadow-lg z-50 py-1 ${
          dark ? "bg-[#1a1a1a] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/10"
        }`}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left font-body font-bold text-sm px-3 py-2 transition-colors ${
                l.code === lang
                  ? "text-[#F7931A]"
                  : dark
                    ? "text-[#FAFAF5]/70 hover:text-[#F7931A] hover:bg-[#F7931A]/10"
                    : "text-[#1a1a1a]/70 hover:text-[#F7931A] hover:bg-[#F7931A]/5"
              }`}
            >
              <span className="w-6 text-center font-bold text-xs">{l.label}</span>
              <span className={`text-xs ${dark ? "text-[#FAFAF5]/50" : "text-[#1a1a1a]/40"}`}>{l.name}</span>
              {l.code === lang && <span className="ml-auto text-[#F7931A] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { t, dark, toggleDark } = useApp();

  const nav = (href: string) => { navigate(href); setMobileOpen(false); setMobileSub(null); setActiveDropdown(null); };
  const openDrop = (key: string) => setActiveDropdown(key);
  const closeDrop = () => setActiveDropdown(null);

  const bgClass = dark ? "bg-[#0f0f0f] border-[#FAFAF5]/10" : "bg-white border-[#1a1a1a]/10";
  const announcementBg = "bg-[#F7931A]";

  return (
    <>
      <div className={`${announcementBg} text-white font-body font-bold text-sm py-2 text-center px-4 tracking-wide`}>
        {t.nav.announcement}
      </div>

      <nav className={`${bgClass} border-b-2 sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 gap-6">

          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-75 transition-opacity"
          >
            <SketchCoin className="w-8 h-8" />
            <span className={`font-body font-bold text-xl ${dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]"}`}>bitQoin</span>
          </button>

          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <NavDropdown
              label={t.nav.whyQoin}
              items={t.nav.subWhy}
              onNavigate={nav}
              open={activeDropdown === "why"}
              onOpen={() => openDrop("why")}
              onClose={closeDrop}
            />
            <NavDropdown
              label={t.nav.howItWorks}
              items={t.nav.subHow}
              onNavigate={nav}
              open={activeDropdown === "how"}
              onOpen={() => openDrop("how")}
              onClose={closeDrop}
            />
            <NavDropdown
              label={t.nav.proof}
              items={t.nav.subProof}
              onNavigate={nav}
              open={activeDropdown === "proof"}
              onOpen={() => openDrop("proof")}
              onClose={closeDrop}
            />
            <button
              onClick={() => nav("/faq")}
              onMouseEnter={closeDrop}
              className={`font-body font-bold text-sm transition-colors ${
                dark ? "text-[#FAFAF5]/70 hover:text-[#F7931A]" : "text-[#1a1a1a]/60 hover:text-[#F7931A]"
              }`}
            >
              {t.nav.faq}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <LangPicker />

            <a
              href="https://github.com/bitqoinorg"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 transition-colors ${dark ? "text-[#FAFAF5]/60 hover:text-[#F7931A]" : "text-[#1a1a1a]/50 hover:text-[#F7931A]"}`}
              title="GitHub"
            >
              <GitHubIcon />
            </a>

            <a
              href="https://x.com/thebitcoin"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-1 font-body font-bold text-sm transition-colors ${dark ? "text-[#FAFAF5]/60 hover:text-[#F7931A]" : "text-[#1a1a1a]/50 hover:text-[#F7931A]"}`}
              title="𝕏"
            >
              𝕏
            </a>

            <button
              onClick={toggleDark}
              className={`p-2 transition-colors ${dark ? "text-[#FAFAF5]/60 hover:text-[#F7931A]" : "text-[#1a1a1a]/50 hover:text-[#F7931A]"}`}
              title={dark ? t.common.lightMode : t.common.darkMode}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <button
            className={`md:hidden font-sketch text-2xl leading-none ${dark ? "text-[#FAFAF5]" : "text-[#1a1a1a]"}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileOpen && (
          <div className={`md:hidden ${bgClass} border-t px-6 py-4 space-y-1`}>
            {[
              { label: t.nav.whyQoin, key: "why", items: t.nav.subWhy },
              { label: t.nav.howItWorks, key: "how", items: t.nav.subHow },
              { label: t.nav.proof, key: "proof", items: t.nav.subProof },
            ].map((group) => (
              <div key={group.key}>
                <button
                  onClick={() => setMobileSub(mobileSub === group.key ? null : group.key)}
                  className={`flex items-center justify-between w-full font-body font-bold text-base py-2 ${
                    dark ? "text-[#FAFAF5]/80" : "text-[#1a1a1a]/70"
                  }`}
                >
                  {group.label}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${mobileSub === group.key ? "rotate-180" : ""}`}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {mobileSub === group.key && (
                  <div className={`pl-4 space-y-1 pb-2 border-l-2 border-[#F7931A]/30`}>
                    {group.items.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => nav(item.href)}
                        className={`block w-full text-left font-body font-bold text-sm py-1.5 ${
                          dark ? "text-[#FAFAF5]/60 hover:text-[#F7931A]" : "text-[#1a1a1a]/55 hover:text-[#F7931A]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => nav("/faq")}
              className={`block w-full text-left font-body font-bold text-base py-2 ${dark ? "text-[#FAFAF5]/80" : "text-[#1a1a1a]/70"}`}
            >
              {t.nav.faq}
            </button>

            <div className={`flex items-center gap-3 pt-3 border-t ${dark ? "border-[#FAFAF5]/10" : "border-[#1a1a1a]/10"}`}>
              <LangPicker />
              <a href="https://github.com/bitqoinorg" target="_blank" rel="noopener noreferrer"
                className={`p-2 ${dark ? "text-[#FAFAF5]/60" : "text-[#1a1a1a]/50"}`}>
                <GitHubIcon />
              </a>
              <a href="https://x.com/thebitcoin" target="_blank" rel="noopener noreferrer"
                className={`px-1 font-body font-bold text-sm ${dark ? "text-[#FAFAF5]/60" : "text-[#1a1a1a]/50"}`}>
                𝕏
              </a>
              <button onClick={toggleDark}
                className={`p-2 ${dark ? "text-[#FAFAF5]/60" : "text-[#1a1a1a]/50"}`}>
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
