import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scenarios } from "../../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Pencil, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { methodColors, statusColor, esc } from "../../lib/utils";
import TestModal from "../TestModal";
import ConfirmDialog from "../ConfirmDialog";

export default function ScenarioList({ scenarios: list, integrations, onEdit }) {
  const [testScenario, setTestScenario] = useState(null);
  const [testIntegration, setTestIntegration] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: scenarios.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setConfirmId(null);
      toast.success("Scenario deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function getIntegrationName(integrationId) {
    return integrations.find((i) => i.id === integrationId)?.name || "Unknown";
  }

  function getIntegrationKey(integrationId) {
    return integrations.find((i) => i.id === integrationId)?.key || "";
  }

  function countParams(jsonStr) {
    try {
      return Object.keys(JSON.parse(jsonStr || "{}")).length;
    } catch {
      return 0;
    }
  }

  if (!list.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No scenarios found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((s) => {
        const headers = countParams(s.headers);
        const queryParams = countParams(s.queryParams);
        const bodyParams = countParams(s.bodyParams);
        const rateInfo = s.rateLimit
          ? `${s.rateLimit} req / ${s.rateWindow || 60000}ms`
          : null;

        return (
          <Card key={s.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-semibold ${methodColors[s.method] || ""}`}
                    >
                      {s.method}
                    </span>
                    <code className="text-sm font-mono truncate">
                      {esc(s.endpoint)}
                    </code>
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${statusColor(Number(s.responseCode))}`}
                    >
                      {s.responseCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {getIntegrationName(s.integrationId)}
                    </span>
                    <span>
                      {headers} headers · {queryParams} query · {bodyParams} body
                    </span>
                    {rateInfo && <span title="Rate limit">{rateInfo}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const integration = integrations.find((i) => i.id === s.integrationId);
                      setTestIntegration(integration);
                      setTestScenario(s);
                    }}
                    title="Test endpoint"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmId(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title="Delete scenario?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(confirmId)}
      />

      <TestModal
        open={!!testScenario}
        onOpenChange={(open) => {
          if (!open) {
            setTestScenario(null);
            setTestIntegration(null);
          }
        }}
        scenario={testScenario}
        integration={testIntegration}
      />
    </div>
  );
}
