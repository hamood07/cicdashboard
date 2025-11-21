import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export type BuildStatus = "success" | "failed" | "running" | "pending" | "cancelled";

interface StatusBadgeProps {
  status: BuildStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: CheckCircle2,
          label: "Success",
          className: "bg-success/10 text-success border-success/20 hover:bg-success/20",
        };
      case "failed":
        return {
          icon: XCircle,
          label: "Failed",
          className: "bg-error/10 text-error border-error/20 hover:bg-error/20",
        };
      case "running":
        return {
          icon: Loader2,
          label: "Running",
          className: "bg-running/10 text-running border-running/20 hover:bg-running/20 animate-pulse-glow",
          spinning: true,
        };
      case "pending":
        return {
          icon: Clock,
          label: "Pending",
          className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
        };
      case "cancelled":
        return {
          icon: CircleDashed,
          label: "Cancelled",
          className: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className={cn("w-3 h-3 mr-1", config.spinning && "animate-spin")} />
      {config.label}
    </Badge>
  );
};
