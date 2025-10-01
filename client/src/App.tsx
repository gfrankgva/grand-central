import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ProjectInterface } from "@/components/ProjectInterface";
import { DiscussionInterface } from "@/components/DiscussionInterface";
import { Settings } from "@/components/Settings";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import Agents from "@/pages/Agents";
import Metrics from "@/pages/Metrics";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Home, Bot, BarChart3, PanelLeftClose, PanelRightClose, Plus, Menu } from "lucide-react";
import { Link } from "wouter";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { Project } from "@shared/schema";

function GrandCentral() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  // Fetch projects to auto-select the first one
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  // Auto-select first project if no project is selected and projects exist
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Custom sidebar width for collaborative workspace
  const style = {
    "--sidebar-width": "20rem",       // 320px for project navigation
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="grand-central-app">
        {/* Project Management Sidebar */}
        <ProjectSidebar 
          selectedProjectId={selectedProjectId}
          selectedDiscussionId={selectedDiscussionId}
          onSelectProject={setSelectedProjectId}
          onSelectDiscussion={setSelectedDiscussionId}
        />
        
        <div className="flex flex-col flex-1">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold">Grand Central</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/" data-testid="link-home">
                <Button variant="ghost" size="icon">
                  <Home className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/agents" data-testid="link-agents">
                <Button variant="ghost" size="icon">
                  <Bot className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/metrics" data-testid="link-metrics">
                <Button variant="ghost" size="icon">
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/settings" data-testid="link-settings">
                <Button variant="ghost" size="icon">
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/settings" component={Settings} />
              <Route path="/agents" component={Agents} />
              <Route path="/metrics" component={Metrics} />
              <Route path="/">
                {selectedProjectId ? (
                  <PanelGroup direction="horizontal" className="flex-1">
                    {/* Column 2: Project Details with Files/Conversations tabs */}
                    <Panel defaultSize={35} minSize={25}>
                      <ProjectInterface 
                        projectId={selectedProjectId}
                        selectedDiscussionId={selectedDiscussionId}
                        onSelectDiscussion={setSelectedDiscussionId}
                      />
                    </Panel>
                    
                    <PanelResizeHandle className="w-2 bg-border hover:bg-accent transition-colors" />
                    
                    {/* Column 3: Discussion Content */}
                    <Panel defaultSize={65} minSize={40}>
                      {selectedDiscussionId ? (
                        <DiscussionInterface 
                          projectId={selectedProjectId}
                          discussionId={selectedDiscussionId}
                          onBack={() => setSelectedDiscussionId(null)}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center h-full bg-muted/20" data-testid="no-discussion-selected">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Bot className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
                            <p className="text-muted-foreground max-w-md">
                              Choose a conversation from the list or create a new one to start collaborating with multiple LLMs.
                            </p>
                          </div>
                        </div>
                      )}
                    </Panel>
                  </PanelGroup>
                ) : (
                  <div className="flex-1 flex items-center justify-center" data-testid="welcome-screen">
                    <div className="text-center max-w-lg px-4">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Home className="w-10 h-10 text-primary" />
                      </div>
                      <h2 className="text-3xl font-semibold mb-3">Welcome to Grand Central</h2>
                      <p className="text-muted-foreground text-lg mb-8">
                        Your collaborative workspace for multi-LLM conversations
                      </p>
                      
                      <div className="space-y-4">
                        <Button 
                          size="lg"
                          onClick={() => setShowCreateProjectDialog(true)}
                          className="gap-2"
                          data-testid="button-create-first-project"
                        >
                          <Plus className="w-5 h-5" />
                          Create Your First Project
                        </Button>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Menu className="w-4 h-4" />
                          <span>Click the menu button in the top-left to view existing projects</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Route>
            </Switch>
          </main>
        </div>
      </div>
      
      <CreateProjectDialog 
        open={showCreateProjectDialog}
        onOpenChange={setShowCreateProjectDialog}
        onProjectCreated={(project: Project) => {
          setSelectedProjectId(project.id);
          setShowCreateProjectDialog(false);
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        }}
      />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GrandCentral />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;