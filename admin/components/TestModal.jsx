import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2, Copy, Check, Play, Terminal, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { methodColors, statusColor } from "../lib/utils";

function jsonToHeaderText(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr || "{}");
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  } catch {
    return "";
  }
}

function jsonToQueryString(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr || "{}");
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => params.append(k, v));
    return params.toString();
  } catch {
    return "";
  }
}

function headerTextToObj(text) {
  const obj = {};
  text.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) obj[key] = value;
    }
  });
  return obj;
}

function generateCurl(url, method, headersObj, bodyText) {
  let cmd = "curl";

  if (method && method !== "GET") {
    cmd += ` -X ${method}`;
  }

  Object.entries(headersObj).forEach(([k, v]) => {
    cmd += ` \\\n  -H "${k}: ${v}"`;
  });

  // Always add content-type for body methods
  if ((method === "POST" || method === "PUT" || method === "PATCH") && !headersObj["Content-Type"]) {
    cmd += ` \\\n  -H "Content-Type: application/json"`;
  }

  if (bodyText && (method === "POST" || method === "PUT" || method === "PATCH")) {
    cmd += ` \\\n  -d '${bodyText.replace(/'/g, "'\\''")}'`;
  }

  cmd += ` \\\n  "${url}"`;

  return cmd;
}

