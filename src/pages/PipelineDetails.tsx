import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, BuildStatus } from "@/components/StatusBadge";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PipelineStep {
  id: string;
  step_name: string;
  step_order: number;
  status: BuildStatus;
  duration_seconds: number | null;
  started_at: string | null;
}

interface Pipeline {
  id: string;
  run_number: number;
  branch: string;
  commit_hash: string;
  status: BuildStatus;
  duration_seconds: number | null;
  started_at: string;
  projects: {
    name: string;
  };
  profiles: {
    full_name: string | null;
  };
}

const PipelineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPipelineDetails();
    }
  }, [id]);

  const fetchPipelineDetails = async () => {
    setLoading(true);

    const { data: pipelineData, error: pipelineError } = await supabase
      .from("pipelines")
      .select(`
        *,
        projects(name)
      `)
      .eq("id", id)
      .single();

    if (pipelineError) {
      console.error("Error fetching pipeline:", pipelineError);
      setLoading(false);
      return;
    }

    // Fetch user profile separately
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", pipelineData.triggered_by)
      .single();

    const enrichedPipeline = {
      ...pipelineData,
      profiles: profile || { full_name: null }
    };

    setPipeline(enrichedPipeline as Pipeline);

    const { data: stepsData, error: stepsError } = await supabase
      .from("pipeline_steps")
      .select("*")
      .eq("pipeline_id", id)
      .order("step_order");

    if (stepsError) {
      console.error("Error fetching steps:", stepsError);
    } else {
      setSteps(stepsData as PipelineStep[]);
    }

    setLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStepIcon = (status: BuildStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-error" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-running animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pipeline) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Pipeline not found</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/pipelines")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pipelines
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{pipeline.projects.name}</h1>
                <StatusBadge status={pipeline.status} />
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Run #{pipeline.run_number}</span>
                <span>•</span>
                <span>{pipeline.branch}</span>
                <span>•</span>
                <span>Triggered by {pipeline.profiles?.full_name || "Unknown"}</span>
                <span>•</span>
                <span className="font-mono text-sm">{pipeline.commit_hash.substring(0, 7)}</span>
              </div>
            </div>
            <Button variant="outline" onClick={fetchPipelineDetails}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Build Status</p>
                <p className="text-2xl font-bold capitalize">{pipeline.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Duration</p>
                <p className="text-2xl font-bold">{formatDuration(pipeline.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Started</p>
                <p className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(pipeline.started_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Build Steps</h2>
            <div className="space-y-4">
              {steps.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No steps recorded for this pipeline</p>
              ) : (
                steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <p className="font-medium">{step.step_name}</p>
                      {step.started_at && (
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(step.started_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(step.duration_seconds)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PipelineDetails;
