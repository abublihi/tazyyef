import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Loader2, Terminal } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const GridLines = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

const CircuitDecoration = () => (
  <svg className="absolute bottom-12 right-8 w-48 h-48 text-primary/6" viewBox="0 0 200 200" fill="none">
    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="8 6" />
    <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="0.5" />
    <circle cx="100" cy="100" r="6" fill="currentColor" opacity="0.5" />
    <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.5" />
    <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.5" />
    <circle cx="20" cy="100" r="3" fill="currentColor" opacity="0.4" />
    <circle cx="180" cy="100" r="3" fill="currentColor" opacity="0.4" />
    <circle cx="100" cy="20" r="3" fill="currentColor" opacity="0.4" />
    <circle cx="100" cy="180" r="3" fill="currentColor" opacity="0.4" />
  </svg>
);

export default function LoginScreen() {
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data) {
    setError("");
    try {
      await login(data);
      toast.success("Authenticated");
      navigate({ to: "/integrations" });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex">
      {/* Grid texture */}
      <div className="text-foreground">
        <GridLines />
      </div>

      {/* Teal glow blob — top left */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/6 rounded-full blur-[96px] pointer-events-none" />
      {/* Subtle glow — bottom right */}
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-primary/4 rounded-full blur-[120px] pointer-events-none" />

      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative border-r border-border/30">
        <CircuitDecoration />

        {/* Top wordmark */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded border border-primary/30 bg-primary/8 flex items-center justify-center text-primary">
              <svg className="w-5 h-5" viewBox="0 0 120 120" fill="none">
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
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-xl font-semibold text-foreground tracking-tight">tazyyef</span>
                <span className="text-primary text-xl font-medium cursor-blink">_</span>
              </div>
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-5">
            {[
              ["Integrations", "Isolated mock namespaces with auto-generated keys"],
              ["Scenarios", "Match by method, path, headers, query & body params"],
              ["Traffic", "Inspect every request and response in real-time"],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <span className="text-primary/70 text-xs mt-0.5 shrink-0">▸</span>
                <div>
                  <p className="text-xs font-medium text-foreground">{title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom version tag */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Terminal className="w-3 h-3" />
          <span>// REST API Mock Platform</span>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 lg:max-w-sm xl:max-w-md flex flex-col justify-center px-8 py-12 lg:px-10">
        {/* Mobile brand */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-primary/30 bg-primary/8 flex items-center justify-center text-primary">
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
          </div>
          <span className="text-sm font-semibold text-foreground">tazyyef<span className="text-primary cursor-blink">_</span></span>
        </div>

        <div className="fade-up">
          {/* Header */}
          <div className="mb-7">
            <p className="text-[10px] text-primary/70 tracking-widest uppercase mb-2">
              ── Authentication required
            </p>
            <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Access the admin control panel
            </p>
          </div>

          {/* Form panel */}
          <div className="border border-border bg-card rounded-lg p-6 shadow-[0_0_60px_hsl(163,100%,40%,0.04)]">
            {/* Terminal prompt line */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/50">
              <span className="text-primary text-xs">$</span>
              <span className="text-muted-foreground text-[11px]">authenticate --interactive</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-destructive/8 border border-destructive/25 text-destructive text-[11px] rounded px-3 py-2.5 flex items-center gap-2">
                  <span className="shrink-0">✕</span>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[11px] text-muted-foreground font-normal">
                  username
                </Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="admin"
                  className="h-9 text-xs bg-input/40 border-border/60 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-[10px] text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] text-muted-foreground font-normal">
                  password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-9 text-xs bg-input/40 border-border/60 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-[10px] text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="opacity-60">›</span>
                      Sign In
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