export default function TestModal({ open, onOpenChange, integration, scenario }) {
  const [method, setMethod] = useState("GET");
  const [headersText, setHeadersText] = useState("");
  const [queryString, setQueryString] = useState("");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [activeTab, setActiveTab] = useState("test");

  useEffect(() => {
    if (open && scenario) {
      setMethod(scenario.method || "GET");
      setHeadersText(jsonToHeaderText(scenario.headers));
      setQueryString(jsonToQueryString(scenario.queryParams));
      try {
        const bodyObj = JSON.parse(scenario.bodyParams || "{}");
        setBody(Object.keys(bodyObj).length > 0 ? JSON.stringify(bodyObj, null, 2) : "");
      } catch {
        setBody("");
      }
      setResponse(null);
    }
  }, [open, scenario]);

  if (!integration || !scenario) return null;

  const mockUrlBase = `http://localhost:3000/mock/${integration.key}${scenario.endpoint}`;

  const mockUrl = (() => {
    const url = new URL(mockUrlBase);
    if (queryString) {
      const extra = queryString.startsWith("?") ? queryString.slice(1) : queryString;
      extra.split("&").forEach((pair) => {
        const [k, v] = pair.split("=");
        if (k) url.searchParams.append(decodeURIComponent(k), v ? decodeURIComponent(v) : "");
      });
    }
    return url.toString();
  })();

  const headersObj = headerTextToObj(headersText);
  const curlCommand = generateCurl(mockUrl, method, headersObj, body);

  async function handleTest() {
    setIsLoading(true);
    setResponse(null);
    try {
      const url = new URL(mockUrlBase);
      if (queryString) {
        const extra = queryString.startsWith("?") ? queryString.slice(1) : queryString;
        extra.split("&").forEach((pair) => {
          const [k, v] = pair.split("=");
          if (k) url.searchParams.append(decodeURIComponent(k), v ? decodeURIComponent(v) : "");
        });
      }

      const opts = {
        method,
        headers: {
          ...(body && ["POST", "PUT", "PATCH"].includes(method) ? { "Content-Type": "application/json" } : {}),
          ...headersObj,
        },
      };

      if (body && ["POST", "PUT", "PATCH"].includes(method)) {
        opts.body = body;
      }

      const startTime = performance.now();
      const res = await fetch(url.toString(), opts);
      const endTime = performance.now();
      const responseBody = await res.text();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseBody,
        responseTime: Math.round(endTime - startTime),
      });
      setActiveTab("response");
    } catch (err) {
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function copyCurl() {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    toast.success("cURL copied to clipboard");
  }

  function copyResponse() {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  }

  const tabButton = (id, icon, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        activeTab === id
          ? "bg-primary/10 text-primary border border-primary/20"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold tracking-wide flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            TEST ENDPOINT
          </DialogTitle>
        </DialogHeader>

        {/* Scenario Info Bar */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
          <Badge className={`${methodColors[method] || ""} text-[10px] font-mono font-bold`}>
            {method}
          </Badge>
          <code className="text-xs font-mono text-foreground truncate">{scenario.endpoint}</code>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {integration.name}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabButton("test", <Play className="h-3 w-3" />, "Test")}
          {tabButton("curl", <Terminal className="h-3 w-3" />, "cURL")}
          {response && tabButton("response", <Settings2 className="h-3 w-3" />, "Response")}
        </div>

        {/* ── TEST TAB ── */}
        {activeTab === "test" && (
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL</Label>
              <div className="mt-1 overflow-auto max-w-full rounded-md border border-border/40 bg-input">
                <code className="block p-2.5 text-xs font-mono text-foreground whitespace-break-spaces min-w-full">
                  {mockUrl}
                </code>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-[120px]">
                <Label htmlFor="method" className="text-[10px] uppercase tracking-wider text-muted-foreground">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method" className="bg-input border-border/40 h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label htmlFor="query" className="text-[10px] uppercase tracking-wider text-muted-foreground">Query String</Label>
                <Input
                  id="query"
                  placeholder="key=value&foo=bar"
                  value={queryString}
                  onChange={(e) => setQueryString(e.target.value)}
                  className="bg-input border-border/40 h-9 text-xs mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="headers" className="text-[10px] uppercase tracking-wider text-muted-foreground">Headers</Label>
              <Textarea
                id="headers"
                placeholder="X-Custom-Header: value&#10;Authorization: Bearer token"
                rows={3}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                className="bg-input border-border/40 font-mono text-xs mt-1 resize-none"
              />
            </div>

            {["POST", "PUT", "PATCH"].includes(method) && (
              <div>
                <Label htmlFor="body" className="text-[10px] uppercase tracking-wider text-muted-foreground">Body (JSON)</Label>
                <Textarea
                  id="body"
                  placeholder='{"key": "value"}'
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-input border-border/40 font-mono text-xs mt-1 resize-none"
                />
              </div>
            )}

            <Button
              onClick={handleTest}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-3px_hsl(163_100%_40%_/0.3)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── CURL TAB ── */}
        {activeTab === "curl" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Generated cURL Command</Label>
              <Button variant="ghost" size="sm" onClick={copyCurl} className="h-7 text-xs gap-1">
                {copiedCurl ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                {copiedCurl ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="overflow-auto max-h-64 rounded-lg border border-border/40 bg-input">
                <pre className="p-4 text-xs font-mono text-foreground whitespace-break-spaces leading-relaxed min-w-full">
                {curlCommand}
              </pre>
            </div>
          </div>
        )}

        {/* ── RESPONSE TAB ── */}
        {activeTab === "response" && response && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={`${statusColor(response.status)} text-xs font-semibold`}>
                {response.status} {response.statusText}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{response.responseTime}ms</span>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Response Headers</Label>
              <div className="overflow-auto max-h-32 rounded-lg border border-border/40 bg-input">
                <pre className="p-3 text-[11px] font-mono text-foreground whitespace-break-spaces min-w-full">
                  {JSON.stringify(response.headers, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Response Body</Label>
                <Button variant="ghost" size="sm" onClick={copyResponse} className="h-7 text-xs gap-1">
                  {copiedResponse ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  {copiedResponse ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="overflow-auto max-h-48 rounded-lg border border-border/40 bg-input">
                <pre className="p-3 text-[11px] font-mono text-foreground whitespace-break-spaces min-w-full">
                  {response.body}
                </pre>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs uppercase tracking-wider">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
