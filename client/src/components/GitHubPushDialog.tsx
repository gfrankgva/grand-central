import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GitHubPushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubPushDialog({ open, onOpenChange }: GitHubPushDialogProps) {
  const { toast } = useToast();
  const [repoName, setRepoName] = useState("grand-central");
  const [description, setDescription] = useState("Multi-LLM collaborative workspace with breathing UI system");
  const [isPrivate, setIsPrivate] = useState(false);
  const [result, setResult] = useState<{ repoUrl?: string; message?: string } | null>(null);

  const createRepoMutation = useMutation({
    mutationFn: async (data: { repoName: string; description: string; isPrivate: boolean }) => {
      // Step 1: Create repository
      const createResponse = await fetch('/api/github/create-and-push', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create repository');
      }
      const createResult = await createResponse.json();
      
      // Step 2: Get user info for push
      const userResponse = await fetch('/api/github/user');
      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }
      const user = await userResponse.json();
      
      // Step 3: Push code to repository
      const pushResponse = await fetch('/api/github/push', {
        method: 'POST',
        body: JSON.stringify({ 
          owner: user.login, 
          repo: data.repoName 
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!pushResponse.ok) {
        const error = await pushResponse.json();
        throw new Error(error.error || 'Repository created but failed to push code');
      }
      
      const pushResult = await pushResponse.json();
      
      return {
        repoUrl: createResult.repoUrl,
        message: `Repository created and ${pushResult.message?.toLowerCase()}!`,
        commitUrl: pushResult.commitUrl,
      };
    },
    onSuccess: (data: { repoUrl?: string; message?: string; commitUrl?: string }) => {
      setResult(data);
      toast({
        title: "Success!",
        description: data.message || "Repository created and code pushed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to push to GitHub. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    createRepoMutation.mutate({ repoName, description, isPrivate });
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Push to GitHub</DialogTitle>
          <DialogDescription>
            Create a new GitHub repository and push your Grand Central code.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="p-4 bg-accent rounded-md">
              <p className="text-sm font-medium mb-2">Repository Created!</p>
              <p className="text-sm text-muted-foreground mb-3">{result.message}</p>
              {result.repoUrl && (
                <a
                  href={result.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  data-testid="link-github-repo"
                >
                  View on GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose} data-testid="button-close-github-dialog">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo-name">Repository Name</Label>
              <Input
                id="repo-name"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="grand-central"
                required
                data-testid="input-repo-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Multi-LLM collaborative workspace"
                data-testid="input-repo-description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                data-testid="checkbox-private-repo"
              />
              <Label htmlFor="private" className="text-sm font-normal cursor-pointer">
                Make repository private
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createRepoMutation.isPending}
                data-testid="button-cancel-github"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRepoMutation.isPending}
                data-testid="button-push-github"
              >
                {createRepoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  "Push to GitHub"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
