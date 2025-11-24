import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DeploymentCard, Deployment } from "@/components/DeploymentCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BuildStatus } from "@/components/StatusBadge";
import { useDeploymentRealtime } from "@/hooks/useDeploymentRealtime";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeploymentData {
  id: string;
  environment: "production" | "staging" | "development";
  version: string;
  status: BuildStatus;
  deployed_at: string;
  projects: {
    name: string;
  };
  profiles: {
    full_name: string | null;
  };
}

const Deployments = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [envFilter, setEnvFilter] = useState<string>("all");

  useEffect(() => {
    fetchDeployments();
  }, [envFilter]);

  useDeploymentRealtime(fetchDeployments);

  const fetchDeployments = async () => {
    let query = supabase
      .from("deployments")
      .select(`
        *,
        projects(name)
      `)
      .order("deployed_at", { ascending: false });

    // Apply environment filter
    if (envFilter !== "all") {
      query = query.eq("environment", envFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching deployments:", error);
      return;
    }

    // Fetch user profiles separately
    const userIds = [...new Set(data?.map(d => d.deployed_by) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedData = data?.map(deployment => ({
      ...deployment,
      profiles: profilesMap.get(deployment.deployed_by) || { full_name: null }
    })) || [];

    const formattedDeployments: Deployment[] = enrichedData.map((d) => ({
      id: d.id,
      service: d.projects.name,
      environment: d.environment as "production" | "staging" | "development",
      version: d.version,
      status: d.status as BuildStatus,
      timestamp: new Date(d.deployed_at),
      deployedBy: d.profiles?.full_name || "Unknown",
    }));

    setDeployments(formattedDeployments);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deployments</h1>
            <p className="text-muted-foreground mt-1">Track all deployments across environments</p>
          </div>
          <Select value={envFilter} onValueChange={setEnvFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Environments</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {deployments.length === 0 ? (
            <Card className="col-span-2 p-8 text-center">
              <p className="text-muted-foreground">No deployments yet. Deploy your first pipeline to get started!</p>
            </Card>
          ) : (
            deployments.map((deployment) => (
              <DeploymentCard key={deployment.id} deployment={deployment} />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Deployments;
