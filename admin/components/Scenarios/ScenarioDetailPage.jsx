import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scenarios, integrations } from "../../lib/api";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  Loader2,
  Clock,
  Zap,
  Globe,
  Tag,
  FileJson,
  Activity,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Server,
  Play,
  Pencil,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { methodColors, statusColor, formatTime } from "../../lib/utils";
import { toast } from "sonner";
import TestModal from "../TestModal";
import ScenarioForm from "./ScenarioForm";

/* ── Simple JSON syntax highlighter ── */
function JsonBlock({ data, title, icon: Icon }) {
  const [expanded, setExpanded] = useState(true);
  let parsed;
  try {
    parsed = typeof data === "string" ? JSON.parse(data || "{}") : data || {};
  } catch {
    parsed = {};
  }
  const empty = Object.keys(parsed).length === 0;
  const lines = JSON.stringify(parsed, null, 2).split("\n");

  return (
    <div className="glass-panel rounded-lg overflow-hidden scanline-hover">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        {Icon && <Icon className="h-3.5 w-3.5 text-primary/70 shrink-0" />}
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {empty ? "empty" : `${Object.keys(parsed).length} fields`}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {empty ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No data configured
            </div>
          ) : (
            <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed overflow-auto max-h-64">
              {lines.map((line, i) => (
                <div key={i} className="whitespace-pre">
                  <JsonLine line={line} />
                </div>
              ))}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function JsonLine({ line }) {
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);

  // Key detection: "key":
  const keyMatch = trimmed.match(/^"([^"]+)"\s*:/);
  if (keyMatch) {
    const key = keyMatch[1];
    const rest = trimmed.slice(keyMatch[0].length);
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-primary/80">"{key}"</span>
        <span className="text-muted-foreground">:</span>
        <JsonValue value={rest} />
      </>
    );
  }

  // Array bracket
  if (trimmed.startsWith("[") || trimmed.startsWith("]")) {
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-amber-400/70">{trimmed}</span>
      </>
    );
  }

  // Object brace
  if (trimmed.startsWith("{") || trimmed.startsWith("}")) {
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-muted-foreground/60">{trimmed}</span>
      </>
    );
  }

  return (
    <>
      <span className="text-muted-foreground/30">{indent}</span>
      <JsonValue value={trimmed} />
    </>
  );
}

function JsonValue({ value }) {
  const trimmed = value.trimStart();
  const indent = value.slice(0, value.length - trimmed.length);

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-emerald-300/70">{trimmed}</span>
      </>
    );
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-amber-300/70">{trimmed}</span>
      </>
    );
  }
  if (trimmed === "true" || trimmed === "false") {
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-blue-300/70">{trimmed}</span>
      </>
    );
  }
  if (trimmed === "null") {
    return (
      <>
        <span className="text-muted-foreground/30">{indent}</span>
        <span className="text-muted-foreground/50">{trimmed}</span>
      </>
    );
  }
  return <span className="text-foreground/80">{value}</span>;
}

