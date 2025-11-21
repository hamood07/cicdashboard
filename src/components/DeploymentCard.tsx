import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, BuildStatus } from "./StatusBadge";
import { Rocket, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface Deployment {
  id: string;
  service: string;
  environment: "production" | "staging" | "development";
  version: string;
  status: BuildStatus;
  timestamp: Date;
  deployedBy: string;
}

interface DeploymentCardProps {
  deployment: Deployment;
}

const environmentColors = {
  production: "bg-error/10 text-error border-error/20",
  staging: "bg-warning/10 text-warning border-warning/20",
  development: "bg-primary/10 text-primary border-primary/20",
};

export const DeploymentCard = ({ deployment }: DeploymentCardProps) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{deployment.service}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn(environmentColors[deployment.environment])}
                >
                  {deployment.environment}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Tag className="w-3 h-3" />
                  <span className="font-mono">{deployment.version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <StatusBadge status={deployment.status} />
      </div>
      
      <div className="text-sm text-muted-foreground">
        Deployed by {deployment.deployedBy} • {formatDistanceToNow(deployment.timestamp, { addSuffix: true })}
      </div>
    </Card>
  );
};
