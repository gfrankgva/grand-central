import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Agent, AgentMode, LLMProvider, llmProviders } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: (agent: Agent) => void;
}

const MODE_OPTIONS = [
  { value: "plasma" as AgentMode, label: "🌀 Plasma - Ideation & Brainstorming", description: "Generate creative possibilities" },
  { value: "gas" as AgentMode, label: "💨 Gas - Exploration & Research", description: "Investigate multiple pathways" },
  { value: "liquid" as AgentMode, label: "💧 Liquid - Integration & Synthesis", description: "Bring ideas together" },
  { value: "solid" as AgentMode, label: "🔷 Solid - Execution & Implementation", description: "Create actionable plans" },
];

const LLM_OPTIONS = [
  { value: "openai" as LLMProvider, label: "🤖 OpenAI", description: "GPT models for versatile assistance" },
  { value: "claude" as LLMProvider, label: "🧠 Claude", description: "Anthropic's thoughtful AI assistant" },
  { value: "deepseek" as LLMProvider, label: "🔍 Deepseek", description: "Advanced reasoning capabilities" },
];

export function CreateAgentDialog({ open, onOpenChange, onAgentCreated }: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currentMode, setCurrentMode] = useState<AgentMode>("plasma");
  const [llmProvider, setLlmProvider] = useState<LLMProvider>("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAgentMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; currentMode: string; llmProvider: string; systemPrompt?: string }) => {
      const response = await apiRequest("POST", "/api/agents", data);
      return response as Agent;
    },
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      onAgentCreated(agent);
      resetForm();
      toast({
        title: "Agent Created",
        description: `${agent.name} is ready to help you in ${agent.currentMode} mode.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCurrentMode("plasma");
    setLlmProvider("openai");
    setSystemPrompt("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createAgentMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      currentMode,
      llmProvider,
      systemPrompt: systemPrompt.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (!createAgentMutation.isPending) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]" data-testid="dialog-create-agent">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create an AI agent to help you work through ideas in different thinking modes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name *</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Strategy Assistant"
              required
              data-testid="input-agent-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-description">Description</Label>
            <Textarea
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this agent help you with?"
              rows={2}
              data-testid="textarea-agent-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-mode">Starting Mode</Label>
            <Select value={currentMode} onValueChange={(value) => setCurrentMode(value as AgentMode)}>
              <SelectTrigger data-testid="select-agent-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div>
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-provider">AI Provider</Label>
            <Select value={llmProvider} onValueChange={(value) => setLlmProvider(value as LLMProvider)}>
              <SelectTrigger data-testid="select-llm-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_OPTIONS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div>
                      <div className="font-medium">{provider.label}</div>
                      <div className="text-xs text-muted-foreground">{provider.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">Custom Instructions (Optional)</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Additional context or specialized instructions for this agent..."
              rows={3}
              data-testid="textarea-system-prompt"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={createAgentMutation.isPending}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createAgentMutation.isPending}
              data-testid="button-create-agent-submit"
            >
              {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}