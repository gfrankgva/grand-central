import { Activity, Brain, MessageCircle, Zap, Wifi, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Agent, Message } from "@shared/schema";

interface AgentMonitoringProps {
  selectedAgentId: string | null;
}

export function AgentMonitoring({ selectedAgentId }: AgentMonitoringProps) {
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"]
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/agents", selectedAgentId, "messages"],
    enabled: !!selectedAgentId
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const userMessages = messages.filter(m => m.role === "user");
  const aiMessages = messages.filter(m => m.role === "assistant");
  
  // Calculate mode distribution
  const modeStats = messages.reduce((acc, msg) => {
    acc[msg.mode] = (acc[msg.mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalMessages = messages.length;

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b bg-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Monitor
        </h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">OpenAI API</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Database</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                Ready
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Platform Statistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Platform Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Agents</span>
              <span className="font-semibold" data-testid="stat-total-agents">{agents.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Sessions</span>
              <span className="font-semibold">{selectedAgentId ? 1 : 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Messages</span>
              <span className="font-semibold" data-testid="stat-total-messages">{totalMessages}</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Agent Details */}
        {selectedAgent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Agent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agent Name</span>
                <span className="font-semibold text-xs truncate max-w-20" data-testid="selected-agent-name">
                  {selectedAgent.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Mode</span>
                <Badge variant="outline" className="text-xs" data-testid="selected-agent-mode">
                  {selectedAgent.currentMode}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Messages</span>
                <span className="font-semibold" data-testid="selected-agent-messages">{totalMessages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User Inputs</span>
                <span className="font-semibold">{userMessages.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AI Responses</span>
                <span className="font-semibold">{aiMessages.length}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mode Distribution */}
        {totalMessages > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Mode Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(modeStats).map(([mode, count]) => {
                const percentage = Math.round((count / totalMessages) * 100);
                const modeIcons = {
                  plasma: "🌀",
                  gas: "💨", 
                  liquid: "💧",
                  solid: "🔷"
                };
                
                return (
                  <div key={mode} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <span>{modeIcons[mode as keyof typeof modeIcons]}</span>
                        <span className="capitalize">{mode}</span>
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        {!selectedAgentId && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-muted-foreground">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select an agent to view detailed metrics and activity.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}