import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integrations, scenarios } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plus, ChevronLeft, Loader2, Upload } from "lucide-react";
import ScenarioList from "../Scenarios/ScenarioList";
import ScenarioForm from "../Scenarios/ScenarioForm";
import PostmanImportModal from "../PostmanImportModal";
import { toast } from "sonner";

export default function IntegrationDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: integration, isLoading: integrationLoading } = useQuery({
    queryKey: ["integrations", id],
    queryFn: () => integrations.getById(id),
  });

  const { data: allIntegrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrations.list(),
  });

  const { data: integrationScenariosRaw, isLoading: scenariosLoading } = useQuery({
    queryKey: ["integration-scenarios", id],
    queryFn: () => integrations.getScenarios(id),
  });

  const integrationScenarios = (integrationScenariosRaw || []).filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.endpoint?.toLowerCase().includes(term) ||
      s.method?.toLowerCase().includes(term) ||
      s.responseCode?.toString().includes(term)
    );
  });

  const createMutation = useMutation({
    mutationFn: ({ integrationId, ...data }) =>
      scenarios.create(integrationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-scenarios", id] });
      setFormOpen(false);
      toast.success("Scenario created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => scenarios.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-scenarios", id] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Scenario updated");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(data) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data });
    } else {
      createMutation.mutate({ integrationId: id, ...data });
    }
  }

  if (integrationLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Integration not found</p>
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/integrations" })}
          className="mt-4"
        >
          Back to Integrations
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/integrations" })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{integration.name}</h1>
          <code className="text-xs text-muted-foreground font-mono">
            {integration.key}
          </code>
        </div>
      </div>

      {integration.description && (
        <p className="text-muted-foreground mb-6">{integration.description}</p>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Scenarios</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import from Postman
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Input
          placeholder="Search scenarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {scenariosLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border bg-card rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <ScenarioList
          scenarios={integrationScenarios}
          integrations={allIntegrations || []}
          onEdit={(scenario) => {
            setEditing(scenario);
            setFormOpen(true);
          }}
        />
      )}

      <ScenarioForm
        open={formOpen}
        onOpenChange={setFormOpen}
        scenario={editing}
        integrations={allIntegrations || []}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        integrationId={id}
      />

      <PostmanImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        integrationId={id}
        integrationName={integration.name}
      />
    </div>
  );
}
