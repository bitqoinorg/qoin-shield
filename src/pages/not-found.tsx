import { useApp } from "@/contexts/AppContext";
import { useLocation } from "wouter";

export default function NotFound() {
  const { dark } = useApp();
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: dark ? "#1a1a1a" : "#FAFAF5" }}
    >
      <div
        className="w-full max-w-md mx-4 p-8 sketch-card"
        style={{ background: dark ? "#111" : "#fff" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#F7931A" strokeWidth="2.5" strokeDasharray="4 2" />
            <line x1="20" y1="12" x2="20" y2="22" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="20" cy="28" r="2" fill="#F7931A" />
          </svg>
          <h1
            className="font-sketch text-3xl"
            style={{ color: dark ? "#FAFAF5" : "#1a1a1a" }}
          >
            404
          </h1>
        </div>

        <p
          className="font-body text-lg mb-2"
          style={{ color: dark ? "#FAFAF5" : "#1a1a1a" }}
        >
          Page not found.
        </p>
        <p
          className="font-body text-sm mb-8"
          style={{ color: dark ? "rgba(250,250,245,0.5)" : "rgba(26,26,26,0.5)" }}
        >
          The route you requested does not exist.
        </p>

        <button
          onClick={() => navigate("/")}
          className="font-body text-sm px-5 py-2 border-2 transition-colors"
          style={{
            borderColor: "#F7931A",
            color: "#F7931A",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "#F7931A";
            (e.currentTarget as HTMLButtonElement).style.color = "#fff";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "#F7931A";
          }}
        >
          Go home
        </button>
      </div>
    </div>
  );
}
