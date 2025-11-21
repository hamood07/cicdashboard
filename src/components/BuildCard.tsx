import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, BuildStatus } from "./StatusBadge";
import { GitBranch, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Build {
  id: string;
  repository: string;
  branch: string;
  status: BuildStatus;
  duration: number; // in seconds
  timestamp: Date;
  commit: string;
  author: string;
}

interface BuildCardProps {
  build: Build;
  onClick?: () => void;
}

export const BuildCard = ({ build, onClick }: BuildCardProps) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {build.repository}
            </h3>
            <StatusBadge status={build.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitBranch className="w-4 h-4" />
              <span>{build.branch}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(build.duration)}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">
          Commit: <span className="text-foreground font-mono">{build.commit.substring(0, 7)}</span>
        </p>
        <p className="text-muted-foreground">
          By {build.author} • {formatDistanceToNow(build.timestamp, { addSuffix: true })}
        </p>
      </div>
    </Card>
  );
};
