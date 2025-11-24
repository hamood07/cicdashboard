import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  successRate: number;
  avgDuration: number;
  totalPipelines: number;
  todayPipelines: number;
  trend: 'up' | 'down' | 'neutral';
}

export const DashboardStats = () => {
  const [stats, setStats] = useState<Stats>({
    successRate: 0,
    avgDuration: 0,
    totalPipelines: 0,
    todayPipelines: 0,
    trend: 'neutral',
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Get all pipelines from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('status, duration_seconds, completed_at')
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .not('completed_at', 'is', null);

    if (!pipelines || pipelines.length === 0) {
      return;
    }

    // Calculate success rate
    const successCount = pipelines.filter(p => p.status === 'success').length;
    const successRate = (successCount / pipelines.length) * 100;

    // Calculate average duration (in minutes)
    const completedPipelines = pipelines.filter(p => p.duration_seconds);
    const avgDuration = completedPipelines.length > 0
      ? completedPipelines.reduce((sum, p) => sum + (p.duration_seconds || 0), 0) / completedPipelines.length / 60
      : 0;

    // Get today's pipelines
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPipelines = pipelines.filter(p => 
      new Date(p.completed_at!) >= today
    ).length;

    // Calculate trend (compare last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const lastWeek = pipelines.filter(p => 
      new Date(p.completed_at!) >= sevenDaysAgo
    ).filter(p => p.status === 'success').length;

    const previousWeek = pipelines.filter(p => 
      new Date(p.completed_at!) >= fourteenDaysAgo && 
      new Date(p.completed_at!) < sevenDaysAgo
    ).filter(p => p.status === 'success').length;

    const trend = lastWeek > previousWeek ? 'up' : 
                  lastWeek < previousWeek ? 'down' : 'neutral';

    setStats({
      successRate: Math.round(successRate),
      avgDuration: Math.round(avgDuration * 10) / 10,
      totalPipelines: pipelines.length,
      todayPipelines,
      trend,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="text-3xl font-bold">{stats.successRate}%</p>
          </div>
          {stats.trend === 'up' ? (
            <TrendingUp className="w-8 h-8 text-success" />
          ) : stats.trend === 'down' ? (
            <TrendingDown className="w-8 h-8 text-error" />
          ) : (
            <Activity className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Avg Duration</p>
            <p className="text-3xl font-bold">{stats.avgDuration}m</p>
          </div>
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Per pipeline</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Builds</p>
            <p className="text-3xl font-bold">{stats.totalPipelines}</p>
          </div>
          <Activity className="w-8 h-8 text-secondary" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-3xl font-bold">{stats.todayPipelines}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-accent" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Builds today</p>
      </Card>
    </div>
  );
};
