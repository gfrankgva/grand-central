import OpenAI from "openai";

// OpenAI service for Grand Central collaborative workspace

const TIMEOUT_MS = 30000; // 30 second timeout

export async function generateResponse(
  prompt: string,
  conversationHistory: { role: string; content: string }[],
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    const error = new Error('OpenAI API key not provided');
    error.name = 'InvalidKeyError';
    throw error;
  }
  
  const openai = new OpenAI({ 
    apiKey: key,
    timeout: TIMEOUT_MS
  });
  
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are a helpful AI assistant in a collaborative workspace. Provide thoughtful, relevant responses based on the context and conversation history."
    },
    ...conversationHistory.slice(-8).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: "user",
      content: prompt
    }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages,
    max_tokens: 1000,
    temperature: 0.7
  });

  return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
}