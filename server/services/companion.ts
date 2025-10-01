import { storage } from "../storage";
import { generateLLMResponse } from "./llm-router";

// Pattern recognition system
interface PatternAnalysis {
  repeated_topics: {
    topic: string;
    count: number;
    context: string[];
    examples: string[];
  };
  user_struggles: {
    patterns: string[];
    frequency: number;
  };
  workflow_patterns: {
    sequences: string[];
    commonTasks: string[];
  };
}

// Companion monitoring service
export class CompanionService {
  // FIXED: Fast incremental monitoring that only analyzes recent messages
  async monitorDiscussion(discussionId: string, newMessage: any): Promise<any> {
    const settings = await storage.getSettings();
    const companionConfig = (settings as any)?.companionConfig;
    
    if (!companionConfig?.enabled || companionConfig.monitoringLevel === 'none') {
      return null;
    }

    // Don't analyze entire history - just get recent messages for pattern check
    const recentMessages = await storage.getMessagesByDiscussion(discussionId);
    const lastTenMessages = recentMessages.slice(-10); // Only analyze last 10 messages

    // Quick pattern check (not deep analysis) 
    const quickPattern = await this.quickPatternCheck(lastTenMessages, newMessage);
    
    // Return quickly to avoid timeout
    if (quickPattern.shouldSuggest && companionConfig.autoSuggest) {
      console.log('Creating agent suggestion for topic:', quickPattern.topic);
      const suggestion = await this.createQuickSuggestion(quickPattern, discussionId);
      await storage.addCompanionSuggestion(suggestion);
      return suggestion;
    }

    return null;
  }

  // FIXED: Lightweight pattern detection for repeated topics only
  private async quickPatternCheck(recentMessages: any[], newMessage: any) {
    // Extract main topic from new message
    const topic = this.extractMainTopic(newMessage.content);
    
    if (!topic) {
      return { shouldSuggest: false, topic: '', frequency: 0 };
    }

    // Count how many times this topic appears in recent messages
    const frequency = this.countTopicMentions(recentMessages, topic);
    
    // Suggest if topic mentioned 3+ times
    return {
      shouldSuggest: frequency >= 3,
      topic: topic,
      frequency: frequency
    };
  }

  // Simple topic extraction - just find the most meaningful word
  private extractMainTopic(content: string): string {
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && !['about', 'would', 'could', 'should', 'think', 'really'].includes(word));
    
    if (words.length === 0) return '';
    
