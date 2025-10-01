import { useState, useRef, useEffect } from "react";
import { Send, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Agent, Message, AgentMode, LLMProvider } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ConversationInterfaceProps {
  agentId: string | null;
}

const MODE_OPTIONS = [
  { value: "plasma" as AgentMode, icon: "🌀", label: "Plasma", description: "Ideation & Brainstorming" },
  { value: "gas" as AgentMode, icon: "💨", label: "Gas", description: "Exploration & Research" },
  { value: "liquid" as AgentMode, icon: "💧", label: "Liquid", description: "Integration & Synthesis" },
  { value: "solid" as AgentMode, icon: "🔷", label: "Solid", description: "Execution & Implementation" },
];

const LLM_ICONS = {
  openai: "🤖",
  claude: "🧠", 
  deepseek: "🔍"
} as const;

export function ConversationInterface({ agentId }: ConversationInterfaceProps) {
  const [input, setInput] = useState("");
  const [currentMode, setCurrentMode] = useState<AgentMode>("plasma");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agent } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    enabled: !!agentId
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/agents", agentId, "messages"],
    enabled: !!agentId
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, mode }: { content: string; mode: AgentMode }) =>
      apiRequest("POST", `/api/agents/${agentId}/messages`, { content, mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId] });
      setInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Update current mode when agent changes
  useEffect(() => {
    if (agent) {
      setCurrentMode(agent.currentMode as AgentMode);
    }
  }, [agent]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentId || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({ content: input.trim(), mode: currentMode });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!agentId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Agent Selected</h3>
          <p className="text-sm">Create or select an agent to start conversations</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const currentModeInfo = MODE_OPTIONS.find(m => m.value === currentMode);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentModeInfo?.icon}</span>
              <div>
                <h1 className="text-xl font-semibold" data-testid="conversation-agent-name">
                  {agent.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {agent.description || "AI Agent"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="text-xs"
              data-testid="conversation-llm-provider"
            >
              {LLM_ICONS[agent.llmProvider as LLMProvider]} {(agent.llmProvider || "openai").toUpperCase()}
            </Badge>
            
            <Badge
              variant="secondary"
              className="text-xs"
              data-testid="conversation-current-mode"
            >
              {currentModeInfo?.label} Mode
            </Badge>
            
            <Select value={currentMode} onValueChange={(value) => setCurrentMode(value as AgentMode)}>
              <SelectTrigger className="w-48" data-testid="select-conversation-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex items-center gap-2">
                      <span>{mode.icon}</span>
                      <div>
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="conversation-messages">
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-4xl mb-4">{currentModeInfo?.icon}</div>
            <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
            <p className="text-sm mb-4">
              You're in <strong>{currentModeInfo?.label}</strong> mode - {currentModeInfo?.description.toLowerCase()}
            </p>
            <p className="text-xs">
              Type a message below to begin working with {agent.name}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const modeInfo = MODE_OPTIONS.find(m => m.value === message.mode);
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                data-testid={`message-${message.id}`}
              >
                <Card
                  className={`max-w-[80%] p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-sm">{modeInfo?.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.role === "user" ? "You" : agent.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {message.mode}
                        </Badge>
                        <span className="text-xs opacity-70">
                          {new Date(message.createdAt!).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })
        )}
        
        {sendMessageMutation.isPending && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Share your thoughts in ${currentModeInfo?.label} mode...`}
            className="flex-1 min-h-[60px] max-h-32 resize-none"
            disabled={sendMessageMutation.isPending}
            data-testid="textarea-message-input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="self-end"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}