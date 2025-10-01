import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Zap, Brain, Target, Activity, Clock, Users } from "lucide-react";

interface MetricsDashboard {
  avgResponseTime: number;
  tasksStarted: number;
  tasksCompleted: number;
  completionRate: number;
  patternsDetected: number;
  agentsCreated: number;
  agentUtilization: number;
  activeDiscussions: number;
  messagesPerHour: number;
  llmSuccessRate: number;
}

export default function Metrics() {
  const { data: metrics, isLoading } = useQuery<MetricsDashboard>({
    queryKey: ["/api/metrics/dashboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (value: number, target: number, isLower = false) => {
    if (isLower) {
      return value <= target ? "text-green-600" : value <= target * 1.5 ? "text-yellow-600" : "text-red-600";
    }
    return value >= target ? "text-green-600" : value >= target * 0.7 ? "text-yellow-600" : "text-red-600";
  };

  const getStatusIcon = (value: number, target: number, isLower = false) => {
    if (isLower) {
      return value <= target ? TrendingDown : TrendingUp;
    }
    return value >= target ? TrendingUp : TrendingDown;
  };

  if (!metrics) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No metrics data</h3>
          <p className="text-muted-foreground">
            Metrics will appear here as you use the system
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="metrics-page">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-6 h-6 text-gray-600" />
          <h1 className="text-3xl font-bold">System Metrics</h1>
          <Badge variant="secondary" className="ml-2">⚡ Grok Optimized</Badge>
        </div>
        <p className="text-muted-foreground">
          Real-time performance tracking and system optimization insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Response Time */}
        <Card data-testid="metric-response-time">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(2)}s</div>
            <div className="flex items-center text-xs mt-1">
              <span className={getStatusColor(metrics.avgResponseTime, 5, true)}>
                Target: &lt;5s
              </span>
            </div>
            <Progress 
              value={Math.min(100, (5 / Math.max(metrics.avgResponseTime, 0.1)) * 100)} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        {/* Task Completion Rate */}
        <Card data-testid="metric-completion-rate">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs mt-1 gap-2">
              <span>{metrics.tasksCompleted}/{metrics.tasksStarted} tasks</span>
            </div>
            <Progress value={metrics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        {/* Agent Efficiency */}
        <Card data-testid="metric-agent-efficiency">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Agent Efficiency</CardTitle>
              <Brain className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.agentUtilization.toFixed(1)}%</div>
            <div className="flex items-center text-xs mt-1 gap-2">
              <span>{metrics.agentsCreated}/{metrics.patternsDetected} patterns</span>
            </div>
            <Progress value={metrics.agentUtilization} className="mt-2" />
          </CardContent>
        </Card>

        {/* LLM Success Rate */}
        <Card data-testid="metric-llm-success">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">LLM Success Rate</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.llmSuccessRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs mt-1">
              <span className={getStatusColor(metrics.llmSuccessRate, 95)}>
                Target: &gt;95%
              </span>
            </div>
            <Progress value={metrics.llmSuccessRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Activity */}
        <Card data-testid="metric-system-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Discussions</span>
              <span className="font-semibold">{metrics.activeDiscussions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Messages/Hour</span>
              <span className="font-semibold">{metrics.messagesPerHour}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Patterns Detected</span>
              <span className="font-semibold">{metrics.patternsDetected}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Agents Created</span>
              <span className="font-semibold">{metrics.agentsCreated}</span>
            </div>
          </CardContent>
        </Card>

        {/* Grok Insights */}
        <Card data-testid="metric-grok-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-600" />
              Grok Optimization Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Current Status:</h4>
              <div className="flex gap-2 flex-wrap">
                {metrics.avgResponseTime < 5 && (
                  <Badge variant="secondary" className="text-green-600 bg-green-50">
                    ⚡ Fast Response
                  </Badge>
                )}
                {metrics.completionRate > 80 && (
                  <Badge variant="secondary" className="text-blue-600 bg-blue-50">
                    🎯 High Completion
                  </Badge>
                )}
                {metrics.llmSuccessRate > 95 && (
                  <Badge variant="secondary" className="text-purple-600 bg-purple-50">
                    🔧 Stable LLMs
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Optimization Tips:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {metrics.avgResponseTime > 5 && (
                  <li>• Consider reducing model complexity for faster responses</li>
                )}
                {metrics.completionRate < 70 && (
                  <li>• Break down larger tasks into smaller, manageable chunks</li>
                )}
                {metrics.agentUtilization < 50 && (
                  <li>• More specific patterns detected could trigger agent creation</li>
                )}
                {metrics.messagesPerHour < 10 && (
                  <li>• System usage is low - consider increasing engagement</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}