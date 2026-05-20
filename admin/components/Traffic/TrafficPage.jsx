import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { traffic, integrations } from "../../lib/api";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { RefreshCw, Trash2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { methodColors, statusColor, formatTime } from "../../lib/utils";
import ConfirmDialog from "../ConfirmDialog";

export default function TrafficPage() {
  const [integrationFilter, setIntegrationFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const queryClient = useQueryClient();
  const limit = 50;

  const { data: allIntegrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrations.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["traffic", offset, integrationFilter],
    queryFn: () =>
      traffic.list({
        limit,
        offset,
        integrationId: integrationFilter === "all" ? undefined : integrationFilter,
      }),
  });

  const clearMutation = useMutation({
    mutationFn: () => traffic.clear(integrationFilter === "all" ? undefined : integrationFilter),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["traffic"] });
      toast.success(res.message);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: traffic.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["traffic"] });
      setDetailId(null);
      toast.success("Traffic entry deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: detailEntry } = useQuery({
    queryKey: ["traffic", detailId],
    queryFn: () => traffic.getById(detailId),
    enabled: !!detailId,
  });

  const columns = [
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-semibold ${methodColors[row.original.method] || ""}`}
        >
          {row.original.method}
        </span>
      ),
    },
    {
      accessorKey: "path",
      header: "Path",
      cell: ({ row }) => (
        <code className="text-sm font-mono truncate block max-w-[300px]">
          {row.original.path}
        </code>
      ),
    },
    {
      accessorKey: "statusCode",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${statusColor(Number(row.original.statusCode))}`}
        >
          {row.original.statusCode}
        </span>
      ),
    },
    {
      accessorKey: "responseTime",
      header: "Response Time",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.responseTime}ms</span>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatTime(row.original.timestamp)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDetailId(row.original.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.entries || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total || 0) / limit),
    state: {
      pagination: { pageIndex: Math.floor(offset / limit), pageSize: limit },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Traffic Log</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["traffic"] })}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={clearMutation.isPending}
            onClick={() => setConfirmClearOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={integrationFilter} onValueChange={(v) => { setIntegrationFilter(v); setOffset(0); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Integrations" />
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No traffic logged yet.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          {data?.total || 0} total entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => setOffset((prev) => prev + limit)}
          >
            Next
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear all traffic entries?"
        description="This action cannot be undone. All traffic logs will be permanently removed."
        confirmLabel="Clear All"
        destructive
        loading={clearMutation.isPending}
        onConfirm={() => {
          clearMutation.mutate(undefined, {
            onSuccess: () => setConfirmClearOpen(false),
          });
        }}
      />

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Traffic Detail</DialogTitle>
          </DialogHeader>

          {detailEntry && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-semibold ${methodColors[detailEntry.method] || ""}`}
                >
                  {detailEntry.method}
                </span>
                <code className="text-sm font-mono">{detailEntry.path}</code>
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${statusColor(Number(detailEntry.statusCode))}`}
                >
                  {detailEntry.statusCode}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {detailEntry.responseTime}ms — {formatTime(detailEntry.timestamp)}
                </span>
              </div>

              <div className="space-y-2">
                <Label>Request Headers</Label>
                <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
                  {JSON.stringify(detailEntry.headers, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <Label>Query Parameters</Label>
                <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
                  {JSON.stringify(detailEntry.query, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <Label>Request Body</Label>
                <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
                  {JSON.stringify(detailEntry.body, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailId(null)}>
              Close
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteEntryMutation.isPending}
              onClick={() => deleteEntryMutation.mutate(detailId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children }) {
  return <p className="text-sm font-medium">{children}</p>;
}
