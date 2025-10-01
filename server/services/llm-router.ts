import { 
  type Message, 
  type ContextItem, 
  type LLMProvider 
} from "@shared/schema";
import { generateResponse as generateOpenAIResponse } from "./openai";
import { generateResponse as generateClaudeResponse } from "./claude";
import { generateResponse as generateDeepseekResponse } from "./deepseek";
import { generateResponse as generateGrokResponse } from "./grok";
import { 
  retryWithBackoff, 
  parseError, 
  logStructuredError,
  canAttemptRequest
} from "./error-handler";

export async function generateLLMResponse(
  provider: LLMProvider,
  userInput: string,
  messages: Message[],
  context: ContextItem[],
  apiKey?: string,
  globalContext: any[] = []
): Promise<string> {
  // Check circuit breaker before attempting
  if (!canAttemptRequest(provider)) {
    throw new Error(`Circuit breaker OPEN for ${provider} - service temporarily unavailable`);
  }
  // Build conversation history for context
  const conversationHistory = messages.slice(-10).map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  // Build global context string from files, URLs, and instructions
  const globalContextString = globalContext.length > 0 
    ? `Global Context:\n${globalContext.map(item => {
        switch (item.type) {
          case 'file':
            return `File "${item.metadata?.fileName || 'Uploaded File'}":\n${item.content}`;
          case 'url':
            return `Reference URL: ${item.content}`;
          case 'instruction':
            return `Global Instructions: ${item.content}`;
          default:
            return `${item.type}: ${item.content}`;
        }
      }).join('\n\n')}\n\n`
    : '';

  // Build local discussion context string from files and links
  const localContextString = context.length > 0 
    ? `Discussion Context:\n${context.map(item => 
        item.type === 'file' 
          ? `File "${item.name}":\n${item.content}` 
          : `Link "${item.name}": ${item.content}`
      ).join('\n\n')}\n\n`
    : '';

  const fullPrompt = `${globalContextString}${localContextString}User: ${userInput}`;

  // Wrap provider call with retry logic and error handling
  try {
    const response = await retryWithBackoff(async () => {
      switch (provider) {
        case "openai":
          return generateOpenAIResponse(fullPrompt, conversationHistory, apiKey);
        case "claude":
          return generateClaudeResponse(fullPrompt, conversationHistory, apiKey);
        case "deepseek":
          return generateDeepseekResponse(fullPrompt, conversationHistory, apiKey);
        case "grok":
          return generateGrokResponse(fullPrompt, conversationHistory, apiKey);
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }
    }, provider, `generate response for ${userInput.substring(0, 50)}...`);
    
    return response;
  } catch (error) {
    // Parse and log structured error
    const structuredError = parseError(error, provider);
    logStructuredError(structuredError);
    
    // Re-throw for fallback handling at higher level
    throw error;
  }
}