// DeepSeek service for multi-LLM responses

const DEEPSEEK_API_BASE = 'https://api.deepseek.com';

// DeepSeek service for Grand Central collaborative workspace

export async function generateResponse(
  prompt: string,
  conversationHistory: { role: string; content: string }[],
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('DeepSeek API key not provided');
  }
  try {
    const messages = [
      {
        role: 'system',
        content: "You are DeepSeek, a helpful AI assistant in a collaborative workspace. Provide thoughtful, relevant responses based on the context and conversation history."
      },
      ...conversationHistory.slice(-8).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return "I encountered an error while generating a response. Please try again.";
  }
}