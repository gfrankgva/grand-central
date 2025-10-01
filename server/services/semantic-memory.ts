import OpenAI from 'openai';

// Memory item with semantic embedding
interface MemoryItem {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    llm: string;
    phase: 'plasma' | 'gas' | 'liquid' | 'solid';
    breathCount: number;
    patterns: string[];
    timestamp: Date;
  };
}

// In-memory storage for semantic memories
const memories: MemoryItem[] = [];

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Store a memory with semantic embedding
export async function storeMemory(
  llmId: string,
  message: string,
  context: {
    currentPhase: 'plasma' | 'gas' | 'liquid' | 'solid';
    breathNumber: number;
    detectedPatterns: string[];
  },
  apiKey: string
): Promise<void> {
  try {
    const openai = new OpenAI({ apiKey });
    
    // Generate embedding for semantic search
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Store memory
    const memory: MemoryItem = {
      id: `${llmId}-${Date.now()}`,
      content: message,
      embedding,
      metadata: {
        llm: llmId,
        phase: context.currentPhase,
        breathCount: context.breathNumber,
        patterns: context.detectedPatterns,
        timestamp: new Date()
      }
    };
    
    memories.push(memory);
    console.log(`[Semantic Memory] Stored memory for ${llmId} in phase ${context.currentPhase}`);
  } catch (error) {
    console.error('[Semantic Memory] Error storing memory:', error);
  }
}

// Find patterns using semantic search
export async function findPatterns(
  query: string,
  apiKey: string,
  threshold: number = 0.8,
  limit: number = 5
): Promise<Array<{ content: string; similarity: number; metadata: any }>> {
  try {
    if (memories.length === 0) {
      return [];
    }
    
    const openai = new OpenAI({ apiKey });
    
    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Calculate similarities
    const results = memories.map(memory => ({
      content: memory.content,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding),
      metadata: memory.metadata
    }));
    
    // Filter by threshold and sort by similarity
    const filteredResults = results
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    console.log(`[Semantic Memory] Found ${filteredResults.length} patterns for query`);
    return filteredResults;
  } catch (error) {
    console.error('[Semantic Memory] Error finding patterns:', error);
    return [];
  }
}

// Get all memories for a specific phase
export function getMemoriesByPhase(phase: 'plasma' | 'gas' | 'liquid' | 'solid'): MemoryItem[] {
  return memories.filter(m => m.metadata.phase === phase);
}

// Get recent memories
export function getRecentMemories(count: number = 10): MemoryItem[] {
  return memories.slice(-count);
}

// Clear all memories (for testing)
export function clearMemories(): void {
  memories.length = 0;
  console.log('[Semantic Memory] Cleared all memories');
}

// Get memory stats
export function getMemoryStats() {
  const phaseDistribution = {
    plasma: memories.filter(m => m.metadata.phase === 'plasma').length,
    gas: memories.filter(m => m.metadata.phase === 'gas').length,
    liquid: memories.filter(m => m.metadata.phase === 'liquid').length,
    solid: memories.filter(m => m.metadata.phase === 'solid').length,
  };
  
  return {
    totalMemories: memories.length,
    phaseDistribution,
    latestBreathCount: memories.length > 0 ? memories[memories.length - 1].metadata.breathCount : 0
  };
}
