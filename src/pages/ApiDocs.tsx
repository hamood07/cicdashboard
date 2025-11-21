import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const ApiDocs = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const baseUrl = window.location.origin.replace(
    "lovableproject.com",
    "supabase.co"
  );
  const projectId = "erekvlqjibmzrfrzzqam";
  const webhookBaseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language = "bash", label }: { code: string; language?: string; label: string }) => (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10"
        onClick={() => copyToClipboard(code, label)}
      >
        {copiedCode === label ? (
          <CheckCircle2 className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Code className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">API Documentation</h1>
          </div>
          <p className="text-muted-foreground">
            Webhook endpoints to integrate your CI/CD providers with the dashboard
          </p>
        </div>

        <Tabs defaultValue="github" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="github">GitHub Actions</TabsTrigger>
            <TabsTrigger value="gitlab">GitLab CI</TabsTrigger>
            <TabsTrigger value="jenkins">Jenkins</TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">GitHub Actions Webhook</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Endpoint URL</h3>
                  <CodeBlock
                    code={`${webhookBaseUrl}/github-webhook`}
                    label="github-endpoint"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2">Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Go to your GitHub repository settings</li>
                    <li>Navigate to "Webhooks" and click "Add webhook"</li>
                    <li>Paste the endpoint URL above</li>
                    <li>Set Content type to "application/json"</li>
                    <li><strong>Secret:</strong> Enter the value you configured for GITHUB_WEBHOOK_SECRET</li>
                    <li>Select "Let me select individual events" and check "Workflow runs"</li>
                    <li>Click "Add webhook"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Expected Payload</h3>
                  <CodeBlock
                    code={`{
  "action": "completed",
  "workflow_run": {
    "id": 123456,
    "name": "CI Pipeline",
    "head_branch": "main",
    "head_sha": "abc123def456",
    "status": "completed",
    "conclusion": "success",
    "run_number": 42
  },
  "repository": {
    "name": "my-project",
    "html_url": "https://github.com/user/my-project"
  }
}`}
                    language="json"
                    label="github-payload"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="gitlab" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">GitLab CI Webhook</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Endpoint URL</h3>
                  <CodeBlock
                    code={`${webhookBaseUrl}/gitlab-webhook`}
                    label="gitlab-endpoint"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2">Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Go to your GitLab project settings</li>
                    <li>Navigate to "Webhooks"</li>
                    <li>Paste the endpoint URL above</li>
                    <li><strong>Secret token:</strong> Enter the value you configured for GITLAB_WEBHOOK_SECRET</li>
                    <li>Select the "Pipeline events" trigger</li>
                    <li>Click "Add webhook"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Expected Payload</h3>
                  <CodeBlock
                    code={`{
  "object_kind": "pipeline",
  "object_attributes": {
    "id": 123,
    "iid": 42,
    "ref": "main",
    "sha": "abc123def456",
    "status": "success",
    "duration": 125
  },
  "project": {
    "name": "my-project",
    "web_url": "https://gitlab.com/user/my-project"
  }
}`}
                    language="json"
                    label="gitlab-payload"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="jenkins" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Jenkins Webhook</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Endpoint URL</h3>
                  <CodeBlock
                    code={`${webhookBaseUrl}/jenkins-webhook`}
                    label="jenkins-endpoint"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2">Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Install the "Notification Plugin" in Jenkins</li>
                    <li>Go to your job configuration</li>
                    <li>Add a "Job Notifications" post-build action</li>
                    <li>Set Format to "JSON"</li>
                    <li>Add the endpoint URL with token: <code className="text-xs bg-muted px-1 py-0.5 rounded">{webhookBaseUrl}/jenkins-webhook?token=YOUR_JENKINS_SECRET</code></li>
                    <li>Or add custom header: <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Jenkins-Token: YOUR_JENKINS_SECRET</code></li>
                    <li>Select events: "Job Started", "Job Completed", "Job Finalized"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Expected Payload</h3>
                  <CodeBlock
                    code={`{
  "name": "my-project",
  "url": "https://jenkins.example.com/job/my-project/",
  "build": {
    "number": 42,
    "phase": "COMPLETED",
    "status": "SUCCESS",
    "url": "https://jenkins.example.com/job/my-project/42/",
    "scm": {
      "commit": "abc123def456",
      "branch": "main"
    },
    "duration": 125000
  }
}`}
                    language="json"
                    label="jenkins-payload"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="p-6 mt-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Testing Your Webhooks
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can test your webhook endpoints using curl or any HTTP client:
          </p>
          <CodeBlock
            code={`curl -X POST ${webhookBaseUrl}/github-webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "completed",
    "workflow_run": {
      "id": 123,
      "name": "Test Build",
      "head_branch": "main",
      "head_sha": "test123",
      "status": "completed",
      "conclusion": "success",
      "run_number": 1,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:02:00Z",
      "run_started_at": "2025-01-01T00:00:00Z"
    },
    "repository": {
      "name": "test-project",
      "full_name": "user/test-project",
      "html_url": "https://github.com/user/test-project"
    },
    "sender": {
      "login": "testuser"
    }
  }'`}
            label="test-curl"
          />
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocs;