/* ── Meta card ── */
function MetaCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="glass-panel rounded-lg p-4 scanline-hover">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-sm font-mono text-foreground truncate">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function ScenarioDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trafficOffset, setTrafficOffset] = useState(0);
  const [testOpen, setTestOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const trafficLimit = 50;

  const { data: scenario, isLoading: scenarioLoading } = useQuery({
    queryKey: ["scenarios", id],
    queryFn: () => scenarios.getById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => scenarios.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setFormOpen(false);
      toast.success("Scenario updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: allIntegrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrations.list(),
  });

  const {
    data: trafficData,
    isLoading: trafficLoading,
  } = useQuery({
    queryKey: ["scenario-traffic", id, trafficOffset],
    queryFn: () => scenarios.getTraffic(id, { limit: trafficLimit, offset: trafficOffset }),
    enabled: !!id,
  });

  if (scenarioLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-8 w-8 text-destructive/60 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Scenario not found</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/scenarios" })}
          className="mt-4"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Back to Scenarios
        </Button>
      </div>
    );
  }

  const integration = allIntegrations?.find((i) => i.id === scenario.integrationId);
  const rateInfo = scenario.rateLimit
    ? `${scenario.rateLimit} req / ${scenario.rateWindow || 60000}ms`
    : null;

  const createdAt = scenario.createdAt ? formatTime(scenario.createdAt) : "—";
  const updatedAt = scenario.updatedAt ? formatTime(scenario.updatedAt) : "—";

  return (
    <div className="fade-up space-y-8">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/50">
        {/* Dot-grid texture */}
        <div className="absolute inset-0 dot-grid opacity-40" />
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="relative px-6 py-8">
          {/* Back button */}
          <div className="flex items-center gap-2 mb-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/scenarios" })}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Scenarios
            </Button>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {scenario.id.slice(0, 8)}…
            </span>
          </div>

          {/* Main header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-mono font-bold method-badge ${methodColors[scenario.method] || ""}`}
              >
                {scenario.method}
              </span>
              <code className="text-lg sm:text-xl font-mono text-foreground tracking-tight">
                {scenario.endpoint}
              </code>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusColor(Number(scenario.responseCode))}`}
              >
                HTTP {scenario.responseCode}
              </span>
              {integration && (
                <span className="text-xs text-muted-foreground font-mono bg-accent/40 border border-border/50 rounded px-2 py-1">
                  {integration.name}
                </span>
              )}
            </div>
          </div>

          {/* Source tag + actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/60 border border-border/40 rounded px-2 py-0.5">
                {scenario.source || "manual"}
              </span>
              {rateInfo && (
                <span className="text-[10px] uppercase tracking-wider text-amber-400/70 bg-amber-500/5 border border-amber-500/15 rounded px-2 py-0.5 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  {rateInfo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestOpen(true)}
                className="text-xs gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(true)}
                className="text-xs gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metadata Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <MetaCard
          icon={Globe}
          label="Integration"
          value={integration?.name || "Unknown"}
          sub={integration?.key}
        />
        <MetaCard
          icon={Tag}
          label="Source"
          value={scenario.source || "manual"}
        />
        <MetaCard
          icon={Clock}
          label="Created"
          value={createdAt}
        />
        <MetaCard
          icon={Server}
          label="Updated"
          value={updatedAt}
        />
      </div>

      {/* ── Configuration Panels ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileJson className="h-3.5 w-3.5 text-primary/60" />
          <h2 className="text-sm font-semibold text-foreground">Configuration</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 stagger-children">
          <JsonBlock data={scenario.headers} title="Headers" icon={FileJson} />
          <JsonBlock data={scenario.queryParams} title="Query Parameters" icon={FileJson} />
          <JsonBlock data={scenario.bodyParams} title="Body Parameters" icon={FileJson} />
        </div>
      </div>

      {/* ── Response Body ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-3.5 w-3.5 text-primary/60" />
          <h2 className="text-sm font-semibold text-foreground">Response Body</h2>
          <span
            className={`text-[10px] font-semibold ml-auto px-2 py-0.5 rounded border ${statusColor(Number(scenario.responseCode))}`}
          >
            {scenario.responseCode}
          </span>
        </div>
        <div className="glass-panel rounded-lg overflow-hidden">
          <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed overflow-auto max-h-80">
            {(() => {
              try {
                const parsed = JSON.parse(scenario.responseBody || "{}");
                return JSON.stringify(parsed, null, 2)
                  .split("\n")
                  .map((line, i) => (
                    <div key={i} className="whitespace-pre">
                      <JsonLine line={line} />
                    </div>
                  ));
              } catch {
                return <span className="text-muted-foreground">{scenario.responseBody || "{}"}</span>;
              }
            })()}
          </pre>
        </div>
      </div>

      {/* ── Traffic Log ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary/60" />
            <h2 className="text-sm font-semibold text-foreground">Traffic Log</h2>
            <span className="text-[10px] text-muted-foreground bg-secondary/60 border border-border/40 rounded px-2 py-0.5">
              {trafficData?.total || 0} entries
            </span>
          </div>
        </div>

        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-[80px]">
                  Method
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Path
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-[90px]">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-[110px]">
                  Response
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-[160px]">
                  Timestamp
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trafficLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary/60" />
                  </TableCell>
                </TableRow>
              ) : !trafficData?.entries?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground text-xs"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground/30" />
                      <span>No traffic recorded for this scenario yet.</span>
                      <span className="text-[10px] text-muted-foreground/50">
                        Requests matching this endpoint will appear here.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                trafficData.entries.map((entry, idx) => (
                  <TableRow
                    key={entry.id}
                    className="border-border/30 hover:bg-accent/20 transition-colors"
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono font-semibold ${methodColors[entry.method] || ""}`}
                      >
                        {entry.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono truncate block max-w-[280px]">
                        {entry.path}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${statusColor(Number(entry.statusCode))}`}
                      >
                        {entry.statusCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {entry.responseTime}ms
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {trafficData && trafficData.total > trafficLimit && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={trafficOffset === 0}
              onClick={() => setTrafficOffset((prev) => Math.max(0, prev - trafficLimit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={trafficOffset + trafficLimit >= trafficData.total}
              onClick={() => setTrafficOffset((prev) => prev + trafficLimit)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <TestModal
        open={testOpen}
        onOpenChange={setTestOpen}
        scenario={scenario}
        integration={integration}
      />

      <ScenarioForm
        open={formOpen}
        onOpenChange={setFormOpen}
        scenario={scenario}
        integrations={allIntegrations || []}
        onSubmit={(data) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
