import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Project, type Discussion, type InsertDiscussion } from "@shared/schema";

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  onDiscussionCreated: (discussion: Discussion) => void;
}

export function CreateDiscussionDialog({
  open,
  onOpenChange,
  projectId: initialProjectId,
  onDiscussionCreated,
}: CreateDiscussionDialogProps) {
  const [name, setName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const { toast } = useToast();

  // Fetch all projects for the dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: open && !initialProjectId, // Only fetch if we don't have a preset project
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (data: { name: string; projectId: string }) => {
      const response = await apiRequest("POST", `/api/projects/${data.projectId}/discussions`, {
        name: data.name,
      });
      return response.json() as Promise<Discussion>;
    },
    onSuccess: (discussion) => {
      onDiscussionCreated(discussion);
      resetForm();
      toast({
        title: "Discussion Created",
        description: `"${discussion.name}" has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create discussion",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    if (!initialProjectId) {
      setSelectedProjectId("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectId = initialProjectId || selectedProjectId;
    if (!name.trim() || !projectId) return;

    createDiscussionMutation.mutate({
      name: name.trim(),
      projectId,
    });
  };

  const handleClose = () => {
    if (!createDiscussionMutation.isPending) {
      resetForm();
      onOpenChange(false);
    }
  };

  // Reset selectedProjectId when initialProjectId changes
  if (initialProjectId && selectedProjectId !== initialProjectId) {
    setSelectedProjectId(initialProjectId);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-create-discussion">
        <DialogHeader>
          <DialogTitle>Create New Discussion</DialogTitle>
          <DialogDescription>
            Start a new discussion within your project to collaborate with AI assistants on specific topics.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discussion-name">Discussion Name *</Label>
            <Input
              id="discussion-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Feature Requirements, Market Analysis"
              required
              data-testid="input-discussion-name"
            />
          </div>

          {!initialProjectId && (
            <div className="space-y-2">
              <Label htmlFor="discussion-project">Project *</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId}
                required
              >
                <SelectTrigger data-testid="select-discussion-project">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={createDiscussionMutation.isPending}
              data-testid="button-cancel-discussion"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || (!initialProjectId && !selectedProjectId) || createDiscussionMutation.isPending}
              data-testid="button-create-discussion-submit"
            >
              {createDiscussionMutation.isPending ? "Creating..." : "Create Discussion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}