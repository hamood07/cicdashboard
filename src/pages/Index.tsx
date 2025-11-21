import { StatCard } from "@/components/StatCard";
import { BuildCard } from "@/components/BuildCard";
import { DeploymentCard } from "@/components/DeploymentCard";
import { mockBuilds, mockDeployments } from "@/lib/mockData";
import { Activity, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const successfulBuilds = mockBuilds.filter(b => b.status === "success").length;
  const failedBuilds = mockBuilds.filter(b => b.status === "failed").length;
  const successRate = Math.round((successfulBuilds / mockBuilds.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-running bg-clip-text text-transparent">
                CI/CD Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">Monitor your pipelines in real-time</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow"></div>
              <span className="text-sm text-muted-foreground">All systems operational</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Builds"
            value={mockBuilds.length}
            icon={Activity}
            trend={{ value: "12% from last week", positive: true }}
          />
          <StatCard
            title="Success Rate"
            value={`${successRate}%`}
            icon={TrendingUp}
            trend={{ value: "5% from last week", positive: true }}
          />
          <StatCard
            title="Successful"
            value={successfulBuilds}
            icon={CheckCircle2}
          />
          <StatCard
            title="Failed"
            value={failedBuilds}
            icon={XCircle}
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="builds" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="builds">Recent Builds</TabsTrigger>
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
          </TabsList>

          <TabsContent value="builds" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Builds</h2>
              <span className="text-sm text-muted-foreground">
                {mockBuilds.length} total builds
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockBuilds.map((build) => (
                <BuildCard key={build.id} build={build} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="deployments" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Deployments</h2>
              <span className="text-sm text-muted-foreground">
                {mockDeployments.length} active deployments
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockDeployments.map((deployment) => (
                <DeploymentCard key={deployment.id} deployment={deployment} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
