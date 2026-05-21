import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { integrationSchema } from "../../schemas";
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
import { Loader2 } from "lucide-react";

export default function IntegrationForm({ open, onOpenChange, integration, onSubmit, isPending }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: "",
      description: "",
      key: "",
    },
  });

  // Populate form when editing an existing integration
  useEffect(() => {
    if (open && integration) {
      reset({
        name: integration.name || "",
        description: integration.description || "",
        key: integration.key || "",
      });
    } else if (open && !integration) {
      reset({
        name: "",
        description: "",
        key: "",
      });
    }
  }, [open, integration, reset]);

  function handleOpenChange(open) {
    onOpenChange(open);
    if (!open) reset();
  }

  function handleFormSubmit(data) {
    const payload = { name: data.name, description: data.description };
    if (data.key && data.key.trim()) {
      payload.key = data.key.trim();
    }
    onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold tracking-wide">
            {integration ? "EDIT INTEGRATION" : "NEW INTEGRATION"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Payment Gateway"
              className="h-10"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this integration..."
              className="min-h-[80px] resize-none"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key" className="text-xs uppercase tracking-wider text-muted-foreground">
              Key
            </Label>
            <Input
              id="key"
              className="font-mono h-10"
              placeholder="(auto-generated)"
              {...register("key")}
            />
            <p className="text-[10px] text-muted-foreground/70">
              Leave blank to auto-generate a unique key
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-xs uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-3px_hsl(163_100%_40%_/0.3)]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Integration"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
