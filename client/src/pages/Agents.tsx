import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Trash2, Brain } from "lucide-react";
import { CreateAgentDialog } from "@/components/CreateAgentDialog";
import { Agent } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Agents() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"]
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => apiRequest("DELETE", `/api/agents/${agentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent Deleted",
        description: "The agent has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      });
    }
  });

  const handleCreateAgent = (agent: Agent) => {
    setShowCreateDialog(false);
    // No need for additional handling as the CreateAgentDialog already shows a toast
  };

  const handleDeleteAgent = (agentId: string, agentName: string) => {
    if (confirm(`Are you sure you want to delete "${agentName}"? This action cannot be undone.`)) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  const getModeEmoji = (mode: string) => {
    switch (mode) {
      case 'plasma': return '🌀';
      case 'gas': return '💨';
      case 'liquid': return '💧';
      case 'solid': return '🔷';
      default: return '🤖';
    }
  };

  const getLLMIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖';
      case 'claude': return '🧠';
      case 'deepseek': return '🔍';
      default: return '🤖';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="agents-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage your specialized AI agents for different thinking modes and tasks
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
          data-testid="button-create-agent"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12" data-testid="agents-empty">
          <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No agents yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first AI agent to get started with specialized assistance
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
            data-testid="button-create-first-agent"
          >
            <Plus className="w-4 h-4" />
            Create Your First Agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="agents-list">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="hover-elevate"
              data-testid={`agent-card-${agent.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">
                      {getModeEmoji(agent.currentMode)} {getLLMIcon(agent.llmProvider)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      {agent.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAgent(agent.id, agent.name)}
                    disabled={deleteAgentMutation.isPending}
                    data-testid={`button-delete-agent-${agent.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {agent.currentMode} mode
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {agent.llmProvider}
                  </Badge>
                </div>
                
                {agent.createdBy === 'companion' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Brain className="w-3 h-3" />
                    Created by Companion Agent
                  </div>
                )}

                {agent.systemPrompt && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    <p className="line-clamp-3">{agent.systemPrompt}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Created {new Date(agent.createdAt!).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onAgentCreated={handleCreateAgent}
      />
    </div>
  );
}