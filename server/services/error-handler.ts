import { type LLMProvider } from "@shared/schema";

// Error codes for structured logging
export enum ErrorCode {
  TIMEOUT = "TIMEOUT",
  API_ERROR = "API_ERROR",
  INVALID_KEY = "INVALID_KEY",
  RATE_LIMIT = "RATE_LIMIT",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN = "UNKNOWN"
}

// Structured error object
export interface LLMError {
  code: ErrorCode;
  detail: string;
  provider: LLMProvider;
  degraded: boolean;
  timestamp: Date;
  retryCount?: number;
}

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,
  cooldownMs: 30000, // 30 seconds
  halfOpenAttempts: 1
};

// Circuit breakers per provider
const circuitBreakers = new Map<LLMProvider, CircuitBreakerState>();

// Initialize circuit breaker for a provider
function getCircuitBreaker(provider: LLMProvider): CircuitBreakerState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, {
      failures: 0,
      lastFailureTime: null,
      state: 'CLOSED'
    });
  }
  return circuitBreakers.get(provider)!;
}

// Check if circuit breaker allows request
export function canAttemptRequest(provider: LLMProvider): boolean {
  const breaker = getCircuitBreaker(provider);
  
  if (breaker.state === 'CLOSED') {
    return true;
  }
  
  if (breaker.state === 'OPEN') {
    const now = new Date();
    const timeSinceFailure = breaker.lastFailureTime 
      ? now.getTime() - breaker.lastFailureTime.getTime() 
      : Infinity;
    
    if (timeSinceFailure > CIRCUIT_BREAKER_CONFIG.cooldownMs) {
      breaker.state = 'HALF_OPEN';
      console.log(`[Circuit Breaker] ${provider} moving to HALF_OPEN state`);
      return true;
    }
    return false;
  }
  
  if (breaker.state === 'HALF_OPEN') {
    return true;
  }
  
  return false;
}

// Record success for circuit breaker
export function recordSuccess(provider: LLMProvider): void {
  const breaker = getCircuitBreaker(provider);
  breaker.failures = 0;
  breaker.state = 'CLOSED';
  console.log(`[Circuit Breaker] ${provider} reset to CLOSED state`);
}

// Record failure for circuit breaker
export function recordFailure(provider: LLMProvider): void {
  const breaker = getCircuitBreaker(provider);
  breaker.failures++;
  breaker.lastFailureTime = new Date();
  
  if (breaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    breaker.state = 'OPEN';
    console.log(`[Circuit Breaker] ${provider} OPENED after ${breaker.failures} failures`);
  } else {
    console.log(`[Circuit Breaker] ${provider} failure count: ${breaker.failures}`);
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
};

// Calculate exponential backoff delay
function calculateBackoffDelay(attemptNumber: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attemptNumber);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  provider: LLMProvider,
  context: string = ""
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Check circuit breaker
      if (!canAttemptRequest(provider)) {
        throw new Error(`Circuit breaker OPEN for ${provider}`);
      }
      
      const result = await fn();
      recordSuccess(provider);
      
      if (attempt > 0) {
        console.log(`[Retry Success] ${provider} succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      recordFailure(provider);
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.log(
          `[Retry] ${provider} attempt ${attempt + 1} failed. ` +
          `Retrying in ${delay}ms. Error: ${lastError.message}`
        );
        await sleep(delay);
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error(`All retries exhausted for ${provider}`);
}

// Log structured error
export function logStructuredError(error: LLMError): void {
  console.error('[LLM Error]', JSON.stringify({
    code: error.code,
    detail: error.detail,
    provider: error.provider,
    degraded: error.degraded,
    timestamp: error.timestamp.toISOString(),
    retryCount: error.retryCount
  }, null, 2));
}

// Parse error to structured format
export function parseError(error: any, provider: LLMProvider, retryCount?: number): LLMError {
  let code = ErrorCode.UNKNOWN;
  let detail = error.message || 'Unknown error';
  
  // Parse error types
  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    code = ErrorCode.TIMEOUT;
  } else if (error.message?.includes('API key')) {
    code = ErrorCode.INVALID_KEY;
  } else if (error.message?.includes('rate limit') || error.status === 429) {
    code = ErrorCode.RATE_LIMIT;
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    code = ErrorCode.NETWORK_ERROR;
  } else if (error.status >= 400 && error.status < 600) {
    code = ErrorCode.API_ERROR;
  }
  
  return {
    code,
    detail,
    provider,
    degraded: true,
    timestamp: new Date(),
    retryCount
  };
}

// Fallback hierarchy - which provider to use if one fails
const FALLBACK_HIERARCHY: Record<LLMProvider, LLMProvider[]> = {
  openai: ['claude', 'deepseek', 'grok'],
  claude: ['openai', 'deepseek', 'grok'],
  deepseek: ['openai', 'claude', 'grok'],
  grok: ['openai', 'claude', 'deepseek']
};

// Get fallback provider
export function getFallbackProvider(
  failedProvider: LLMProvider,
  availableProviders: LLMProvider[]
): LLMProvider | null {
  const fallbacks = FALLBACK_HIERARCHY[failedProvider];
  
  for (const fallback of fallbacks) {
    if (availableProviders.includes(fallback) && canAttemptRequest(fallback)) {
      console.log(`[Fallback] Using ${fallback} as fallback for ${failedProvider}`);
      return fallback;
    }
  }
  
  return null;
}

// Get circuit breaker status for monitoring
export function getCircuitBreakerStatus(): Record<string, any> {
  const status: Record<string, any> = {};
  
  // Ensure all providers are initialized
  const allProviders: LLMProvider[] = ['openai', 'claude', 'deepseek', 'grok'];
  allProviders.forEach(provider => {
    const breaker = getCircuitBreaker(provider);
    status[provider] = {
      state: breaker.state,
      failureCount: breaker.failures,
      lastFailureTime: breaker.lastFailureTime?.toISOString() || null
    };
  });
  
  return status;
}
