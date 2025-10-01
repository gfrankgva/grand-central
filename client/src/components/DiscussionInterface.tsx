import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2, Brain, Bot, Search, User, Lightbulb, Plus, Zap, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Discussion, Message, MessageSender } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { CreateDiscussionDialog } from "./CreateDiscussionDialog";

interface DiscussionInterfaceProps {
  projectId: string | null;
  discussionId: string | null;
  onBack?: () => void;
}

const LLM_CONFIG = {
  claude: {
    icon: Brain,
    label: "Claude",
    color: "hsl(var(--claude))",
    foreground: "hsl(var(--claude-foreground))",
    bgColor: "bg-[hsl(var(--claude))]",
    textColor: "text-[hsl(var(--claude-foreground))]",
    borderColor: "border-[hsl(var(--claude))]"
  },
  gpt4: {
    icon: Bot,
    label: "GPT-4",
    color: "hsl(var(--gpt4))",
    foreground: "hsl(var(--gpt4-foreground))",
    bgColor: "bg-[hsl(var(--gpt4))]",
    textColor: "text-[hsl(var(--gpt4-foreground))]",
    borderColor: "border-[hsl(var(--gpt4))]"
  },
  deepseek: {
    icon: Search,
    label: "DeepSeek",
    color: "hsl(var(--deepseek))",
    foreground: "hsl(var(--deepseek-foreground))",
    bgColor: "bg-[hsl(var(--deepseek))]",
    textColor: "text-[hsl(var(--deepseek-foreground))]",
    borderColor: "border-[hsl(var(--deepseek))]"
  },
  grok: {
    icon: Zap,
    label: "⚡ Grok",
    color: "hsl(var(--grok))",
    foreground: "hsl(var(--grok-foreground))",
    bgColor: "bg-[hsl(var(--grok))]",
    textColor: "text-[hsl(var(--grok-foreground))]",
    borderColor: "border-[hsl(var(--grok))]"
  },
  companion: {
    icon: Lightbulb,
    label: "🧠 Companion",
    color: "hsl(var(--companion))",
    foreground: "hsl(var(--companion-foreground))",
    bgColor: "bg-[hsl(var(--companion))]",
    textColor: "text-[hsl(var(--companion-foreground))]",
    borderColor: "border-[hsl(var(--companion))]"
  },
  user: {
    icon: User,
    label: "You",
    color: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
    bgColor: "bg-primary",
    textColor: "text-primary-foreground",
    borderColor: "border-primary"
  }
} as const;

// Breathing Phase Configuration
const PHASE_CONFIG = {
  plasma: { emoji: '🌌', label: 'Plasma', description: 'Ideation & Brainstorming', color: 'hsl(280, 100%, 70%)' },
  gas: { emoji: '☁️', label: 'Gas', description: 'Exploration & Research', color: 'hsl(200, 100%, 70%)' },
  liquid: { emoji: '💧', label: 'Liquid', description: 'Integration & Synthesis', color: 'hsl(180, 100%, 60%)' },
  solid: { emoji: '🧊', label: 'Solid', description: 'Execution & Implementation', color: 'hsl(220, 80%, 60%)' },
  unity: { emoji: '✨', label: 'Unity', description: 'Complete Understanding', color: 'hsl(50, 100%, 60%)' }
} as const;

