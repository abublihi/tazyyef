import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integrations } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import IntegrationList from "./IntegrationList";
import IntegrationForm from "./IntegrationForm";

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["integrations", search],
    queryFn: () => integrations.list(search),
  });

  const createMutation = useMutation({
    mutationFn: integrations.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Integration created");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => integrations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Integration updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(data) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(integration) {
    setEditing(integration);
    setFormOpen(true);
  }

  const count = data?.length ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-2rem)]">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-animated opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

      <div className="relative z-10 w-full">
        {/* ── Hero Header ── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary status-pulse" />
              </span>
              <span className="text-[10px] font-medium text-primary tracking-wider uppercase font-display">
                System Online
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight glow-text">
                INTEGRATIONS
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Manage and monitor your API mock integrations. Each acts as an isolated endpoint environment.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-display text-3xl font-bold text-foreground leading-none">
                  {isLoading ? "—" : count.toString().padStart(2, "0")}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                  Active Integrations
                </p>
              </div>
              <div className="h-10 w-px bg-border/60" />
              <Button
                onClick={handleNew}
                className="h-10 px-5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-[0_0_20px_-5px_hsl(163_100%_40%_/0.3)] transition-shadow hover:shadow-[0_0_30px_-5px_hsl(163_100%_40%_/0.5)]"
              >
                <Plus className="h-4 w-4" />
                New Integration
              </Button>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="glass-panel rounded-lg p-1 mb-8 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
            <Input
              className="pl-10 h-11 text-sm bg-transparent border-0 shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0 input-glow"
              placeholder="Search integrations by name, key, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground mr-1"
            >
              Clear
            </Button>
          )}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border/40 bg-card/30 px-4 py-3.5 animate-pulse"
              >
                <div className="w-7 h-7 rounded-md bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3.5 bg-muted rounded w-1/3 mb-1.5" />
                  <div className="h-2.5 bg-muted rounded w-1/4" />
                </div>
                <div className="hidden md:block h-3 bg-muted rounded w-32" />
                <div className="hidden md:block h-3 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <IntegrationList integrations={data || []} onEdit={handleEdit} />
        )}

        <IntegrationForm
          open={formOpen}
          onOpenChange={setFormOpen}
          integration={editing}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}
