import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scenarioSchema } from "../../schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Loader2, Plus, X } from "lucide-react";

function KvEditor({ label, value, onChange }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (value && typeof value === "object") {
      setRows(Object.entries(value).map(([key, val]) => ({ key, value: val })));
    } else {
      setRows([]);
    }
  }, [value]);

  function addRow() {
    setRows([...rows, { key: "", value: "" }]);
  }

  function removeRow(index) {
    setRows(rows.filter((_, i) => i !== index));
    updateParent(rows.filter((_, i) => i !== index));
  }

  function updateRow(index, field, val) {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: val } : row
    );
    setRows(updated);
    updateParent(updated);
  }

  function updateParent(rows) {
    const obj = {};
    rows.forEach((row) => {
      if (row.key.trim()) {
        obj[row.key.trim()] = row.value;
      }
    });
    onChange(obj);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Key"
            value={row.key}
            onChange={(e) => updateRow(i, "key", e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Value"
            value={row.value}
            onChange={(e) => updateRow(i, "value", e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRow(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" />
        Add
      </Button>
    </div>
  );
}

export default function ScenarioForm({
  open,
  onOpenChange,
  scenario,
  integrations,
  onSubmit,
  isPending,
  integrationId: preselectedIntegrationId,
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(scenarioSchema),
    defaultValues: {
      integrationId: preselectedIntegrationId || "",
      method: "GET",
      endpoint: "",
      headers: {},
      queryParams: {},
      bodyParams: {},
      responseCode: 200,
      responseBody: "{}",
      rateLimit: "",
      rateWindow: "",
    },
  });

  useEffect(() => {
    if (scenario && open) {
      reset({
        integrationId: scenario.integrationId || "",
        method: scenario.method || "GET",
        endpoint: scenario.endpoint || "",
        headers: JSON.parse(scenario.headers || "{}"),
        queryParams: JSON.parse(scenario.queryParams || "{}"),
        bodyParams: JSON.parse(scenario.bodyParams || "{}"),
        responseCode: Number(scenario.responseCode) || 200,
        responseBody: scenario.responseBody || "{}",
        rateLimit: scenario.rateLimit || "",
        rateWindow: scenario.rateWindow || "",
      });
    } else if (!scenario && open) {
      reset({
        integrationId: preselectedIntegrationId || "",
        method: "GET",
        endpoint: "",
        headers: {},
        queryParams: {},
        bodyParams: {},
        responseCode: 200,
        responseBody: "{}",
        rateLimit: "",
        rateWindow: "",
      });
    }
  }, [scenario, open, reset, preselectedIntegrationId]);

  function handleOpenChange(open) {
    onOpenChange(open);
    if (!open) reset();
  }

  function handleFormSubmit(data) {
    onSubmit(data);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {scenario ? "Edit Scenario" : "New Scenario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {!preselectedIntegrationId && (
            <div className="space-y-2">
              <Label htmlFor="integrationId">Integration</Label>
              <Select
                value={watch("integrationId")}
                onValueChange={(v) => setValue("integrationId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select integration..." />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.integrationId && (
                <p className="text-sm text-destructive">
                  {errors.integrationId.message}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <div className="space-y-2 w-[120px]">
              <Label htmlFor="method">Method</Label>
              <Select
                value={watch("method")}
                onValueChange={(v) => setValue("method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"].map(
                    (m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="/users"
                {...register("endpoint")}
              />
              {errors.endpoint && (
                <p className="text-sm text-destructive">
                  {errors.endpoint.message}
                </p>
              )}
            </div>
          </div>

          <KvEditor
            label="Match Headers"
            value={watch("headers")}
            onChange={(v) => setValue("headers", v)}
          />

          <KvEditor
            label="Match Query Parameters"
            value={watch("queryParams")}
            onChange={(v) => setValue("queryParams", v)}
          />

          <KvEditor
            label="Match Body Parameters"
            value={watch("bodyParams")}
            onChange={(v) => setValue("bodyParams", v)}
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="responseCode">Response Code</Label>
              <Input
                id="responseCode"
                type="number"
                min="100"
                max="599"
                {...register("responseCode")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Rate Limit</Label>
              <Input
                id="rateLimit"
                type="number"
                min="1"
                placeholder="50"
                {...register("rateLimit")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateWindow">Window (ms)</Label>
              <Input
                id="rateWindow"
                type="number"
                min="1000"
                placeholder="60000"
                {...register("rateWindow")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responseBody">Response Body (JSON)</Label>
            <Textarea
              id="responseBody"
              rows={6}
              className="font-mono text-sm"
              {...register("responseBody")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Scenario"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