export function DiscussionInterface({
  projectId,
  discussionId,
  onBack,
}: DiscussionInterfaceProps) {
  const [input, setInput] = useState("");
  const [showCreateDiscussionDialog, setShowCreateDiscussionDialog] = useState(false);
  const [activeModels, setActiveModels] = useState({
    gpt4: true,
    claude: true,
    deepseek: true,
    grok: true
  });
  const [celebratingPatterns, setCelebratingPatterns] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: discussion } = useQuery<Discussion>({
    queryKey: ["/api/discussions", discussionId],
    enabled: !!discussionId
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/discussions", discussionId, "messages"],
    enabled: !!discussionId
  });

  // Fetch companion suggestions for this discussion
  const { data: companionData = { suggestions: [] } } = useQuery<{ suggestions: any[] }>({
    queryKey: ["/api/companion/data"],
    enabled: !!discussionId
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      const enabledModels = Object.entries(activeModels)
        .filter(([_, isActive]) => isActive)
        .map(([model]) => model);
      
      return apiRequest("POST", `/api/discussions/${discussionId}/messages`, { 
        content,
        enabledModels 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId] }); // Update breathing data
      queryClient.invalidateQueries({ queryKey: ["/api/companion/data"] });
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

  // Handle companion agent suggestion approval
  const handleCompanionSuggestion = useMutation({
    mutationFn: ({ suggestionId, userApproval }: { suggestionId: string; userApproval: boolean }) =>
      apiRequest("POST", `/api/companion/create-agent`, { suggestionId, userApproval }),
    onSuccess: (result: any) => {
      if (result.success) {
        toast({
          title: "Agent Created",
          description: result.message,
        });
      } else {
        toast({
          title: "Agent Creation Cancelled",
          description: result.message,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/companion/data"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process companion suggestion",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !discussionId || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background" data-testid="discussion-empty-project">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Welcome to Grand Central</h3>
          <p className="text-sm">Select a project from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  const handleDiscussionCreated = (discussion: Discussion) => {
    setShowCreateDiscussionDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "discussions"] });
    // The parent component should handle the discussion selection
    window.location.reload(); // Simple way to refresh and show new discussion
  };

  if (!discussionId) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center bg-background" data-testid="discussion-empty-discussion">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Project Selected</h3>
            <p className="text-sm mb-6">Select a discussion or create a new one to start collaborating</p>
            <Button 
              onClick={() => setShowCreateDiscussionDialog(true)}
              className="gap-2"
              data-testid="button-create-discussion-main"
            >
              <Plus className="w-4 h-4" />
              New Discussion
            </Button>
          </div>
        </div>
        
        <CreateDiscussionDialog
          open={showCreateDiscussionDialog}
          onOpenChange={setShowCreateDiscussionDialog}
          projectId={projectId}
          onDiscussionCreated={handleDiscussionCreated}
        />
      </>
    );
  }

  if (!discussion) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background" data-testid="discussion-loading">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Group messages by user input to show LLM responses side-by-side
  const groupedMessages: Array<{
    userMessage?: Message;
    llmResponses: Message[];
    timestamp: string;
  }> = [];

  let currentGroup: {
    userMessage?: Message;
    llmResponses: Message[];
    timestamp: string;
  } | null = null;

  messages.forEach((message) => {
    if (message.sender === "user") {
      // Start new group for user message
      if (currentGroup) {
        groupedMessages.push(currentGroup);
      }
      currentGroup = {
        userMessage: message,
        llmResponses: [],
        timestamp: message.createdAt?.toString() || new Date().toISOString()
      };
    } else if (currentGroup) {
      // Add LLM response to current group
      currentGroup.llmResponses.push(message);
      // Update timestamp to latest response
      currentGroup.timestamp = message.createdAt?.toString() || new Date().toISOString();
    } else {
      // LLM response without user message (shouldn't happen but handle gracefully)
      groupedMessages.push({
        llmResponses: [message],
        timestamp: message.createdAt?.toString() || new Date().toISOString()
      });
    }
  });

  if (currentGroup) {
    groupedMessages.push(currentGroup);
  }

  return (
    <div className="flex-1 flex flex-col bg-background" data-testid="discussion-interface">
      {/* Header with Model Toggle Bar */}
      <div className="border-b bg-card">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold" data-testid="discussion-name">
                {discussion.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {messages.length} messages
              </p>
            </div>
          </div>
        </div>
        
        {/* Model Toggle Bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Active Models:</span>
            
            <Button
              variant={activeModels.gpt4 ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveModels(prev => ({ ...prev, gpt4: !prev.gpt4 }))}
              className={activeModels.gpt4 ? "bg-[hsl(var(--gpt4))] hover:bg-[hsl(var(--gpt4))]/90 border-[hsl(var(--gpt4))]" : ""}
              data-testid="toggle-gpt4"
            >
              <Bot className="w-3 h-3 mr-1" />
              GPT-4
            </Button>
            
            <Button
              variant={activeModels.claude ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveModels(prev => ({ ...prev, claude: !prev.claude }))}
              className={activeModels.claude ? "bg-[hsl(var(--claude))] hover:bg-[hsl(var(--claude))]/90 border-[hsl(var(--claude))]" : ""}
              data-testid="toggle-claude"
            >
              <Brain className="w-3 h-3 mr-1" />
              Claude
            </Button>
            
            <Button
              variant={activeModels.deepseek ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveModels(prev => ({ ...prev, deepseek: !prev.deepseek }))}
              className={activeModels.deepseek ? "bg-[hsl(var(--deepseek))] hover:bg-[hsl(var(--deepseek))]/90 border-[hsl(var(--deepseek))]" : ""}
              data-testid="toggle-deepseek"
            >
              <Search className="w-3 h-3 mr-1" />
              DeepSeek
            </Button>
            
            <Button
              variant={activeModels.grok ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveModels(prev => ({ ...prev, grok: !prev.grok }))}
              className={activeModels.grok ? "bg-[hsl(var(--grok))] hover:bg-[hsl(var(--grok))]/90 border-[hsl(var(--grok))]" : ""}
              data-testid="toggle-grok"
            >
              <Zap className="w-3 h-3 mr-1" />
              Grok
            </Button>
          </div>
        </div>
        
        {/* Breathing Rhythm Indicator & Pattern Stack */}
        <div className="px-4 pb-4 flex gap-4">
          {/* Breathing Rhythm Indicator */}
          <Card className="flex-1">
            <div className="p-3">
              <div className="flex items-center gap-3">
                <Wind className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Phase: {PHASE_CONFIG[discussion.currentPhase as keyof typeof PHASE_CONFIG]?.label || 'Plasma'}
                    </span>
                    <span className="text-lg">
                      {PHASE_CONFIG[discussion.currentPhase as keyof typeof PHASE_CONFIG]?.emoji || '🌌'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="secondary" className="text-xs" data-testid="breath-count-badge">
                      Breath #{discussion.breathCount || 0}
                    </Badge>
                    <Badge variant="outline" className="text-xs" data-testid="pattern-count-badge">
                      {(discussion.detectedPatterns as any)?.length || 0} Patterns
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Visual Pattern Stack */}
          {(discussion.detectedPatterns as any)?.length > 0 && (
            <Card className="flex-1">
              <div className="p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Detected Patterns:</div>
                <div className="flex flex-wrap gap-2">
                  {((discussion.detectedPatterns as any) || []).map((pattern: string, index: number) => {
                    const strength = Math.min(1.0, 0.5 + (index * 0.2)); // Simulate strength
                    const isComplete = strength >= 1.0;
                    const isCelebrating = celebratingPatterns.has(index);
                    
                    // Trigger celebration when pattern completes
                    if (isComplete && !isCelebrating) {
                      setTimeout(() => {
                        setCelebratingPatterns(prev => new Set(prev).add(index));
                        toast({
                          title: "✨ Pattern Complete!",
                          description: `"${pattern}" has crystallized into wisdom`,
                        });
                      }, 100);
                    }
                    
                    return (
                      <Badge
                        key={index}
                        className={`text-xs transition-all duration-500 ${isCelebrating ? 'scale-110 animate-pulse' : ''}`}
                        style={{
                          opacity: 0.3 + (strength * 0.7),
                          backgroundColor: isComplete ? 'hsl(142, 71%, 45%)' : 'hsl(45, 93%, 47%)',
                          color: 'white'
                        }}
                        data-testid={`pattern-block-${index}`}
                      >
                        <span>{pattern}</span>
                        <span className="ml-2 text-[10px] opacity-80">
                          {Math.round(strength * 100)}%
                        </span>
                        {isComplete && <span className="ml-1">✨</span>}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="discussion-messages">
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8" data-testid="discussion-empty-messages">
            <div className="text-4xl mb-4">💭</div>
            <h3 className="text-lg font-medium mb-2">Start a Discussion</h3>
            <p className="text-sm mb-4">
              Ask a question and get responses from multiple AI models
            </p>
            <p className="text-xs">
              Type a message below to get insights from Claude, GPT-4, and DeepSeek
            </p>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3" data-testid={`message-group-${groupIndex}`}>
              {/* User Message */}
              {group.userMessage && (
                <div className="flex justify-end">
                  <Card className="max-w-[80%] bg-primary text-primary-foreground border-primary" data-testid={`user-message-${group.userMessage.id}`}>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">You</span>
                        <span className="text-xs opacity-70">
                          {new Date(group.userMessage.createdAt!).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {group.userMessage.content}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* LLM Responses - Stacked */}
              {group.llmResponses.length > 0 && (
                <div className="space-y-3">
                  {group.llmResponses.map((message) => {
                    const config = LLM_CONFIG[message.sender as keyof typeof LLM_CONFIG];
                    const IconComponent = config?.icon || Bot;
                    
                    return (
                      <div key={message.id} className="relative">
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                          style={{ backgroundColor: config?.color }}
                        />
                        <Card 
                          className="ml-2" 
                          data-testid={`llm-message-${message.id}`}
                          data-llm-provider={message.sender}
                          data-llm-color={config?.color}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge 
                                className="text-xs"
                                style={{ 
                                  backgroundColor: config?.color, 
                                  color: config?.foreground 
                                }}
                                data-testid={`llm-badge-${message.sender}`}
                                data-badge-bg={config?.color}
                              >
                                <IconComponent className="w-3 h-3 mr-1" />
                                {config?.label || message.sender}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt!).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}

        {/* Companion Agent Suggestions */}
        {companionData?.suggestions?.filter((s: any) => s.discussionId === discussionId).map((suggestion: any) => (
          <div key={suggestion.id} className="space-y-3">
            <div className="flex justify-start">
              <Card className="max-w-[80%] bg-purple-50 border-purple-200" data-testid={`companion-suggestion-${suggestion.id}`}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="text-xs bg-purple-600 text-white">
                      <Brain className="w-3 h-3 mr-1" />
                      Companion Agent
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(suggestion.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm mb-3">
                    {suggestion.content}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCompanionSuggestion.mutate({ suggestionId: suggestion.id, userApproval: true })}
                      disabled={handleCompanionSuggestion.isPending}
                      data-testid={`button-accept-suggestion-${suggestion.id}`}
                    >
                      ✅ Yes, Create Agent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompanionSuggestion.mutate({ suggestionId: suggestion.id, userApproval: false })}
                      disabled={handleCompanionSuggestion.isPending}
                      data-testid={`button-decline-suggestion-${suggestion.id}`}
                    >
                      ❌ No Thanks
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ))}
        
        {sendMessageMutation.isPending && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Card className="max-w-[80%] bg-primary text-primary-foreground border-primary opacity-50">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">You</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">
                    {input}
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {["claude", "gpt4", "deepseek"].map((llm) => {
                const config = LLM_CONFIG[llm as keyof typeof LLM_CONFIG];
                const IconComponent = config.icon;
                
                return (
                  <Card 
                    key={llm}
                    className="border-2" 
                    style={{ borderColor: config.color }}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge 
                          className="text-xs"
                          style={{ 
                            backgroundColor: config.color, 
                            color: config.foreground 
                          }}
                        >
                          <IconComponent className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
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
            placeholder="Ask a question to get responses from Claude, GPT-4, and DeepSeek..."
            className="flex-1 min-h-[60px] max-h-32 resize-none"
            disabled={sendMessageMutation.isPending}
            data-testid="textarea-discussion-input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="self-end"
            data-testid="button-send-discussion-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}