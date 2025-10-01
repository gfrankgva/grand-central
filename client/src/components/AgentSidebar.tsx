import { useState } from "react";
import { Plus, Settings, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Agent, AgentMode } from "@shared/schema";
import { CreateAgentDialog } from "./CreateAgentDialog";

interface AgentSidebarProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

const MODE_COLORS = {
  plasma: "mode-plasma",
  gas: "mode-gas", 
  liquid: "mode-liquid",
  solid: "mode-solid"
};

const MODE_ICONS = {
  plasma: "🌀",
  gas: "💨",
  liquid: "💧", 
  solid: "🔷"
};

export function AgentSidebar({ selectedAgentId, onSelectAgent }: AgentSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["/api/agents"]
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => apiRequest("DELETE", `/api/agents/${agentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      if (selectedAgentId && !agents.find(a => a.id === selectedAgentId)) {
        onSelectAgent("");
      }
    }
  });

  const handleCreateAgent = () => {
    setShowCreateDialog(true);
  };

  const handleDeleteAgent = (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this agent? This will also delete all its conversations.")) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 border-r bg-sidebar p-4">
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-sidebar flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Grand Central
          </h2>
          <Button size="icon" variant="outline" onClick={handleCreateAgent} data-testid="button-create-agent">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={handleCreateAgent} className="w-full" data-testid="button-new-agent">
          <Plus className="w-4 h-4 mr-2" />
          New Agent
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No agents yet</p>
            <p className="text-xs">Create your first agent to get started</p>
          </div>
        ) : (
          agents.map((agent) => (
            <Card
              key={agent.id}
              className={`p-3 cursor-pointer transition-colors hover-elevate ${
                selectedAgentId === agent.id
                  ? "bg-sidebar-accent border-sidebar-accent"
                  : "hover:bg-sidebar-accent/50"
              }`}
              onClick={() => onSelectAgent(agent.id)}
              data-testid={`agent-card-${agent.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{MODE_ICONS[agent.currentMode as AgentMode]}</span>
                    <h3 className="font-medium truncate" data-testid={`agent-name-${agent.id}`}>
                      {agent.name}
                    </h3>
                  </div>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {agent.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      data-testid={`agent-mode-${agent.id}`}
                    >
                      {agent.currentMode}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeleteAgent(agent.id, e)}
                      data-testid={`button-delete-agent-${agent.id}`}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onAgentCreated={(agent) => {
          onSelectAgent(agent.id);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}