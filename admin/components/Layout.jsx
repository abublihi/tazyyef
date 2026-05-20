import React from "react";
import { Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { LogOut, LayoutGrid, ListChecks, Activity } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/integrations", label: "Integrations", icon: LayoutGrid },
  { to: "/scenarios", label: "Scenarios", icon: ListChecks },
  { to: "/traffic", label: "Traffic", icon: Activity },
];

const TazyyefLogo = () => (
  <svg className="w-4 h-4" viewBox="0 0 120 120" fill="none">
    <rect x="8" y="8" width="104" height="104" rx="16" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="32" cy="38" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="40" y1="38" x2="56" y2="38" stroke="currentColor" strokeWidth="2" />
    <rect x="56" y="30" width="28" height="16" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="70" cy="38" r="3" fill="currentColor" />
    <line x1="24" y1="60" x2="96" y2="60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
    <circle cx="32" cy="82" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="40" y1="82" x2="56" y2="82" stroke="currentColor" strokeWidth="2" />
    <rect x="56" y="74" width="28" height="16" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="70" cy="82" r="3" fill="currentColor" />
  </svg>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname: currentPath } = useLocation();

  async function handleLogout() {
    await logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sidebar-enter w-[228px] fixed inset-y-0 left-0 flex flex-col border-r border-border bg-card z-50">

        {/* Brand */}
        <div className="px-5 pt-6 pb-7 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-primary/10 border border-primary/25 text-primary shrink-0">
              <TazyyefLogo />
            </div>
            <div className="flex items-baseline gap-0 leading-none">
              <span className="text-sm font-semibold text-foreground tracking-tight">tazyyef</span>
              <span className="text-primary text-sm font-medium cursor-blink">_</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed ml-[42px]">
            // REST API Mock Platform
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-3 font-medium">
            — Control
          </p>
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = currentPath.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-2.5 rounded text-xs transition-all duration-150 group",
                  isActive
                    ? "text-primary bg-primary/8 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto text-[9px] text-primary/50 font-normal">●</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border/60 mt-auto">
          <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/50 transition-colors">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{user?.username}</p>
              <p className="text-[9px] text-muted-foreground">administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-destructive/12 text-muted-foreground hover:text-destructive transition-all duration-150 shrink-0 ml-2"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="ml-[228px] flex-1 min-h-screen flex flex-col">
        {/* Top rule + breadcrumb */}
        <div className="h-px bg-border/40 sticky top-0 z-30" />
        <main className="flex-1 px-8 py-7 fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