    // Return the first meaningful word as the topic
    return words[0];
  }

  // Count mentions of a topic in recent messages
  private countTopicMentions(messages: any[], topic: string): number {
    return messages.filter(m => 
      m.content.toLowerCase().includes(topic.toLowerCase())
    ).length;
  }

  // Create quick suggestion without heavy analysis
  private async createQuickSuggestion(pattern: any, discussionId: string) {
    return {
      id: `suggestion-${Date.now()}`,
      discussionId,
      timestamp: new Date().toISOString(),
      type: 'agent_creation',
      content: `🧠 I notice you're discussing "${pattern.topic}" frequently. Would you like a specialized agent for this?`,
      agent_template: {
        name: `${pattern.topic.charAt(0).toUpperCase() + pattern.topic.slice(1)} Expert`,
        focus: `Specialized in ${pattern.topic} discussions and implementation`,
        system_prompt: `You are an expert in ${pattern.topic}. Focus on providing detailed, practical guidance for ${pattern.topic}-related questions and implementations.`
      }
    };
  }

  // Pattern recognition implementation
  private async analyzePatterns(messages: any[]): Promise<PatternAnalysis> {
    const topics = this.analyzeTopicFrequency(messages);
    const struggles = this.detectRepeatedQuestions(messages);
    const workflows = this.identifyTaskSequences(messages);

    return {
      repeated_topics: topics,
      user_struggles: struggles,
      workflow_patterns: workflows
    };
  }

  private analyzeTopicFrequency(messages: any[]) {
    // Simple topic extraction based on frequently mentioned keywords
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    const words = content.split(/\s+/).filter(word => word.length > 4);
    const frequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most frequent meaningful topics
    const sortedTopics = Object.entries(frequency)
      .filter(([word, count]) => count > 2)
      .sort(([,a], [,b]) => b - a);

    if (sortedTopics.length > 0) {
      const [topic, count] = sortedTopics[0];
      return {
        topic,
        count,
        context: messages.filter(m => m.content.toLowerCase().includes(topic)).map(m => m.content),
        examples: messages.slice(-3).map(m => m.content)
      };
    }

    return { topic: '', count: 0, context: [], examples: [] };
  }

  private detectRepeatedQuestions(messages: any[]) {
    const userMessages = messages.filter(m => m.sender === 'user');
    const questions = userMessages.filter(m => m.content.includes('?'));
    
    return {
      patterns: questions.map(q => q.content),
      frequency: questions.length
    };
  }

  private identifyTaskSequences(messages: any[]) {
    const tasks = messages.filter(m => 
      m.content.toLowerCase().includes('implement') ||
      m.content.toLowerCase().includes('create') ||
      m.content.toLowerCase().includes('build') ||
      m.content.toLowerCase().includes('fix')
    );

    return {
      sequences: tasks.map(t => t.content),
      commonTasks: ['implementation', 'debugging', 'design']
    };
  }

  // Agent suggestion system
  private async createAgentSuggestion(topicData: any, discussionId: string) {
    return {
      id: `suggestion-${Date.now()}`,
      discussionId,
      timestamp: new Date().toISOString(),
      type: 'agent_creation',
      suggestion: `I notice you frequently discuss "${topicData.topic}". Would you like me to create a specialized agent for this topic?`,
      agent_template: {
        name: `${topicData.topic.charAt(0).toUpperCase() + topicData.topic.slice(1)} Expert`,
        focus: `Specialized in ${topicData.topic} discussions and implementation`,
        knowledge: topicData.examples.join('\n'),
        system_prompt: `You are an expert in ${topicData.topic}. Focus on providing detailed, practical guidance for ${topicData.topic}-related questions and implementations.`
      }
    };
  }

  // Companion participation logic
  private shouldCompanionSpeak(messages: any[], patterns: PatternAnalysis): boolean {
    // Companion speaks when:
    // 1. There have been several exchanges (>3 messages) - More permissive for testing
    // 2. User seems to be struggling (repeated questions)
    // 3. Patterns show opportunity for insight
    
    console.log(`Companion check: ${messages.length} messages, topic count: ${patterns.repeated_topics.count}, topic: ${patterns.repeated_topics.topic}`);
    
    if (messages.length < 4) return false;  // More permissive threshold
    if (patterns.user_struggles.frequency > 1) return true;  // Lower threshold
    if (patterns.repeated_topics.count > 2) return true;  // Lower threshold for testing
    
    // More frequent participation for testing (every 6-8 messages)
    return messages.length % 6 === 0;
  }

  private async generateCompanionResponse(messages: any[], patterns: PatternAnalysis, companionConfig: any) {
    // Build context for companion response
    const context = `
    Recent conversation analysis:
    - Main topic discussed: ${patterns.repeated_topics.topic}
    - User question patterns: ${patterns.user_struggles.patterns.slice(-2).join(', ')}
    - Task patterns: ${patterns.workflow_patterns.commonTasks.join(', ')}
    
    Recent messages:
    ${messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n')}
    `;

    const companionPrompt = `${companionConfig.personality}
    
    Based on this conversation analysis, provide a brief, helpful insight or suggestion. 
    Focus on patterns you've noticed or ways to improve the workflow.
    Keep your response under 100 words and be supportive.
    
    ${context}`;

    try {
      // Use OpenAI for companion responses (fallback to Claude if needed)
      const settings = await storage.getSettings();
      const openaiKey = (settings as any)?.apiKeys?.openai?.key;
      const claudeKey = (settings as any)?.apiKeys?.anthropic?.key;
      
      let response;
      if (openaiKey) {
        response = await generateLLMResponse('openai', companionPrompt, [], [], openaiKey);
      } else if (claudeKey) {
        response = await generateLLMResponse('claude', companionPrompt, [], [], claudeKey);
      } else {
        // Fallback static response
        response = "I've been observing your conversation and notice some interesting patterns. Would you like me to suggest some improvements or create a specialized agent for this topic?";
      }

      return {
        id: `companion-${Date.now()}`,
        discussionId: messages[0]?.discussionId,
        content: response,
        sender: 'companion',
        llmProvider: 'companion',
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating companion response:', error);
      return null;
    }
  }

  // Agent creation from suggestions
  async createAgentFromSuggestion(suggestionId: string, userApproval: boolean) {
    if (!userApproval) return { success: false, message: 'Agent creation cancelled by user' };

    try {
      const companion = await storage.getCompanionData();
      const suggestion = companion?.suggestions?.find((s: any) => s.id === suggestionId);
      
      if (!suggestion) {
        return { success: false, message: 'Suggestion not found' };
      }

      // For now, we'll just track that the agent was "created"
      // In a full implementation, this would create actual agent entities
      const newAgent = {
        id: `agent-${Date.now()}`,
        name: suggestion.agent_template.name,
        system_prompt: suggestion.agent_template.system_prompt,
        created_by: 'companion',
        parent_discussion: suggestion.discussionId,
        created_at: new Date().toISOString()
      };

      // Store in companion memory
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

export const companionService = new CompanionService();