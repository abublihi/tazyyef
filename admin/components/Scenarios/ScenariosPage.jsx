import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scenarios, integrations } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ScenarioList from "./ScenarioList";
import ScenarioForm from "./ScenarioForm";

export default function ScenariosPage() {
  const [search, setSearch] = useState("");
  const [integrationFilter, setIntegrationFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: allIntegrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrations.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["scenarios", search],
    queryFn: () => scenarios.listAll(search),
  });

  const filteredScenarios = data?.filter((s) =>
    integrationFilter === "all" || s.integrationId === integrationFilter
  ) || [];

  const createMutation = useMutation({
    mutationFn: ({ integrationId, ...data }) =>
      scenarios.create(integrationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Scenario created");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => scenarios.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Scenario updated");
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

  function handleEdit(scenario) {
    setEditing(scenario);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Scenario
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search scenarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by integration..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Integrations</SelectItem>
            {allIntegrations?.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border bg-card rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <ScenarioList
          scenarios={filteredScenarios}
          integrations={allIntegrations || []}
          onEdit={handleEdit}
        />
      )}

      <ScenarioForm
        open={formOpen}
        onOpenChange={setFormOpen}
        scenario={editing}
        integrations={allIntegrations || []}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
