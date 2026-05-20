import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { integrations } from "../lib/api";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Loader2, Upload, FileJson, CheckCircle2,
  AlertTriangle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const METHOD_COLORS = {
  GET:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  POST:    "bg-blue-500/15 text-blue-400 border-blue-500/25",
  PUT:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
  DELETE:  "bg-red-500/15 text-red-400 border-red-500/25",
  PATCH:   "bg-purple-500/15 text-purple-400 border-purple-500/25",
  OPTIONS: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

function validateEndpoint(endpoint) {
  if (!endpoint) return "Missing endpoint";
  if (/^https?:\/\//i.test(endpoint)) return "Must be a path, not a full URL";
  if (!endpoint.startsWith("/")) return 'Must start with "/"';
  return null;
}

export default function PostmanImportModal({ open, onOpenChange, integrationId, integrationName }) {
  const [inputMethod, setInputMethod] = useState("file");
  const [jsonText, setJsonText] = useState("");
  const [step, setStep] = useState("upload"); // upload | loading | preview | done
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [conflictActions, setConflictActions] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  async function handleCollection(collection) {
    setStep("loading");
    try {
      const data = await integrations.importPreview(integrationId, collection);

      // Annotate each endpoint with client-side validation
      const endpoints = (data.endpoints || []).map((ep) => ({
        ...ep,
        validationError: validateEndpoint(ep.endpoint),
      }));

      const enriched = { ...data, endpoints };
      setPreview(enriched);

      // Auto-select all valid endpoints
      setSelected(
        new Set(
          endpoints
            .map((ep, i) => (ep.validationError ? null : i))
            .filter((i) => i !== null)
        )
      );
      setConflictActions({});
      setStep("preview");
    } catch (err) {
      setStep("upload");
      toast.error(err.message);
    }
  }

  async function handleFile(file) {
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Please select a JSON file");
      return;
    }
    try {
      const text = await file.text();
      const collection = JSON.parse(text);
      await handleCollection(collection);
    } catch (err) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  }

  async function handlePaste() {
    if (!jsonText.trim()) {
      toast.error("Paste your Postman collection JSON first");
      return;
    }
    try {
      const collection = JSON.parse(jsonText);
      await handleCollection(collection);
    } catch (err) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  }

  const confirmMutation = useMutation({
    mutationFn: () => {
      const endpoints = preview.endpoints.map((ep, i) => ({
        ...ep,
        action: selected.has(i)
          ? ep.hasConflict
            ? conflictActions[i] || "skip"
            : "create"
          : "skip",
      }));
      return integrations.importConfirm(integrationId, {
        endpoints,
        collectionName: preview.collection?.name || "Postman Collection",
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setStep("done");
      toast.success(`Imported ${result.summary?.imported ?? 0} scenarios`);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleReset() {
    setStep("upload");
    setJsonText("");
    setPreview(null);
    setSelected(new Set());
    setConflictActions({});
    setInputMethod("file");
  }

  function toggleSelect(i) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const validCount = preview?.endpoints?.filter((ep) => !ep.validationError).length ?? 0;
  const errorCount = preview?.endpoints?.filter((ep) => ep.validationError).length ?? 0;
  const conflictCount = preview?.conflictCount ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleReset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">
            Import Postman Collection
            {integrationName && (
              <span className="text-muted-foreground font-normal ml-2 text-xs">
                → {integrationName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">

          {/* ── Upload step ── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Input method toggle */}
              <div className="flex border border-border rounded overflow-hidden text-xs">
                {[
                  { id: "file", label: "File Upload", icon: <FileJson className="h-3.5 w-3.5" /> },
                  {
                    id: "paste", label: "Paste JSON",
                    icon: (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="5" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 5V4a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    ),
                  },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setInputMethod(id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 font-medium transition-colors",
                      id === "paste" && "border-l border-border",
                      inputMethod === id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>

              {/* File upload */}
              {inputMethod === "file" && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all select-none",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-accent/30"
                  )}
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-foreground font-medium mb-1">
                    Drop your Postman collection here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse — .json files only
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files[0]) handleFile(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {/* Paste JSON */}
              {inputMethod === "paste" && (
                <div className="space-y-2">
                  <Textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder={'{ "info": { "name": "My API" }, "item": [...] }'}
                    rows={11}
                    className="font-mono text-xs resize-none bg-muted/20 border-border focus:border-primary/50"
                    spellCheck={false}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handlePaste}
                      disabled={!jsonText.trim()}
                      className="text-xs h-8"
                    >
                      Parse &amp; Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Loading step ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Parsing collection...</p>
            </div>
          )}

          {/* ── Preview step ── */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Collection info + stats */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{preview.collection?.name}</p>
                  {preview.collection?.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {preview.collection.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary border border-primary/15">
                    {preview.endpoints.length} total
                  </span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-destructive/8 text-destructive border border-destructive/15">
                      <XCircle className="h-2.5 w-2.5" /> {errorCount} invalid
                    </span>
                  )}
                  {conflictCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
                      <AlertTriangle className="h-2.5 w-2.5" /> {conflictCount} conflicts
                    </span>
                  )}
                </div>
              </div>

              {/* Bulk select actions */}
              <div className="flex gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      new Set(
                        preview.endpoints
                          .map((ep, i) => (ep.validationError ? null : i))
                          .filter((i) => i !== null)
                      )
                    )
                  }
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Select all
                </button>
                <span className="text-muted-foreground/30">·</span>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Deselect all
                </button>
                {conflictCount > 0 && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(
                          new Set(
                            preview.endpoints
                              .map((ep, i) =>
                                ep.hasConflict && !ep.validationError ? i : null
                              )
                              .filter((i) => i !== null)
                          )
                        )
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Conflicts only
                    </button>
                  </>
                )}
              </div>

              {/* Endpoints table */}
              <div className="border border-border rounded overflow-hidden">
                {/* Table header */}
                <div className="grid items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border"
                  style={{ gridTemplateColumns: "20px 58px 1fr 72px 96px" }}>
                  {["", "Method", "Endpoint", "Status", "Action"].map((h) => (
                    <span key={h} className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                      {h}
                    </span>
                  ))}
                </div>

                {/* Table rows */}
                <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
                  {preview.endpoints.map((ep, i) => {
                    const hasError = !!ep.validationError;
                    const isSelected = selected.has(i);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "grid items-start gap-2 px-3 py-2.5 transition-colors",
                          hasError
                            ? "bg-destructive/4"
                            : isSelected
                            ? "bg-primary/4"
                            : "hover:bg-accent/30"
                        )}
                        style={{ gridTemplateColumns: "20px 58px 1fr 72px 96px" }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected && !hasError}
                          disabled={hasError}
                          onChange={() => !hasError && toggleSelect(i)}
                          className="mt-0.5 accent-primary h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-25"
                        />

                        {/* Method badge */}
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono mt-0.5 w-fit",
                            METHOD_COLORS[ep.method] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"
                          )}
                        >
                          {ep.method}
                        </span>

                        {/* Endpoint + sub-text */}
                        <div className="min-w-0">
                          <code
                            className={cn(
                              "text-[11px] font-mono block truncate",
                              hasError ? "text-destructive" : "text-foreground"
                            )}
                          >
                            {ep.endpoint}
                          </code>
                          {hasError ? (
                            <span className="text-[10px] text-destructive/70 flex items-center gap-1 mt-0.5">
                              <XCircle className="h-2.5 w-2.5 shrink-0" />
                              {ep.validationError}
                            </span>
                          ) : ep.description ? (
                            <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                              {ep.description}
                            </span>
                          ) : null}
                        </div>

                        {/* Status badge */}
                        <div className="mt-0.5">
                          {hasError ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/15">
                              Error
                            </span>
                          ) : ep.hasConflict ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
                              Conflict
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary border border-primary/15">
                              New
                            </span>
                          )}
                        </div>

                        {/* Action */}
                        <div className="mt-0.5">
                          {!hasError && ep.hasConflict ? (
                            <select
                              value={conflictActions[i] || "skip"}
                              onChange={(e) =>
                                setConflictActions((prev) => ({ ...prev, [i]: e.target.value }))
                              }
                              className="text-[10px] w-full bg-background border border-border rounded px-1.5 py-0.5 text-foreground cursor-pointer focus:outline-none focus:border-primary"
                            >
                              <option value="skip">Skip</option>
                              <option value="overwrite">Overwrite</option>
                              <option value="create">Create new</option>
                            </select>
                          ) : !hasError ? (
                            <span className="text-[10px] text-muted-foreground">Create</span>
                          ) : (
                            <span className="text-[10px] text-destructive/40">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium">{selected.size}</span> of{" "}
                <span className="text-foreground font-medium">{validCount}</span> valid endpoints
                selected
              </p>
            </div>
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Import complete</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scenarios added to <strong>{integrationName}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
          <div>
            {step === "preview" && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Start over
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {step === "done" ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-8">
                  Import another
                </Button>
                <Button
                  size="sm"
                  onClick={() => { handleReset(); onOpenChange(false); }}
                  className="text-xs h-8"
                >
                  Done
                </Button>
              </>
            ) : step === "preview" ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => confirmMutation.mutate()}
                  disabled={selected.size === 0 || confirmMutation.isPending}
                  className="text-xs h-8"
                >
                  {confirmMutation.isPending ? (
                    <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Importing...</>
                  ) : (
                    `Import ${selected.size} endpoint${selected.size !== 1 ? "s" : ""}`
                  )}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
