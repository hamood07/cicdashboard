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
  const [copied, setCopied] = useState(false);

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

  const copyToClipboard = () => {
    if (!webhookUrl) return;
    
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
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
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                    disabled={!webhookUrl}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this URL in your GitHub repository webhook settings. Set the content type to <code className="px-1 py-0.5 bg-muted rounded">application/json</code> and select "Workflow runs" as the event trigger.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
