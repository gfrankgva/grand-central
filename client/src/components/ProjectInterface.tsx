import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, File, MessageSquare, Paperclip, Plus, Settings, Share, Edit3, Copy, Trash2, Cherry, SlidersHorizontal, Split } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Project, Discussion, ContextItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectInterfaceProps {
  projectId: string;
  selectedDiscussionId?: string | null;
  onSelectDiscussion?: (discussionId: string | null) => void;
}

export function ProjectInterface({ 
  projectId, 
  selectedDiscussionId, 
  onSelectDiscussion 
}: ProjectInterfaceProps) {
  const [activeTab, setActiveTab] = useState("conversations");
  const [showInstructionsEdit, setShowInstructionsEdit] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [tempInstructions, setTempInstructions] = useState("");
  const [tempName, setTempName] = useState("");
  const [cloneName, setCloneName] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project data
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId
  });

  // Fetch discussions for this project
  const { data: discussions = [], isLoading: isLoadingDiscussions } = useQuery<Discussion[]>({
    queryKey: ["/api/projects", projectId, "discussions"],
    enabled: !!projectId
  });

  // Fetch project context items (files/links)
  const { data: contextItems = [], isLoading: isLoadingContext } = useQuery<ContextItem[]>({
    queryKey: ["/api/projects", projectId, "context"],
    enabled: !!projectId
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (updates: Partial<Project>) => 
      apiRequest("PATCH", `/api/projects/${projectId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Project Updated",
        description: "Project has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Clone project mutation
  const cloneProjectMutation = useMutation({
    mutationFn: (name: string) => 
      apiRequest("POST", `/api/projects/${projectId}/clone`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCloneDialog(false);
      setCloneName("");
      toast({
        title: "Project Cloned",
        description: "Project has been cloned successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to clone project",
        variant: "destructive",
      });
    },
  });

  const handleUpdateInstructions = () => {
    updateProjectMutation.mutate({ instructions: tempInstructions });
    setShowInstructionsEdit(false);
  };

  const handleRenameProject = () => {
    updateProjectMutation.mutate({ name: tempName });
    setShowRenameDialog(false);
    setTempName("");
  };

  const handleCloneProject = () => {
    if (cloneName.trim()) {
      cloneProjectMutation.mutate(cloneName.trim());
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    );
  }


  const files = contextItems.filter(item => item.type === "file");
  const links = contextItems.filter(item => item.type === "link");

  return (
    <div className="flex-1 flex flex-col h-full" data-testid="project-interface">
      {/* Project Header - Grok Style */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cherry className="w-5 h-5 text-purple-500" />
            <h1 className="text-lg font-medium" data-testid="project-name">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="project-header-menu">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    setTempName(project.name);
                    setShowRenameDialog(true);
                  }}
                  data-testid="button-rename-project-header"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Rename Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setCloneName(`${project.name} (Copy)`);
                    setShowCloneDialog(true);
                  }}
                  data-testid="button-clone-project-header"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (window.confirm(`Share link copied to clipboard!`)) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  data-testid="button-share-project"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Split className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Project Instructions - Card Style */}
        <div className="mt-4">
          {showInstructionsEdit ? (
            <div className="space-y-2">
              <Textarea
                value={tempInstructions}
                onChange={(e) => setTempInstructions(e.target.value)}
                placeholder="The goal is to develop..."
                className="min-h-[100px]"
                data-testid="textarea-instructions"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleUpdateInstructions}
                  disabled={updateProjectMutation.isPending}
                  data-testid="button-save-instructions"
                >
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowInstructionsEdit(false)}
                  data-testid="button-cancel-instructions"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Card 
              className="p-4 cursor-pointer hover-elevate"
              onClick={() => {
                setTempInstructions(project.instructions || "");
                setShowInstructionsEdit(true);
              }}
              data-testid="instructions-display"
            >
              <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">Instructions</span>
              </div>
              {project.instructions ? (
                <p className="text-sm text-muted-foreground">{project.instructions}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The goal is to develop...
                </p>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Tabbed Content - Underline Style */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("files")}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "files" 
                    ? "border-foreground text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-files"
              >
                Files
              </button>
              <button
                onClick={() => setActiveTab("conversations")}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "conversations" 
                    ? "border-foreground text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-conversations"
              >
                Conversations
              </button>
            </div>
          </div>
          
          <TabsContent value="files" className="h-full p-6">
            <div className="h-full">
              {files.length === 0 && links.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Paperclip className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="text-base font-medium mb-1">No files yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by attaching files to your project. They will be used in all chats in this project.
                  </p>
                  <Button variant="outline" size="sm" className="mx-auto" data-testid="button-attach-files">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {files.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Files</h3>
                      <div className="grid gap-2">
                        {files.map((file) => (
                          <Card key={file.id} className="p-4 hover-elevate cursor-pointer">
                            <div className="flex items-center gap-3">
                              <File className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{file.name}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {links.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Links</h3>
                      <div className="grid gap-2">
                        {links.map((link) => (
                          <Card key={link.id} className="p-4 hover-elevate cursor-pointer">
                            <div className="flex items-center gap-3">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">{link.name}</span>
                                <p className="text-xs text-muted-foreground mt-1">{link.content}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="conversations" className="h-full p-6">
            <div className="space-y-4">
              {discussions.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="text-base font-medium mb-1">Start a conversation in this project</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first discussion to begin collaborating with AI assistants.
                  </p>
                  <Button size="sm" data-testid="button-create-discussion">
                    <Plus className="w-4 h-4 mr-2" />
                    New Discussion
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {discussions.map((discussion) => (
                    <Card 
                      key={discussion.id} 
                      className={`p-3 hover-elevate cursor-pointer transition-colors ${
                        selectedDiscussionId === discussion.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => onSelectDiscussion?.(discussion.id)}
                      data-testid={`discussion-${discussion.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{discussion.name}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {discussion.createdAt ? new Date(discussion.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ""}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Enter project name"
                data-testid="input-project-name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRenameDialog(false)}
                data-testid="button-cancel-rename"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRenameProject}
                disabled={updateProjectMutation.isPending || !tempName.trim()}
                data-testid="button-confirm-rename"
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clone-name">New Project Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned project"
                data-testid="input-clone-name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCloneDialog(false)}
                data-testid="button-cancel-clone"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCloneProject}
                disabled={cloneProjectMutation.isPending || !cloneName.trim()}
                data-testid="button-confirm-clone"
              >
                Clone
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}