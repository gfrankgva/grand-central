import Anthropic from '@anthropic-ai/sdk';

// Claude service for Grand Central collaborative workspace

const TIMEOUT_MS = 30000; // 30 second timeout

export async function generateResponse(
  prompt: string,
  conversationHistory: { role: string; content: string }[],
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.CLAUDE_API_KEY;
  if (!key) {
    const error = new Error('Claude API key not provided');
    error.name = 'InvalidKeyError';
    throw error;
  }
  
  const anthropic = new Anthropic({ 
    apiKey: key,
    timeout: TIMEOUT_MS
  });
  
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.slice(-8).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: "user",
      content: prompt
    }
  ];

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    system: "You are Claude, a helpful AI assistant in a collaborative workspace. Provide thoughtful, relevant responses based on the context and conversation history.",
    messages
  });

  return response.content[0]?.type === 'text' 
    ? response.content[0].text 
    : "I'm sorry, I couldn't generate a response.";
}