import { storage } from "../storage";
import { InsertMetric } from "@shared/schema";

// Interface for metrics dashboard data
export interface MetricsDashboard {
  // Response Metrics
  avgResponseTime: number; // <5s target
  
  // Task Completion (Tetris Score)
  tasksStarted: number;
  tasksCompleted: number;
  completionRate: number; // 0-100%
  
  // Pattern Efficiency
  patternsDetected: number;
  agentsCreated: number;
  agentUtilization: number;
  
  // System Health
  activeDiscussions: number;
  messagesPerHour: number;
  llmSuccessRate: number;
}

// Track a metric
export async function trackMetric(
  type: string, 
  value: number, 
  metadata?: any,
  discussionId?: string,
  projectId?: string
): Promise<void> {
  try {
    const metric: InsertMetric = {
      type,
      value,
      metadata: metadata ? JSON.stringify(metadata) : null,
      discussionId,
      projectId
    };
    
    await storage.addMetric(metric);
  } catch (error) {
    console.error('Error tracking metric:', error);
    // Don't throw - metrics shouldn't break the main flow
  }
}

// Get metrics summary for dashboard
export async function getMetricsSummary(): Promise<MetricsDashboard> {
  try {
    const metrics = await storage.getMetrics();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter metrics by time periods
    const recentMetrics = metrics.filter((m) => new Date(m.timestamp!) > oneHourAgo);
    const dailyMetrics = metrics.filter((m) => new Date(m.timestamp!) > oneDayAgo);

    // Response time metrics
    const responseTimeMetrics = dailyMetrics.filter((m) => m.type === 'response_time');
    const avgResponseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length / 1000 // Convert to seconds
      : 0;

    // Task completion metrics
    const taskStartedMetrics = dailyMetrics.filter((m) => m.type === 'task_started');
    const taskCompletedMetrics = dailyMetrics.filter((m) => m.type === 'task_completed');
    const tasksStarted = taskStartedMetrics.length;
    const tasksCompleted = taskCompletedMetrics.length;
    const completionRate = tasksStarted > 0 ? (tasksCompleted / tasksStarted) * 100 : 0;

    // Pattern detection metrics
    const patternMetrics = dailyMetrics.filter((m) => m.type === 'pattern_detected');
    const agentCreatedMetrics = dailyMetrics.filter((m) => m.type === 'agent_created');
    const patternsDetected = patternMetrics.length;
    const agentsCreated = agentCreatedMetrics.length;
    const agentUtilization = patternsDetected > 0 ? (agentsCreated / patternsDetected) * 100 : 0;

    // System health metrics
    const llmCallMetrics = recentMetrics.filter((m) => m.type === 'llm_call');
    const llmSuccessMetrics = recentMetrics.filter((m) => m.type === 'llm_success');
    const llmSuccessRate = llmCallMetrics.length > 0 ? (llmSuccessMetrics.length / llmCallMetrics.length) * 100 : 100;

    // Get active discussions and message rate
    const discussions = await storage.getDiscussions();
    const activeDiscussions = discussions.length;
    
    const messageMetrics = recentMetrics.filter((m) => m.type === 'message_sent');
    const messagesPerHour = messageMetrics.length;

    return {
      avgResponseTime,
      tasksStarted,
      tasksCompleted, 
      completionRate,
      patternsDetected,
      agentsCreated,
      agentUtilization,
      activeDiscussions,
      messagesPerHour,
      llmSuccessRate
    };
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    return {
      avgResponseTime: 0,
      tasksStarted: 0,
      tasksCompleted: 0,
      completionRate: 0,
      patternsDetected: 0,
      agentsCreated: 0,
      agentUtilization: 0,
      activeDiscussions: 0,
      messagesPerHour: 0,
      llmSuccessRate: 100
    };
  }
}

// Helper to track LLM response time
export function startResponseTimer() {
  return Date.now();
}

export async function endResponseTimer(
  startTime: number, 
  provider: string, 
  success: boolean,
  discussionId?: string,
  projectId?: string
) {
  const responseTime = Date.now() - startTime;
  
  await trackMetric('response_time', responseTime, { provider }, discussionId, projectId);
  await trackMetric('llm_call', 1, { provider }, discussionId, projectId);
  
  if (success) {
    await trackMetric('llm_success', 1, { provider }, discussionId, projectId);
  }
}