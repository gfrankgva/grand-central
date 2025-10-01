import OpenAI from 'openai';

export async function generateResponse(
  prompt: string,
  messages: Array<{ role: string; content: string }>,
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Grok API key is required');
  }

  try {
    // Grok uses OpenAI-compatible API format
    const grok = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1',
    });

    const response = await grok.chat.completions.create({
      model: 'grok-4-latest',
      messages: [
        {
          role: 'system',
          content: 'You are the Efficiency Optimizer. Focus on metrics, rapid prototyping, and cutting through abstractions. Measure everything. Keep it real.'
        },
        ...messages.slice(-8).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })), // Keep last 8 messages for context
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
      stream: false
    });

    return response.choices[0]?.message?.content || 'No response generated';
  } catch (error: any) {
    console.error('Grok API error:', error);
    throw new Error(`Grok API error: ${error.message}`);
  }
}