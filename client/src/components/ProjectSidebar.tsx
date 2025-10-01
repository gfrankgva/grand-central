import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Folder, MessageCircle, Plus, MoreHorizontal, Trash2, FolderOpen, Cherry, Edit3, Copy, Share } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Project, type Discussion } from "@shared/schema";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateDiscussionDialog } from "./CreateDiscussionDialog";

interface ProjectSidebarProps {
  selectedProjectId: string | null;
  selectedDiscussionId: string | null;
  onSelectProject: (id: string) => void;
  onSelectDiscussion: (id: string) => void;
}

export function ProjectSidebar({
  selectedProjectId,
  selectedDiscussionId,
  onSelectProject,
  onSelectDiscussion,
}: ProjectSidebarProps) {
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showCreateDiscussionDialog, setShowCreateDiscussionDialog] = useState(false);
  const [newDiscussionProjectId, setNewDiscussionProjectId] = useState<string | null>(null);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [showRenameDiscussionDialog, setShowRenameDiscussionDialog] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameDiscussionId, setRenameDiscussionId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  // Fetch discussions for each project
  const projectDiscussions = useQuery({
    queryKey: ["/api/projects", "discussions", projects.map(p => p.id)],
    queryFn: async () => {
      if (projects.length === 0) return {};
      
      const discussionPromises = projects.map(async (project) => {
        const response = await fetch(`/api/projects/${project.id}/discussions`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error(`Failed to fetch discussions for project ${project.id}`);
        const discussions: Discussion[] = await response.json();
        return { [project.id]: discussions };
      });
      
      const results = await Promise.all(discussionPromises);
      return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    },
    enabled: projects.length > 0,
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => apiRequest("DELETE", `/api/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", "discussions"] });
      toast({
        title: "Project Deleted",
        description: "The project and all its discussions have been removed.",
      });
      // Clear selection if deleted project was selected
      if (selectedProjectId && !projects.find(p => p.id === selectedProjectId)) {
        onSelectProject("");
        onSelectDiscussion("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  // Delete discussion mutation
  const deleteDiscussionMutation = useMutation({
    mutationFn: (discussionId: string) => apiRequest("DELETE", `/api/discussions/${discussionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", "discussions"] });
      toast({
        title: "Discussion Deleted",
        description: "The discussion has been removed.",
      });
      // Clear selection if deleted discussion was selected
      if (selectedDiscussionId === deleteDiscussionMutation.variables) {
        onSelectDiscussion("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete discussion",
        variant: "destructive",
      });
    },
  });

  // Rename project mutation
  const renameProjectMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => 
      apiRequest("PATCH", `/api/projects/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Renamed",
        description: "The project has been renamed successfully.",
      });
      setShowRenameProjectDialog(false);
      setRenameProjectId(null);
      setTempName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename project",
        variant: "destructive",
      });
    },
  });

  // Rename discussion mutation
  const renameDiscussionMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => 
      apiRequest("PATCH", `/api/discussions/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", "discussions"] });
      toast({
        title: "Discussion Renamed",
        description: "The discussion has been renamed successfully.",
      });
      setShowRenameDiscussionDialog(false);
      setRenameDiscussionId(null);
      setTempName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename discussion",
        variant: "destructive",
      });
    },
  });

  // Clone discussion mutation
  const cloneDiscussionMutation = useMutation({
    mutationFn: (discussionId: string) => 
      apiRequest("POST", `/api/discussions/${discussionId}/clone`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", "discussions"] });
      toast({
        title: "Discussion Cloned",
        description: "The discussion has been cloned successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clone discussion",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${projectName}"? This will also delete all discussions and messages in this project.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleDeleteDiscussion = (discussionId: string, discussionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${discussionName}"? This will also delete all messages in this discussion.`)) {
      deleteDiscussionMutation.mutate(discussionId);
    }
  };

  const handleNewDiscussion = (projectId: string) => {
    setNewDiscussionProjectId(projectId);
    setShowCreateDiscussionDialog(true);
  };

  const handleProjectCreated = (project: Project) => {
    onSelectProject(project.id);
    setShowCreateProjectDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  const handleDiscussionCreated = (discussion: Discussion) => {
    onSelectProject(discussion.projectId);
    onSelectDiscussion(discussion.id);
    setShowCreateDiscussionDialog(false);
    setNewDiscussionProjectId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/projects", "discussions"] });
  };

  if (projectsLoading) {
    return (
      <Sidebar data-testid="project-sidebar">
        <SidebarHeader>
          <div className="p-4">
            <div className="h-8 bg-muted rounded animate-pulse mb-4" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <>
      <Sidebar data-testid="project-sidebar">
        <SidebarHeader>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-5 h-5" />
              <h2 className="text-base font-medium">Projects</h2>
            </div>
            
            {/* New Project Menu Item */}
            <button
              onClick={() => setShowCreateProjectDialog(true)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm hover-elevate active-elevate-2 rounded-md transition-colors"
              data-testid="button-new-project"
            >
              <Cherry className="w-4 h-4 text-purple-500" />
              <span>New Project</span>
            </button>
            
            {/* See All Link */}
            <button
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
              data-testid="link-see-all"
            >
              See all
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {projects.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No projects yet</p>
                    <p className="text-xs">Create your first project to get started</p>
                  </div>
                ) : (
                  projects.map((project) => {
                    const discussions = (projectDiscussions.data as any)?.[project.id] || [];
                    const isProjectSelected = selectedProjectId === project.id;
                    
                    return (
                      <SidebarMenuItem key={project.id}>
                        <div className="group relative flex items-center w-full gap-1">
                          <SidebarMenuButton
                            isActive={isProjectSelected}
                            onClick={() => onSelectProject(project.id)}
                            data-testid={`project-button-${project.id}`}
                            className="flex-1 pr-8"
                          >
                            <Folder className="w-4 h-4" />
                            <span data-testid={`project-name-${project.id}`}>{project.name}</span>
                          </SidebarMenuButton>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                data-testid={`project-menu-${project.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleNewDiscussion(project.id)}
                              data-testid={`button-new-discussion-${project.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              New Discussion
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameProjectId(project.id);
                                setTempName(project.name);
                                setShowRenameProjectDialog(true);
                              }}
                              data-testid={`button-rename-project-${project.id}`}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Rename Project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteProject(project.id, project.name, e as any)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>

                        {discussions.length > 0 && (
                          <SidebarMenuSub className="gap-0.5 mt-0.5">
                            {discussions.map((discussion: Discussion) => (
                              <SidebarMenuSubItem key={discussion.id}>
                                <div className="group relative flex items-center w-full">
                                  <SidebarMenuSubButton
                                    isActive={selectedDiscussionId === discussion.id}
                                    onClick={() => {
                                      onSelectProject(project.id);
                                      onSelectDiscussion(discussion.id);
                                    }}
                                    data-testid={`discussion-button-${discussion.id}`}
                                    className="flex-1 pr-8"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    <span data-testid={`discussion-name-${discussion.id}`}>
                                      {discussion.name}
                                    </span>
                                  </SidebarMenuSubButton>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                        data-testid={`discussion-menu-${discussion.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="w-3 h-3" />
                                        <span className="sr-only">More</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                  <DropdownMenuContent side="right" align="start">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameDiscussionId(discussion.id);
                                        setTempName(discussion.name);
                                        setShowRenameDiscussionDialog(true);
                                      }}
                                      data-testid={`button-rename-discussion-${discussion.id}`}
                                    >
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = window.location.href;
                                        navigator.clipboard.writeText(url);
                                        toast({
                                          title: "Link Copied",
                                          description: "Discussion link copied to clipboard.",
                                        });
                                      }}
                                      data-testid={`button-share-discussion-${discussion.id}`}
                                    >
                                      <Share className="w-4 h-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Clone "${discussion.name}"?`)) {
                                          cloneDiscussionMutation.mutate(discussion.id);
                                        }
                                      }}
                                      data-testid={`button-clone-discussion-${discussion.id}`}
                                    >
                                      <Copy className="w-4 h-4 mr-2" />
                                      Clone
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => handleDeleteDiscussion(discussion.id, discussion.name, e as any)}
                                      className="text-destructive focus:text-destructive"
                                      data-testid={`button-delete-discussion-${discussion.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <CreateProjectDialog
        open={showCreateProjectDialog}
        onOpenChange={setShowCreateProjectDialog}
        onProjectCreated={handleProjectCreated}
      />

      <CreateDiscussionDialog
        open={showCreateDiscussionDialog}
        onOpenChange={setShowCreateDiscussionDialog}
        projectId={newDiscussionProjectId}
        onDiscussionCreated={handleDiscussionCreated}
      />

      {/* Rename Project Dialog */}
      <Dialog open={showRenameProjectDialog} onOpenChange={setShowRenameProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name-sidebar">Project Name</Label>
              <Input
                id="project-name-sidebar"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Enter project name"
                data-testid="input-rename-project"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRenameProjectDialog(false)}
                data-testid="button-cancel-rename-project"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (renameProjectId && tempName.trim()) {
                    renameProjectMutation.mutate({ id: renameProjectId, name: tempName.trim() });
                  }
                }}
                disabled={renameProjectMutation.isPending || !tempName.trim()}
                data-testid="button-confirm-rename-project"
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Discussion Dialog */}
      <Dialog open={showRenameDiscussionDialog} onOpenChange={setShowRenameDiscussionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="discussion-name-sidebar">Discussion Name</Label>
              <Input
                id="discussion-name-sidebar"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Enter discussion name"
                data-testid="input-rename-discussion"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRenameDiscussionDialog(false)}
                data-testid="button-cancel-rename-discussion"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (renameDiscussionId && tempName.trim()) {
                    renameDiscussionMutation.mutate({ id: renameDiscussionId, name: tempName.trim() });
                  }
                }}
                disabled={renameDiscussionMutation.isPending || !tempName.trim()}
                data-testid="button-confirm-rename-discussion"
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}