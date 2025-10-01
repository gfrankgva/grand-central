import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Key, TestTube, Check, X, Upload, Link as LinkIcon, Zap, Brain, Plus, Trash2, File, Globe, Github } from "lucide-react";
import { GitHubPushDialog } from "./GitHubPushDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserSettings, ApiConfig, Preferences, CompanionConfig, GlobalContext } from "@shared/schema";

interface ApiKeyTestResult {
  provider: string;
  success: boolean;
  error: string | null;
  model: string | null;
}

export function Settings() {
  const [apiKeys, setApiKeys] = useState<Record<string, any>>({});
  const [preferences, setPreferences] = useState<Preferences>();
  const [companionConfig, setCompanionConfig] = useState<CompanionConfig>();
  const [globalContextItems, setGlobalContextItems] = useState<GlobalContext[]>([]);
  const [testResults, setTestResults] = useState<Record<string, ApiKeyTestResult>>({});
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});
  const [newUrl, setNewUrl] = useState("");
  const [globalInstructions, setGlobalInstructions] = useState("");
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"]
  });

  // Fetch global context items
  const { data: globalContext, isLoading: isLoadingGlobalContext } = useQuery<GlobalContext[]>({
    queryKey: ["/api/global-context"]
  });

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setApiKeys(settings.apiKeys || {});
      setPreferences(settings.preferences as Preferences || {
        simultaneous: true,
        sequential: false,
        primaryLLM: "openai",
        maxTokens: 1000,
        temperature: 0.7
      });
      setCompanionConfig(settings.companionConfig as CompanionConfig || {
        enabled: false,
        autoSuggest: false,
        monitoringLevel: "active",
        personality: "You are a helpful AI assistant that monitors conversations and suggests improvements."
      });
      // Initialize global instructions from global context
      const instructionItems = (globalContext || []).filter(item => item.type === 'instruction');
      if (instructionItems.length > 0) {
        setGlobalInstructions(instructionItems[0].content);
      }
    }
  }, [settings]);

  // Update local state when global context loads
  useEffect(() => {
    if (globalContext) {
      setGlobalContextItems(globalContext);
      const instructionItems = globalContext.filter(item => item.type === 'instruction');
      if (instructionItems.length > 0) {
        setGlobalInstructions(instructionItems[0].content);
      }
    }
  }, [globalContext]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Test API key mutation
  const testApiKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }): Promise<ApiKeyTestResult> => {
      const response = await fetch("/api/settings/test-api-key", {
        method: "POST",
        body: JSON.stringify({ provider, apiKey }),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to test API key');
      return response.json();
    },
    onSuccess: (result: ApiKeyTestResult) => {
      setTestResults(prev => ({ ...prev, [result.provider]: result }));
      
      // Map backend provider names back to frontend names for state management
      const frontendProvider = result.provider === "claude" ? "anthropic" : result.provider;
      setTestingKeys(prev => ({ ...prev, [frontendProvider]: false }));
      
      if (result.success) {
        toast({
          title: "API Key Valid",
          description: `Successfully connected to ${result.provider} (${result.model})`
        });
      } else {
        toast({
          title: "API Key Invalid",
          description: result.error || "Failed to connect to API",
          variant: "destructive"
        });
      }
    }
  });

  const handleApiKeyChange = (provider: string, field: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value }
    }));
  };

  const handleTestApiKey = async (provider: string) => {
    const apiKey = apiKeys[provider]?.key;
    if (!apiKey) {
      toast({
        title: "Missing API Key",
        description: `Please enter an API key for ${provider} first.`,
        variant: "destructive"
      });
      return;
    }

    setTestingKeys(prev => ({ ...prev, [provider]: true }));
    // Map frontend provider names to backend provider names
    const backendProvider = provider === "anthropic" ? "claude" : provider;
    testApiKeyMutation.mutate({ provider: backendProvider, apiKey });
  };

  // Create global context item mutation
  const createGlobalContextMutation = useMutation({
    mutationFn: async (data: { type: string; content: string; metadata?: any }) => {
      return apiRequest("POST", "/api/global-context", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-context"] });
      toast({
        title: "Added to Global Context",
        description: "Item has been added to your global context."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to global context.",
        variant: "destructive"
      });
    }
  });

  // Delete global context item mutation
  const deleteGlobalContextMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/global-context/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-context"] });
      toast({
        title: "Removed from Global Context",
        description: "Item has been removed from your global context."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from global context.",
        variant: "destructive"
      });
    }
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      apiKeys,
      preferences,
      companionConfig
    });
  };

  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    
    createGlobalContextMutation.mutate({
      type: "url",
      content: newUrl.trim(),
      metadata: { addedAt: new Date().toISOString() }
    });
    setNewUrl("");
  };

  const handleSaveInstructions = () => {
    // First delete existing instruction items
    const existingInstructions = globalContextItems.filter(item => item.type === 'instruction');
    const deletePromises = existingInstructions.map(item => 
      deleteGlobalContextMutation.mutateAsync(item.id)
    );
    
    Promise.all(deletePromises).then(() => {
      if (globalInstructions.trim()) {
        createGlobalContextMutation.mutate({
          type: "instruction",
          content: globalInstructions.trim(),
          metadata: { updatedAt: new Date().toISOString() }
        });
      }
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      createGlobalContextMutation.mutate({
        type: "file",
        content: content,
        metadata: { 
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString()
        }
      });
    };
    reader.readAsText(file);
  };

  const handleDeleteGlobalContext = (id: string) => {
    deleteGlobalContextMutation.mutate(id);
  };

  const renderConnectionStatus = (provider: string) => {
    // Map frontend provider names to backend provider names for checking results
    const backendProvider = provider === "anthropic" ? "claude" : provider;
    const result = testResults[backendProvider];
    const isTesting = testingKeys[provider];
    const hasKey = apiKeys[provider]?.key;
    
    if (isTesting) {
      return <Badge variant="secondary">Testing...</Badge>;
    }
    
    if (result) {
      return result.success ? (
        <Badge variant="default" className="bg-green-600">
          <Check className="w-3 h-3 mr-1" />
          Connected ({result.model})
        </Badge>
      ) : (
        <Badge variant="destructive">
          <X className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
    
    // Show "Configured" badge if key exists (even if not tested)
    if (hasKey) {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-500">
          <Check className="w-3 h-3 mr-1" />
          Configured
        </Badge>
      );
    }
    
    return <Badge variant="outline">Not configured</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6" data-testid="settings-page">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="global-context" data-testid="tab-global-context">Global Context</TabsTrigger>
          <TabsTrigger value="companion" data-testid="tab-companion">Companion Agent</TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Configure your LLM provider API keys. Keys are stored securely and persist across sessions. Password fields may appear empty for security, but "Configured" badges show when keys are saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="openai-key" className="font-medium">OpenAI API Key</Label>
                  {renderConnectionStatus("openai")}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKeys.openai?.key || ""}
                    onChange={(e) => handleApiKeyChange("openai", "key", e.target.value)}
                    data-testid="input-openai-key"
                  />
                  <Select 
                    value={apiKeys.openai?.model || "gpt-4-turbo"} 
                    onValueChange={(value) => handleApiKeyChange("openai", "model", value)}
                  >
                    <SelectTrigger className="w-48" data-testid="select-openai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTestApiKey("openai")}
                    disabled={testingKeys.openai}
                    data-testid="button-test-openai"
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Claude/Anthropic */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="anthropic-key" className="font-medium">Claude API Key</Label>
                  {renderConnectionStatus("anthropic")}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropic?.key || ""}
                    onChange={(e) => handleApiKeyChange("anthropic", "key", e.target.value)}
                    data-testid="input-anthropic-key"
                  />
                  <Select 
                    value={apiKeys.anthropic?.model || "claude-3-sonnet"} 
                    onValueChange={(value) => handleApiKeyChange("anthropic", "model", value)}
                  >
                    <SelectTrigger className="w-48" data-testid="select-anthropic-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTestApiKey("anthropic")}
                    disabled={testingKeys.anthropic}
                    data-testid="button-test-anthropic"
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* DeepSeek */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="deepseek-key" className="font-medium">DeepSeek API Key</Label>
                  {renderConnectionStatus("deepseek")}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="deepseek-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKeys.deepseek?.key || ""}
                    onChange={(e) => handleApiKeyChange("deepseek", "key", e.target.value)}
                    data-testid="input-deepseek-key"
                  />
                  <Input
                    placeholder="https://api.deepseek.com"
                    value={apiKeys.deepseek?.endpoint || "https://api.deepseek.com"}
                    onChange={(e) => handleApiKeyChange("deepseek", "endpoint", e.target.value)}
                    className="w-48"
                    data-testid="input-deepseek-endpoint"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTestApiKey("deepseek")}
                    disabled={testingKeys.deepseek}
                    data-testid="button-test-deepseek"
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Grok */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="grok-key" className="font-medium">Grok API Key</Label>
                  {renderConnectionStatus("grok")}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="grok-key"
                    type="password"
                    placeholder="xai-..."
                    value={apiKeys.grok?.key || ""}
                    onChange={(e) => handleApiKeyChange("grok", "key", e.target.value)}
                    data-testid="input-grok-key"
                  />
                  <Select 
                    value={apiKeys.grok?.model || "grok-4-latest"} 
                    onValueChange={(value) => handleApiKeyChange("grok", "model", value)}
                  >
                    <SelectTrigger className="w-48" data-testid="select-grok-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grok-4-latest">Grok-4-Latest</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTestApiKey("grok")}
                    disabled={testingKeys.grok}
                    data-testid="button-test-grok"
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global-context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Global Context
              </CardTitle>
              <CardDescription>
                Files, links, and instructions that will be available to all LLMs across all projects and discussions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Files</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop files here, or click to select
                    </p>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      accept=".txt,.md,.csv,.json"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      data-testid="button-upload-file"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports: .txt, .md, .csv, .json files
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Reference URLs</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/important-docs"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    data-testid="input-url"
                  />
                  <Button 
                    onClick={handleAddUrl}
                    disabled={!newUrl.trim()}
                    data-testid="button-add-url"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Global Instructions Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Global Instructions</Label>
                <Textarea
                  placeholder="Enter instructions that will be provided to all LLMs in every conversation..."
                  value={globalInstructions}
                  onChange={(e) => setGlobalInstructions(e.target.value)}
                  className="min-h-32"
                  data-testid="textarea-global-instructions"
                />
                <Button 
                  onClick={handleSaveInstructions}
                  variant="outline"
                  data-testid="button-save-instructions"
                >
                  Save Instructions
                </Button>
              </div>

              {/* List of Global Context Items */}
              {globalContextItems.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Current Global Context</Label>
                  <div className="space-y-2">
                    {globalContextItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.type === 'file' && <File className="w-4 h-4 text-blue-500" />}
                          {item.type === 'url' && <Globe className="w-4 h-4 text-green-500" />}
                          {item.type === 'instruction' && <Brain className="w-4 h-4 text-purple-500" />}
                          <div>
                            <div className="font-medium">
                              {item.type === 'file' && (item.metadata as any)?.fileName}
                              {item.type === 'url' && item.content}
                              {item.type === 'instruction' && 'Global Instructions'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.type === 'file' && `${Math.round(((item.metadata as any)?.fileSize || 0) / 1024)}KB`}
                              {item.type === 'url' && 'Reference URL'}
                              {item.type === 'instruction' && `${item.content.length} characters`}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGlobalContext(item.id)}
                          data-testid={`button-delete-global-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Companion Agent
              </CardTitle>
              <CardDescription>
                An AI assistant that monitors your conversations and suggests improvements or specialized agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="companion-enabled"
                  checked={companionConfig?.enabled || false}
                  onCheckedChange={(checked) => 
                    setCompanionConfig(prev => ({ ...prev!, enabled: checked }))
                  }
                  data-testid="switch-companion-enabled"
                />
                <Label htmlFor="companion-enabled">Enable Companion Agent</Label>
              </div>
              
              {companionConfig?.enabled && (
                <div className="space-y-4 ml-6 border-l-2 border-muted pl-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-suggest"
                      checked={companionConfig.autoSuggest}
                      onCheckedChange={(checked) => 
                        setCompanionConfig(prev => ({ ...prev!, autoSuggest: checked }))
                      }
                      data-testid="switch-auto-suggest"
                    />
                    <Label htmlFor="auto-suggest">Auto-suggest specialized agents</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Monitoring Level</Label>
                    <Select 
                      value={companionConfig.monitoringLevel}
                      onValueChange={(value: "all" | "active" | "none") => 
                        setCompanionConfig(prev => ({ ...prev!, monitoringLevel: value }))
                      }
                    >
                      <SelectTrigger data-testid="select-monitoring-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Monitor all conversations</SelectItem>
                        <SelectItem value="active">Monitor active discussions only</SelectItem>
                        <SelectItem value="none">No monitoring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companion-personality">Companion Personality</Label>
                    <Textarea
                      id="companion-personality"
                      value={companionConfig.personality}
                      onChange={(e) => 
                        setCompanionConfig(prev => ({ ...prev!, personality: e.target.value }))
                      }
                      placeholder="Describe how the companion agent should behave..."
                      className="min-h-20"
                      data-testid="textarea-companion-personality"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Response Preferences
              </CardTitle>
              <CardDescription>
                Configure how LLMs respond to your messages and manage response quality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="simultaneous"
                    checked={preferences?.simultaneous || false}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev!, simultaneous: checked }))
                    }
                    data-testid="switch-simultaneous"
                  />
                  <Label htmlFor="simultaneous">All LLMs respond together (simultaneous)</Label>
                </div>

                <div className="space-y-2">
                  <Label>Primary LLM</Label>
                  <Select 
                    value={preferences?.primaryLLM || "openai"}
                    onValueChange={(value: "openai" | "anthropic" | "deepseek") => 
                      setPreferences(prev => ({ ...prev!, primaryLLM: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-primary-llm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI GPT</SelectItem>
                      <SelectItem value="anthropic">Claude</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={preferences?.maxTokens || 1000}
                      onChange={(e) => 
                        setPreferences(prev => ({ ...prev!, maxTokens: parseInt(e.target.value) }))
                      }
                      min={100}
                      max={4000}
                      data-testid="input-max-tokens"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature ({preferences?.temperature || 0.7})</Label>
                    <Input
                      id="temperature"
                      type="range"
                      value={preferences?.temperature || 0.7}
                      onChange={(e) => 
                        setPreferences(prev => ({ ...prev!, temperature: parseFloat(e.target.value) }))
                      }
                      min={0}
                      max={2}
                      step={0.1}
                      className="w-full"
                      data-testid="input-temperature"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button 
          onClick={() => setShowGitHubDialog(true)}
          variant="outline"
          data-testid="button-push-to-github"
        >
          <Github className="w-4 h-4 mr-2" />
          Push to GitHub
        </Button>
        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <GitHubPushDialog 
        open={showGitHubDialog} 
        onOpenChange={setShowGitHubDialog}
      />
    </div>
  );
}