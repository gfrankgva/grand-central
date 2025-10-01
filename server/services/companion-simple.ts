import { storage } from "../storage";

// Helper function to create companion announcements
function createCompanionAnnouncement(type: string, context: any): any {
  const messages = {
    breathIncrement: `💨 Breath #${context.breathCount} completed. The conversation deepens.`,
    patternComplete: `✨ Pattern "${context.pattern}" has fulfilled itself. Wisdom absorbed.`,
    patternDissolved: `🌫️ Pattern "${context.pattern}" dissolves back into the field of possibility.`,
    phaseTransition: `🌀 Transition: ${context.prevPhase} → ${context.newPhase}. A new state emerges.`,
  };
  
  return {
    id: `companion-announce-${Date.now()}`,
    discussionId: context.discussionId,
    content: messages[type as keyof typeof messages] || `🧠 ${type}`,
    sender: 'companion',
    llmProvider: 'companion',
    createdAt: new Date().toISOString(),
    isAnnouncement: true
  };
}

// Simplified companion agent that avoids hanging issues
export class SimpleCompanionService {
  
  // Phase 2: Semantic Pattern Detection using semantic memory
  async monitorDiscussion(discussionId: string, newMessage: any): Promise<any> {
    try {
      // Get recent messages for pattern analysis
      const recentMessages = await storage.getMessagesByDiscussion(discussionId);
      const messages = recentMessages.slice(-10); // Only analyze last 10 messages
      
      // Skip if not enough messages
      if (messages.length < 3) return null;
      
      // Get settings
      const settings = await storage.getSettings();
      const companionConfig = (settings as any)?.companionConfig;
      
      if (!companionConfig?.enabled) return null;
      
      console.log(`[Companion] Monitoring ${discussionId}: ${messages.length} recent messages`);
      
      // Phase 2: Use semantic memory for pattern detection
      const openaiKey = (settings as any)?.apiKeys?.openai?.key;
      if (openaiKey && messages.length >= 3) {
        const { findPatterns } = await import('./semantic-memory');
        
        // Get last 3 messages for semantic analysis
        const lastThree = messages.slice(-3);
        const combinedContent = lastThree.map(m => m.content).join(' ');
        
        // Search for semantic patterns
        const similar = await findPatterns(
          combinedContent,
          openaiKey,
          0.8, // 80% semantic similarity threshold
          5
        );
        
        console.log(`[Companion] Found ${similar.length} semantic matches`);
        
        // Pattern detected if we find 2+ similar memories (lowered from 3 for consistency)
        if (similar.length >= 2 && companionConfig.autoSuggest) {
          // Extract topic from similar patterns
          const topic = this.detectTopicFromPatterns(similar);
          const confidence = similar.length / 3;
          
          console.log(`[Companion] Pattern detected: ${topic} (confidence: ${confidence.toFixed(2)})`);
          
          // Update discussion breathing context
          const discussion = await storage.getDiscussion(discussionId);
          if (discussion) {
            const newBreathCount = (discussion.breathCount || 0) + 1;
            const patterns = Array.from(new Set(similar.flatMap((p: any) => p.metadata?.patterns || [topic])));
            
            console.log(`[Companion] Updating discussion - Breath #${newBreathCount}, Patterns:`, patterns);
            
            await storage.updateDiscussion(discussionId, {
              breathCount: newBreathCount,
              detectedPatterns: patterns.length > 0 ? patterns : [topic]
            });
            
            console.log(`[Companion] Discussion breathing context updated`);
            
            // Send breath increment announcement
            const breathAnnouncement = createCompanionAnnouncement('breathIncrement', {
              discussionId,
              breathCount: newBreathCount
            });
            
            await storage.createMessage(breathAnnouncement);
          }
          
          const suggestion = {
            id: `suggestion-${Date.now()}`,
            discussionId,
            timestamp: new Date().toISOString(),
            type: 'agent_creation',
            content: `🧠 I notice you're exploring ${topic}. Shall I crystallize a specialized agent? (Confidence: ${Math.round(confidence * 100)}%)`,
            agent_template: {
              name: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Expert`,
              focus: `Specialized in ${topic} discussions`,
              system_prompt: `You are an expert in ${topic}. Provide helpful guidance for ${topic}-related questions.`
            }
          };
          
          // Save suggestion
          await storage.addCompanionSuggestion(suggestion);
          
          // Return as a companion message to display in chat
          return {
            id: `companion-${Date.now()}`,
            discussionId,
            content: suggestion.content,
            sender: 'companion',
            llmProvider: 'companion',
            createdAt: new Date().toISOString(),
            suggestionId: suggestion.id
          };
        }
      }
      
      // Fallback to simple participation every 8 messages if no semantic detection
      if (messages.length > 0 && messages.length % 8 === 0) {
        console.log('[Companion] Providing periodic insight');
        
        const insight = `🧠 I'm monitoring this discussion (${messages.length} messages). Semantic pattern detection is active. I'll suggest specialized agents when I detect recurring topics.`;
        
        return {
          id: `companion-${Date.now()}`,
          discussionId,
          content: insight,
          sender: 'companion', 
          llmProvider: 'companion',
          createdAt: new Date().toISOString()
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('[Companion] Monitoring error:', error);
      return null;
    }
  }
  
  // Extract topic from semantic patterns
  private detectTopicFromPatterns(patterns: any[]): string {
    // Get the most common words from pattern metadata
    const allPatterns = patterns.flatMap(p => p.metadata.patterns || []);
    const uniquePatterns = Array.from(new Set(allPatterns));
    
    if (uniquePatterns.length > 0) {
      return uniquePatterns[0];
    }
    
    // Fallback: extract key words from content
    const words = patterns[0].content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
    return words[0] || 'this topic';
  }
  
  private generateSimpleInsight(messageCount: number, topTopics: [string, number][]): string {
    const topics = topTopics.slice(0,2).map(([topic]) => topic).join(' and ');
    
    if (topics) {
      return `🧠 I'm observing this conversation (${messageCount} messages). I notice you're discussing ${topics}. Feel free to ask me for suggestions or if you'd like me to create specialized agents for these topics.`;
    } else {
      return `🧠 I'm monitoring this discussion (${messageCount} messages). I can help suggest specialized agents or provide insights as patterns emerge in your conversation.`;
    }
  }
  
  // Simple agent creation (same as before)
  async createAgentFromSuggestion(suggestionId: string, userApproval: boolean) {
    if (!userApproval) return { success: false, message: 'Agent creation cancelled by user' };

    try {
      const companion = await storage.getCompanionData();
      const suggestion = companion?.suggestions?.find((s: any) => s.id === suggestionId);
      
      if (!suggestion) {
        return { success: false, message: 'Suggestion not found' };
      }

      const agentData = {
        name: suggestion.agent_template.name,
        description: suggestion.agent_template.focus,
        currentMode: 'plasma' as const,
        llmProvider: 'claude' as const,
        systemPrompt: suggestion.agent_template.system_prompt,
        createdBy: 'companion',
        parentDiscussion: suggestion.discussionId
      };

      // Create the agent in the agents table
      const newAgent = await storage.createAgent(agentData);

      // Also add to companion observations for tracking
      await storage.addCompanionObservation({
        type: 'agent_created',
        agent: newAgent,
        timestamp: new Date().toISOString()
      });

      return { 
        success: true, 
        message: `Created ${newAgent.name} to help with this topic`,
        agent: newAgent
      };
    } catch (error) {
      console.error('Error creating agent from suggestion:', error);
      return { success: false, message: 'Failed to create agent' };
    }
  }
}

export const simpleCompanionService = new SimpleCompanionService();