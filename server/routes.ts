import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateLLMResponse } from "./services/llm-router";
import { simpleCompanionService } from "./services/companion-simple";
import githubRoutes from "./routes/github.js";
import { 
  insertProjectSchema,
  insertWorkspaceSchema,
  insertDiscussionSchema,
  insertMessageSchema,
  insertContextItemSchema,
  insertUserSettingsSchema,
  apiConfigSchema,
  preferencesSchema,
  companionConfigSchema,
  type LLMProvider,
  llmProviders,
  messageSenders,
  contextTypes
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Phase 2: Simple role instructions to prevent repetitive responses
  const LLM_INSTRUCTIONS = {
    openai: "Be practical and implementation-focused.",
    claude: "Focus on patterns and deeper connections.",
    deepseek: "Analyze critically and suggest alternatives.",
    grok: "You are the Efficiency Optimizer. Focus on metrics, rapid prototyping, and cutting through abstractions. Measure everything. Keep it real."
  };

  // Enhanced function to handle individual LLM response with role instructions and fallback
  async function handleLLMResponse(
    discussionId: string, 
    message: string, 
    provider: string, 
    senderName: string, 
    apiKey: string, 
    globalContext: any[] = [],
    availableProviders: string[] = []
  ): Promise<any> {
    try {
      // Build messages array with system instructions
      const messages = [
        { role: 'system', content: LLM_INSTRUCTIONS[provider as keyof typeof LLM_INSTRUCTIONS] },
        { role: 'user', content: message }
      ];
      
      // Convert the system messages format to match what generateLLMResponse expects
      const conversationMessages = messages.map((msg: any) => ({
        id: 'temp-' + Date.now(),
        createdAt: new Date(),
        discussionId: discussionId,
        content: msg.content,
        sender: msg.role === 'user' ? 'user' : 'assistant',
        llmProvider: provider
      }));
      
      const response = await generateLLMResponse(provider as any, message, conversationMessages, [], apiKey, globalContext);
      const savedMessage = await storage.createMessage({
        discussionId,
        content: response,
        sender: senderName as any,
        llmProvider: provider as any
      });
      return savedMessage;
    } catch (error: any) {
      console.error(`Error with ${provider}:`, error);
      
      // Try fallback providers
      const { getFallbackProvider } = await import("./services/error-handler");
      const fallbackProvider = getFallbackProvider(provider as any, availableProviders as any);
      
      if (fallbackProvider) {
        console.log(`[Fallback] Attempting ${fallbackProvider} as fallback for ${provider}`);
        try {
          const fallbackResponse = await handleLLMResponse(
            discussionId, 
            message, 
            fallbackProvider, 
            senderName, 
            apiKey, 
            globalContext,
            availableProviders.filter(p => p !== fallbackProvider)
          );
          
          if (fallbackResponse) {
            // Mark as degraded/fallback
            fallbackResponse.content = `⚠️ ${provider} unavailable. Response from ${fallbackProvider}:\n\n${fallbackResponse.content}`;
            return fallbackResponse;
          }
        } catch (fallbackError) {
          console.error(`Fallback ${fallbackProvider} also failed:`, fallbackError);
        }
      }
      
      // No fallback worked - return degraded message
      const degradedMessage = await storage.createMessage({
        discussionId,
        content: `⚠️ ${provider} response unavailable: ${error.message}`,
        sender: senderName as any,
        llmProvider: provider as any
      });
      return degradedMessage;
    }
  }

  // Project CRUD operations
  
  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Get single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  // Create new project
  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid project data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Update project (for renaming, instructions, etc.)
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Clone project
  app.post("/api/projects/:id/clone", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }
      const clonedProject = await storage.cloneProject(req.params.id, name);
      res.status(201).json(clonedProject);
    } catch (error) {
      console.error('Error cloning project:', error);
      res.status(500).json({ error: 'Failed to clone project' });
    }
  });

  // Workspace operations
  
  // Get all workspaces
  app.get("/api/workspaces", async (req, res) => {
    try {
      const workspaces = await storage.getAllWorkspaces();
      res.json(workspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  // Get workspace by ID
  app.get("/api/workspaces/:id", async (req, res) => {
    try {
      const workspace = await storage.getWorkspace(req.params.id);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      res.json(workspace);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  });

  // Create new workspace
  app.post("/api/workspaces", async (req, res) => {
    try {
      const validatedData = insertWorkspaceSchema.parse(req.body);
      const workspace = await storage.createWorkspace(validatedData);
      res.status(201).json(workspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid workspace data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  // Delete workspace
  app.delete("/api/workspaces/:id", async (req, res) => {
    try {
      await storage.deleteWorkspace(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  });

  // Get projects in workspace
  app.get("/api/workspaces/:id/projects", async (req, res) => {
    try {
      const projects = await storage.getProjectsByWorkspace(req.params.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching workspace projects:', error);
      res.status(500).json({ error: 'Failed to fetch workspace projects' });
    }
  });

  // Discussion operations

  // Get discussions for a project
  app.get("/api/projects/:id/discussions", async (req, res) => {
    try {
      const discussions = await storage.getDiscussionsByProject(req.params.id);
      res.json(discussions);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      res.status(500).json({ error: 'Failed to fetch discussions' });
    }
  });

  // Create new discussion
  app.post("/api/projects/:id/discussions", async (req, res) => {
    try {
      const validatedData = insertDiscussionSchema.parse({
        ...req.body,
        projectId: req.params.id
      });
      const discussion = await storage.createDiscussion(validatedData);
      res.status(201).json(discussion);
    } catch (error) {
      console.error('Error creating discussion:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid discussion data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create discussion' });
    }
  });

  // Get single discussion
  app.get("/api/discussions/:id", async (req, res) => {
    try {
      const discussion = await storage.getDiscussion(req.params.id);
      if (!discussion) {
        return res.status(404).json({ error: 'Discussion not found' });
      }
      res.json(discussion);
    } catch (error) {
      console.error('Error fetching discussion:', error);
      res.status(500).json({ error: 'Failed to fetch discussion' });
    }
  });

  // Update discussion
  app.patch("/api/discussions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const discussion = await storage.updateDiscussion(req.params.id, updates);
      if (!discussion) {
        return res.status(404).json({ error: 'Discussion not found' });
      }
      res.json(discussion);
    } catch (error) {
      console.error('Error updating discussion:', error);
      res.status(500).json({ error: 'Failed to update discussion' });
    }
  });

  // Delete discussion
  app.delete("/api/discussions/:id", async (req, res) => {
    try {
      await storage.deleteDiscussion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting discussion:', error);
      res.status(500).json({ error: 'Failed to delete discussion' });
    }
  });

  // Clone discussion
  app.post("/api/discussions/:id/clone", async (req, res) => {
    try {
      const clonedDiscussion = await storage.cloneDiscussion(req.params.id);
      res.status(201).json(clonedDiscussion);
    } catch (error) {
      console.error('Error cloning discussion:', error);
      res.status(500).json({ error: 'Failed to clone discussion' });
    }
  });

  // Message operations
  
  // Get messages for a discussion
  app.get("/api/discussions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByDiscussion(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Phase 1: Basic Multi-Response - All configured LLMs respond in parallel
  app.post("/api/discussions/:id/messages", async (req, res) => {
    try {
      const { content, enabledModels = [] } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Content is required and must be a string' });
      }

      const discussion = await storage.getDiscussion(req.params.id);
      if (!discussion) {
        return res.status(404).json({ error: 'Discussion not found' });
      }

      // Save user message first
      const userMessage = await storage.createMessage({
        discussionId: req.params.id,
        content,
        sender: 'user',
        llmProvider: null
      });

      // Get enabled LLMs from settings and global context
      const settings = await storage.getSettings() || {};
      const globalContext = await storage.getGlobalContext();
      const responses: any[] = [];
      console.log('Global context items:', globalContext.length);
      console.log('Enabled models from request:', enabledModels);

      // Call only enabled LLMs in parallel (if any are enabled)
      const promises = [];

      // Build list of available providers (those with API keys)
      const availableProviders: string[] = [];
      if ((settings as any).apiKeys?.openai?.key) availableProviders.push('openai');
      if ((settings as any).apiKeys?.anthropic?.key) availableProviders.push('claude');
      if ((settings as any).apiKeys?.deepseek?.key) availableProviders.push('deepseek');
      if ((settings as any).apiKeys?.grok?.key) availableProviders.push('grok');

      // OpenAI (GPT-4) - only if enabled and has API key
      if (enabledModels.includes('gpt4') && (settings as any).apiKeys?.openai?.key) {
        promises.push(
          handleLLMResponse(req.params.id, content, 'openai', 'gpt4', (settings as any).apiKeys.openai.key, globalContext, availableProviders)
        );
      }

      // Claude - only if enabled and has API key
      if (enabledModels.includes('claude') && (settings as any).apiKeys?.anthropic?.key) {
        promises.push(
          handleLLMResponse(req.params.id, content, 'claude', 'claude', (settings as any).apiKeys.anthropic.key, globalContext, availableProviders)
        );
      }

      // DeepSeek - only if enabled and has API key
      if (enabledModels.includes('deepseek') && (settings as any).apiKeys?.deepseek?.key) {
        promises.push(
          handleLLMResponse(req.params.id, content, 'deepseek', 'deepseek', (settings as any).apiKeys.deepseek.key, globalContext, availableProviders)
        );
      }

      // Grok - only if enabled and has API key
      if (enabledModels.includes('grok') && (settings as any).apiKeys?.grok?.key) {
        promises.push(
          handleLLMResponse(req.params.id, content, 'grok', 'grok', (settings as any).apiKeys.grok.key, globalContext, availableProviders)
        );
      }

      // Wait for all responses (success or failure)
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          responses.push(result.value);
        }
      });

      // Grok's special optimization review function
      const messageCount = await storage.getMessagesByDiscussion(req.params.id);
      if (messageCount.length % 10 === 0 && messageCount.length > 0 && (settings as any).apiKeys?.grok?.key) {
        try {
          const { getMetricsSummary } = await import('./services/metrics');
          const metrics = await getMetricsSummary();
          
          const grokOptimizationPrompt = `System metrics: ${JSON.stringify(metrics)}. What needs optimization?`;
          const grokAnalysis = await handleLLMResponse(
            req.params.id, 
            grokOptimizationPrompt, 
            'grok', 
            'system', 
            (settings as any).apiKeys.grok.key, 
            globalContext,
            availableProviders
          );
          
          if (grokAnalysis) {
            responses.push({
              ...grokAnalysis,
              sender: 'system',
              content: `🔍 Grok System Analysis (${messageCount.length} messages):\n\n${grokAnalysis.content}`,
              llmProvider: 'grok'
            });
          }
        } catch (error) {
          console.error('Error running Grok optimization analysis:', error);
        }
      }

      // Phase 2: Semantic Memory Integration - Store memories and detect patterns
      if ((settings as any).apiKeys?.openai?.key) {
        try {
          const { storeMemory, findPatterns } = await import('./services/semantic-memory');
          
          console.log('[Semantic Memory] Starting memory storage for', responses.length, 'responses');
          
          // Store memories for each LLM response
          for (const response of responses) {
            try {
              await storeMemory(
                response.sender,
                response.content,
                {
                  currentPhase: (discussion.currentPhase || 'plasma') as 'plasma' | 'gas' | 'liquid' | 'solid',
                  breathNumber: (discussion.breathCount || 0) + 1,
                  detectedPatterns: (discussion.detectedPatterns as string[]) || []
                },
                (settings as any).apiKeys.openai.key
              );
              console.log(`[Semantic Memory] Stored memory for ${response.sender}`);
            } catch (memError) {
              console.error(`[Semantic Memory] Error storing memory for ${response.sender}:`, memError);
            }
          }
          
          // Check for semantic patterns every 3 USER messages (not total messages)
          const allMessages = await storage.getMessagesByDiscussion(req.params.id);
          const userMessages = allMessages.filter(m => m.sender === 'user');
          
          console.log(`[Semantic Memory] Total messages: ${allMessages.length}, User messages: ${userMessages.length}`);
          
          if (userMessages.length >= 3 && userMessages.length % 3 === 0) {
            console.log(`[Semantic Memory] Checking patterns at ${userMessages.length} user messages`);
            
            const lastThreeUserMessages = userMessages.slice(-3);
            const combinedContent = lastThreeUserMessages.map(m => m.content).join(' ');
            
            console.log('[Semantic Memory] Searching for patterns in:', combinedContent.substring(0, 100) + '...');
            
            try {
              // Search for semantic patterns
              const patterns = await findPatterns(
                combinedContent,
                (settings as any).apiKeys.openai.key,
                0.8, // 80% similarity threshold
                5
              );
              
              console.log(`[Semantic Memory] Found ${patterns?.length || 0} similar patterns`);
              
              if (patterns && patterns.length >= 2) {
                // Pattern detected! Update breathing context (lowered from 3 to 2 for early detection)
                const newBreathCount = (discussion.breathCount || 0) + 1;
                const detectedPatternTopics = patterns.map((p: any) => 
                  p.metadata?.patterns?.join(', ') || 'pattern'
                ).filter(Boolean);
                
                console.log(`[Semantic Memory] Pattern detected! Breath #${newBreathCount}`);
                console.log(`[Semantic Memory] Pattern topics:`, detectedPatternTopics);
                
                try {
                  const updatedDiscussion = await storage.updateDiscussion(req.params.id, {
                    breathCount: newBreathCount,
                    detectedPatterns: detectedPatternTopics.length > 0 ? detectedPatternTopics : ['semantic pattern detected']
                  });
                  
                  console.log('[Semantic Memory] Discussion updated successfully:', {
                    id: updatedDiscussion.id,
                    breathCount: updatedDiscussion.breathCount,
                    patternsCount: (updatedDiscussion.detectedPatterns as any)?.length || 0
                  });
                } catch (updateError) {
                  console.error('[Semantic Memory] FAILED to update discussion:', updateError);
                  throw updateError; // Re-throw to be caught by outer catch
                }
              } else {
                console.log('[Semantic Memory] Not enough patterns to trigger breath increment (need 2+, found ' + (patterns?.length || 0) + ')');
              }
            } catch (patternError) {
              console.error('[Semantic Memory] Error in pattern search/update:', patternError);
              throw patternError; // Re-throw to be caught by outer catch
            }
          }
        } catch (error) {
          console.error('[Semantic Memory] Error in pattern detection:', error);
        }
      } else {
        console.log('[Semantic Memory] Skipped - no OpenAI API key configured');
      }

      // FIXED: Non-blocking companion monitoring that runs AFTER LLM responses
      setTimeout(() => {
        // Check if companion is enabled in settings
        storage.getSettings().then(settings => {
          const companionConfig = (settings as any)?.companionConfig;
          if (companionConfig?.enabled) {
            simpleCompanionService.monitorDiscussion(req.params.id, userMessage).then((suggestion: any) => {
              if (suggestion) {
                console.log('Companion created suggestion:', suggestion.content);
                // Store suggestion for later retrieval - it will appear in the UI
              }
            }).catch((error: any) => {
              console.error('Companion monitoring error (non-blocking):', error);
            });
          }
        });
      }, 100); // Run after a short delay to avoid blocking the response

      res.json({ userMessage, responses });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Companion agent endpoints
  app.post("/api/companion/create-agent", async (req, res) => {
    try {
      const { suggestionId, userApproval } = req.body;
      
      if (typeof suggestionId !== 'string' || typeof userApproval !== 'boolean') {
        return res.status(400).json({ error: 'suggestionId and userApproval are required' });
      }
      
      const result = await simpleCompanionService.createAgentFromSuggestion(suggestionId, userApproval);
      res.json(result);
    } catch (error) {
      console.error('Error creating agent from suggestion:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  app.get("/api/companion/data", async (req, res) => {
    try {
      const data = await storage.getCompanionData();
      res.json(data || { observations: [], suggestions: [], patternMemory: {} });
    } catch (error) {
      console.error('Error fetching companion data:', error);
      res.status(500).json({ error: 'Failed to fetch companion data' });
    }
  });

  // Metrics routes
  app.get("/api/metrics/dashboard", async (req, res) => {
    try {
      const { getMetricsSummary } = await import('./services/metrics');
      const dashboard = await getMetricsSummary();
      res.json(dashboard);
    } catch (error) {
      console.error('Error fetching metrics dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch metrics dashboard' });
    }
  });

  // Agent routes
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const agent = await storage.createAgent(req.body);
      res.json(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });

  // Test all LLMs endpoint
  app.post("/api/settings/test-all-llms", async (req, res) => {
    try {
      const settings = await storage.getSettings() || {};
      console.log('Settings debug:', JSON.stringify(settings, null, 2));
      const testMessage = "Hello, please confirm you're connected and working properly.";
      
      const activeLLMs = {
        openai: !!(settings as any).apiKeys?.openai?.key,
        claude: !!(settings as any).apiKeys?.anthropic?.key, 
        deepseek: !!(settings as any).apiKeys?.deepseek?.key
      };
      console.log('Active LLMs:', activeLLMs);

      const results = {
        openai: '❌ No API key',
        claude: '❌ No API key',
        deepseek: '❌ No API key'
      };

      // Test each LLM that has an API key
      const promises = [];
      
      if (activeLLMs.openai) {
        promises.push(
          generateLLMResponse('openai', testMessage, [], [])
            .then(() => { results.openai = '✅ Connected'; })
            .catch(() => { results.openai = '❌ Failed'; })
        );
      }
      
      if (activeLLMs.claude) {
        promises.push(
          generateLLMResponse('claude', testMessage, [], [])
            .then(() => { results.claude = '✅ Connected'; })
            .catch(() => { results.claude = '❌ Failed'; })
        );
      }
      
      if (activeLLMs.deepseek) {
        promises.push(
          generateLLMResponse('deepseek', testMessage, [], [])
            .then(() => { results.deepseek = '✅ Connected'; })
            .catch(() => { results.deepseek = '❌ Failed'; })
        );
      }

      await Promise.allSettled(promises);
      
      res.json(results);
    } catch (error) {
      console.error('Error testing all LLMs:', error);
      res.status(500).json({ error: 'Failed to test LLMs' });
    }
  });

  // Context operations
  
  // Get context items for a project (shared across all discussions)
  app.get("/api/projects/:id/context", async (req, res) => {
    try {
      const context = await storage.getContextItemsByProject(req.params.id);
      res.json(context);
    } catch (error) {
      console.error('Error fetching context:', error);
      res.status(500).json({ error: 'Failed to fetch context' });
    }
  });

  // Add context item to project (shared across all discussions)
  app.post("/api/projects/:id/context", async (req, res) => {
    try {
      const validatedData = insertContextItemSchema.parse({
        ...req.body,
        projectId: req.params.id
      });
      
      if (!contextTypes.includes(validatedData.type as any)) {
        return res.status(400).json({ error: 'Invalid context type' });
      }

      const contextItem = await storage.createContextItem(validatedData);
      res.status(201).json(contextItem);
    } catch (error) {
      console.error('Error adding context:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid context data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to add context' });
    }
  });

  // Delete context item
  app.delete("/api/context/:id", async (req, res) => {
    try {
      await storage.deleteContextItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting context item:', error);
      res.status(500).json({ error: 'Failed to delete context item' });
    }
  });

  // Settings operations
  
  // Get current settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          id: "default",
          apiKeys: {},
          preferences: {
            simultaneous: true,
            sequential: false,
            primaryLLM: "openai",
            maxTokens: 1000,
            temperature: 0.7
          },
          globalContext: [],
          companionConfig: {
            enabled: false,
            autoSuggest: false,
            monitoringLevel: "active",
            personality: "You are a helpful AI assistant that monitors conversations and suggests improvements."
          },
          updatedAt: new Date()
        };
        res.json(defaultSettings);
      } else {
        res.json(settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Update settings
  app.put("/api/settings", async (req, res) => {
    try {
      const validatedData = insertUserSettingsSchema.partial().parse(req.body);
      const updatedSettings = await storage.updateSettings(validatedData);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid settings data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Get circuit breaker status for all LLM providers
  app.get("/api/system/circuit-breakers", async (req, res) => {
    try {
      const { getCircuitBreakerStatus } = await import("./services/error-handler");
      const status = getCircuitBreakerStatus();
      res.json(status);
    } catch (error) {
      console.error('Error fetching circuit breaker status:', error);
      res.status(500).json({ error: 'Failed to fetch circuit breaker status' });
    }
  });

  // Test API key connection
  app.post("/api/settings/test-api-key", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      console.log('API key test request:', { provider, hasApiKey: !!apiKey });
      
      if (!provider || !apiKey) {
        return res.status(400).json({ error: 'Provider and apiKey are required' });
      }

      if (!llmProviders.includes(provider)) {
        console.log('Invalid provider:', provider, 'Valid providers:', llmProviders);
        return res.status(400).json({ error: 'Invalid provider' });
      }

      let testResult: { provider: string; success: boolean; error: string | null; model: string | null } = { 
        provider, 
        success: false, 
        error: null, 
        model: null 
      };

      try {
        // Test the API key by making a simple request
        switch (provider) {
          case 'openai': {
            const { generateResponse } = await import('./services/openai');
            // Test with a simple prompt
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5
              })
            });
            
            if (response.ok) {
              testResult.success = true;
              testResult.model = 'gpt-3.5-turbo';
            } else {
              const errorData = await response.json();
              testResult.error = errorData.error?.message || 'API key test failed';
            }
            break;
          }
          
          case 'claude': {
            console.log('Testing Claude API key...');
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'test' }]
              })
            });
            
            console.log('Claude API response status:', response.status);
            
            if (response.ok) {
              testResult.success = true;
              testResult.model = 'claude-3-haiku';
              console.log('Claude API test successful');
            } else {
              const errorData = await response.json().catch(() => null);
              testResult.error = errorData?.error?.message || `API key test failed (${response.status})`;
              console.log('Claude API test failed:', response.status, errorData);
            }
            break;
          }
          
          case 'deepseek': {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5
              })
            });
            
            if (response.ok) {
              testResult.success = true;
              testResult.model = 'deepseek-chat';
            } else {
              const errorData = await response.json();
              testResult.error = errorData.error?.message || 'API key test failed';
            }
            break;
          }
          
          case 'grok': {
            console.log('Testing Grok API key...');
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'grok-4-latest',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5
              })
            });
            
            console.log('Grok API response status:', response.status);
            
            if (response.ok) {
              testResult.success = true;
              testResult.model = 'grok-4-latest';
              console.log('Grok API test successful');
            } else {
              const errorData = await response.json().catch(() => null);
              testResult.error = errorData?.error?.message || `API key test failed (${response.status})`;
              console.log('Grok API test failed:', response.status, errorData);
            }
            break;
          }
        }
      } catch (testError) {
        testResult.error = (testError as Error).message || 'Connection failed';
      }

      res.json(testResult);
    } catch (error) {
      console.error('Error testing API key:', error);
      res.status(500).json({ error: 'Failed to test API key' });
    }
  });

  // Global Context routes
  app.get("/api/global-context", async (req, res) => {
    try {
      const globalContext = await storage.getGlobalContext();
      res.json(globalContext);
    } catch (error) {
      console.error('Error fetching global context:', error);
      res.status(500).json({ error: 'Failed to fetch global context' });
    }
  });

  app.post("/api/global-context", async (req, res) => {
    try {
      const { type, content, metadata } = req.body;
      
      if (!type || !content) {
        return res.status(400).json({ error: 'type and content are required' });
      }
      
      const globalContextItem = await storage.createGlobalContext({
        type,
        content,
        metadata: metadata || {}
      });
      
      res.status(201).json(globalContextItem);
    } catch (error) {
      console.error('Error creating global context item:', error);
      res.status(500).json({ error: 'Failed to create global context item' });
    }
  });

  app.delete("/api/global-context/:id", async (req, res) => {
    try {
      await storage.deleteGlobalContext(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting global context item:', error);
      res.status(500).json({ error: 'Failed to delete global context item' });
    }
  });

  // Diagnostic endpoint to check API key status
  app.get("/api/settings/status", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const apiKeys = (settings as any)?.apiKeys || {};
      const status = {
        hasSettings: !!settings,
        apiKeys: {
          openai: !!apiKeys?.openai?.key,
          claude: !!apiKeys?.anthropic?.key,
          deepseek: !!apiKeys?.deepseek?.key,
          grok: !!apiKeys?.grok?.key
        },
        rawSettings: settings
      };
      res.json(status);
    } catch (error) {
      console.error('Error checking settings status:', error);
      res.status(500).json({ error: 'Failed to check settings status' });
    }
  });

  // GitHub routes
  app.use("/api/github", githubRoutes);

  const httpServer = createServer(app);
  return httpServer;
}