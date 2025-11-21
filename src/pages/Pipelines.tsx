import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { StatusBadge, BuildStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { GitBranch } from "lucide-react";

interface Pipeline {
  id: string;
  run_number: number;
  branch: string;
  status: BuildStatus;
  duration_seconds: number | null;
  started_at: string;
  commit_hash: string;
  projects: {
    name: string;
  };
  profiles: {
    full_name: string | null;
  };
}

const Pipelines = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const navigate = useNavigate();

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
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Error fetching pipelines:", error);
      return;
    }

    // Fetch user profiles separately
    const userIds = [...new Set(data?.map(p => p.triggered_by) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedData = data?.map(pipeline => ({
      ...pipeline,
      profiles: profilesMap.get(pipeline.triggered_by) || { full_name: null }
    })) || [];

    setPipelines(enrichedData as Pipeline[]);
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pipelines</h1>
            <p className="text-muted-foreground mt-1">View and manage all pipeline runs</p>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold">Repository</th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Triggered By</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Started</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {pipelines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No pipelines found. Create your first project to get started!
                    </td>
                  </tr>
                ) : (
                  pipelines.map((pipeline) => (
                    <tr
                      key={pipeline.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{pipeline.projects.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{pipeline.branch}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={pipeline.status} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {pipeline.profiles?.full_name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDuration(pipeline.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(pipeline.started_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pipelines/${pipeline.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Pipelines;
