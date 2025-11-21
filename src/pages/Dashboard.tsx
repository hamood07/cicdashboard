import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Activity, CheckCircle2, XCircle, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { StatusBadge, BuildStatus } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";

interface Pipeline {
  id: string;
  project_id: string;
  run_number: number;
  branch: string;
  status: BuildStatus;
  duration_seconds: number | null;
  started_at: string;
  projects: {
    name: string;
  };
}

const Dashboard = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    successRate: 0,
    successful: 0,
    failed: 0,
    avgDuration: 0,
  });

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    const { data, error } = await supabase
      .from("pipelines")
      .select(`
        *,
        projects(name)
      `)
      .order("started_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching pipelines:", error);
      return;
    }

    setPipelines(data as Pipeline[]);

    // Calculate stats
    const total = data.length;
    const successful = data.filter((p) => p.status === "success").length;
    const failed = data.filter((p) => p.status === "failed").length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    const avgDuration = data.length > 0
      ? Math.round(
          data
            .filter((p) => p.duration_seconds)
            .reduce((acc, p) => acc + (p.duration_seconds || 0), 0) / data.length
        )
      : 0;

    setStats({ total, successRate, successful, failed, avgDuration });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor your CI/CD pipelines at a glance</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            icon={TrendingUp}
            trend={{ value: "5% from last week", positive: true }}
          />
          <StatCard
            title="Builds Today"
            value={stats.total}
            icon={Activity}
          />
          <StatCard title="Successful" value={stats.successful} icon={CheckCircle2} />
          <StatCard title="Failed" value={stats.failed} icon={XCircle} />
          <StatCard
            title="Avg Build Time"
            value={formatDuration(stats.avgDuration)}
            icon={Clock}
          />
        </div>

        {/* Running Pipelines */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Pipelines</h2>
          <div className="space-y-4">
            {pipelines.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No pipelines yet. Create your first project to get started!</p>
              </Card>
            ) : (
              pipelines.map((pipeline) => (
                <Card key={pipeline.id} className="p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{pipeline.projects.name}</h3>
                        <StatusBadge status={pipeline.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Branch: {pipeline.branch}</span>
                        <span>Run #{pipeline.run_number}</span>
                        <span>Duration: {formatDuration(pipeline.duration_seconds)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(pipeline.started_at), { addSuffix: true })}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
