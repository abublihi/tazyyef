import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { integrations } from "../../lib/api";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Pencil, Trash2, Box, ArrowRight, CircuitBoard } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../ConfirmDialog";

export default function IntegrationList({ integrations: list, onEdit }) {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: integrations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setConfirmId(null);
      toast.success("Integration deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!list.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center relative">
        <div className="absolute inset-0 bg-grid-animated opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl border border-border/60 bg-card/40 flex items-center justify-center mx-auto mb-5">
            <Box className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground tracking-wide mb-1">
            NO ACTIVE INTEGRATIONS
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Your system is idle. Initialize a new integration to begin mocking API endpoints.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Column headers */}
      <div className="hidden md:grid grid-cols-[1.2fr_1fr_120px] gap-6 px-5 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
        <span>Integration Name</span>
        <span>Description</span>
        <span className="text-right">Status</span>
      </div>

      <div className="space-y-1.5 stagger-children">
        {list.map((integration) => (
          <div
            key={integration.id}
            className="group relative flex items-center gap-4 rounded-lg border border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/20 transition-all duration-200 scanline-hover overflow-hidden"
          >
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/0 group-hover:bg-primary/60 transition-colors duration-200" />

            {/* Index marker */}
            <div className="hidden md:flex items-center justify-center w-10 shrink-0 text-[10px] font-mono text-muted-foreground/30">
              {integration.key?.slice(0, 2).toUpperCase()}
            </div>

            {/* Main link area */}
            <Link
              to="/integrations/$id"
              params={{ id: integration.id }}
              className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_120px] gap-6 items-center py-3.5 px-1 pr-0 group/link"
            >
              {/* Name & Key */}
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <CircuitBoard className="h-3.5 w-3.5 text-primary/70" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover/link:text-primary transition-colors duration-150">
                    {integration.name}
                  </p>
                  <code className="text-[10px] text-muted-foreground font-mono tracking-wide block">
                    {integration.key}
                  </code>
                </div>
              </div>

              {/* Description */}
              <p className="hidden md:block text-xs text-muted-foreground truncate leading-relaxed">
                {integration.description || (
                  <span className="text-muted-foreground/30 italic">No description</span>
                )}
              </p>

              {/* Status + Arrow */}
              <div className="hidden md:flex items-center justify-end gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Online
                  </span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover/link:text-primary/50 transition-all group-hover/link:translate-x-1 duration-150" />
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-0.5 pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(integration);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmId(integration.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title="Delete integration?"
        description="This will delete the integration and all its scenarios. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(confirmId)}
      />
    </>
  );
}
