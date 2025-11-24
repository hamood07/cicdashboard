import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { User, Copy, Check, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [copiedGithub, setCopiedGithub] = useState(false);
  const [copiedDeployment, setCopiedDeployment] = useState(false);

  useEffect(() => {
    const fetchWebhookToken = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('webhook_token')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching webhook token:', error);
        return;
      }

      if (data?.webhook_token) {
        setWebhookToken(data.webhook_token);
      }
    };

    fetchWebhookToken();
  }, [user]);

  const webhookUrl = webhookToken 
    ? `https://erekvlqjibmzrfrzzqam.supabase.co/functions/v1/github-webhook/${webhookToken}`
    : "";

  const deploymentWebhookUrl = webhookToken 
    ? `https://erekvlqjibmzrfrzzqam.supabase.co/functions/v1/deployment-webhook/${webhookToken}`
    : "";

  const copyToClipboard = (url: string, type: 'github' | 'deployment') => {
    if (!url) return;
    
    navigator.clipboard.writeText(url);
    
    if (type === 'github') {
      setCopiedGithub(true);
      setTimeout(() => setCopiedGithub(false), 2000);
    } else {
      setCopiedDeployment(true);
      setTimeout(() => setCopiedDeployment(false), 2000);
    }
    
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Profile Settings</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                />
              </div>

              <Button className="w-full">Save Changes</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Webhook className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">GitHub Webhook Configuration</p>
                <p className="text-sm text-muted-foreground">Connect your GitHub repository to receive build events</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Your Webhook URL</Label>
                <div className="flex gap-2">
                  <Input 
                    id="webhookUrl" 
                    type="text" 
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    onClick={() => copyToClipboard(webhookUrl, 'github')}
                    variant="outline"
                    size="icon"
                    disabled={!webhookUrl}
                  >
                    {copiedGithub ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this URL in your GitHub repository webhook settings. Set the content type to <code className="px-1 py-0.5 bg-muted rounded">application/json</code> and select "Workflow runs" as the event trigger.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Webhook className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Deployment Webhook Configuration</p>
                <p className="text-sm text-muted-foreground">Track deployments from any CD tool or custom script</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deploymentWebhookUrl">Your Deployment Webhook URL</Label>
                <div className="flex gap-2">
                  <Input 
                    id="deploymentWebhookUrl" 
                    type="text" 
                    value={deploymentWebhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    onClick={() => copyToClipboard(deploymentWebhookUrl, 'deployment')}
                    variant="outline"
                    size="icon"
                    disabled={!deploymentWebhookUrl}
                  >
                    {copiedDeployment ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Send deployment events to this endpoint. Supports ArgoCD, custom scripts, or any CD tool.
                </p>
                
                <div className="mt-4 bg-muted p-4 rounded-md">
                  <p className="text-xs font-medium mb-2">Example cURL request:</p>
                  <pre className="text-xs overflow-x-auto">
{`curl -X POST ${deploymentWebhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_name": "my-app",
    "environment": "production",
    "version": "v1.2.3",
    "status": "success",
    "pipeline_run_number": 42,
    "deployed_at": "2024-01-01T12:00:00Z"
  }'`}
                  </pre>
                </div>

                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p><strong>Required fields:</strong> project_name, environment (production/staging/development), version, status (success/failed/pending/cancelled)</p>
                  <p><strong>Optional fields:</strong> pipeline_run_number (links to pipeline), deployed_at (defaults to now)</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
