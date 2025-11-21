import { Button } from "@/components/ui/button";
import { GitBranch, Activity, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl text-center space-y-8">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <GitBranch className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-running bg-clip-text text-transparent">
          CI/CD Dashboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Monitor your pipelines, track builds, and manage deployments across all your projects in one unified dashboard
        </p>

        <div className="flex gap-4 justify-center mt-8">
          <Button size="lg" onClick={() => navigate("/login")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/signup")}>
            Sign Up
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-xl border border-border bg-card/50">
            <Activity className="w-8 h-8 text-primary mb-4 mx-auto" />
            <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              Track pipeline status and build progress in real-time
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50">
            <GitBranch className="w-8 h-8 text-primary mb-4 mx-auto" />
            <h3 className="font-semibold mb-2">Multi-Platform Support</h3>
            <p className="text-sm text-muted-foreground">
              Integrate with GitHub, GitLab, Jenkins, and more
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50">
            <Zap className="w-8 h-8 text-primary mb-4 mx-auto" />
            <h3 className="font-semibold mb-2">Deployment Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Monitor deployments across dev, staging, and production
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
