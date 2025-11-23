import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-github-event',
};

const WEBHOOK_SECRET = Deno.env.get('GITHUB_WEBHOOK_SECRET');

async function verifySignature(payload: string, signature: string | null): Promise<boolean> {
  if (!signature || !WEBHOOK_SECRET) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

// Validation schema for GitHub webhook
const githubWorkflowRunSchema = z.object({
  action: z.string(),
  workflow_run: z.object({
    id: z.number(),
    name: z.string().max(255),
    head_branch: z.string().max(255),
    head_sha: z.string().max(40),
    status: z.enum(['queued', 'in_progress', 'completed']),
    conclusion: z.enum(['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required']).nullable(),
    run_number: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    run_started_at: z.string().nullable(),
  }),
  repository: z.object({
    name: z.string().max(255),
    full_name: z.string().max(255),
    html_url: z.string().url().max(500),
  }),
  sender: z.object({
    login: z.string().max(255),
  }),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check event type first
    const eventType = req.headers.get('x-github-event');
    console.log(`Received GitHub webhook event: ${eventType}`);
    
    // Only process workflow_run events
    if (eventType !== 'workflow_run') {
      console.log(`Ignoring non-workflow_run event: ${eventType}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Event type not processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Verify webhook signature
    const signature = req.headers.get('x-hub-signature-256');
    const rawBody = await req.text();
    
    const isValid = await verifySignature(rawBody, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate payload
    const payload = JSON.parse(rawBody);

    // Validate the webhook payload
    const validatedData = githubWorkflowRunSchema.parse(payload);

    // Map GitHub status to our status
    const mapStatus = (status: string, conclusion: string | null) => {
      if (status === 'queued') return 'pending';
      if (status === 'in_progress') return 'running';
      if (conclusion === 'success') return 'success';
      if (conclusion === 'failure') return 'failed';
      if (conclusion === 'cancelled') return 'cancelled';
      return 'failed';
    };

    const pipelineStatus = mapStatus(
      validatedData.workflow_run.status,
      validatedData.workflow_run.conclusion
    );

    // Get or create project
    let { data: project } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('name', validatedData.repository.name)
      .single();

    if (!project) {
      // Get the first user to assign as creator
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      if (!users || users.length === 0) {
        throw new Error('No users found. Please create a user first.');
      }

      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: validatedData.repository.name,
          repository_url: validatedData.repository.html_url,
          created_by: users[0].user_id,
        })
        .select('id, created_by')
        .single();

      if (createError) throw createError;
      project = newProject;
    }

    if (!project) {
      throw new Error('Failed to create or fetch project');
    }

    // Calculate duration if completed
    let durationSeconds = null;
    if (validatedData.workflow_run.status === 'completed' && validatedData.workflow_run.run_started_at) {
      const startTime = new Date(validatedData.workflow_run.run_started_at).getTime();
      const endTime = new Date(validatedData.workflow_run.updated_at).getTime();
      durationSeconds = Math.floor((endTime - startTime) / 1000);
    }

    // Get user profile for sender
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1)
      .single();

    const triggeredBy = senderProfile?.user_id || project.created_by;

    // Create or update pipeline
    const { data: existingPipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('project_id', project.id)
      .eq('run_number', validatedData.workflow_run.run_number)
      .single();

    if (existingPipeline) {
      // Update existing pipeline
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({
          status: pipelineStatus,
          duration_seconds: durationSeconds,
          completed_at: validatedData.workflow_run.status === 'completed' 
            ? new Date().toISOString() 
            : null,
        })
        .eq('id', existingPipeline.id);

      if (updateError) throw updateError;
    } else {
      // Create new pipeline
      const { error: insertError } = await supabase
        .from('pipelines')
        .insert({
          project_id: project.id,
          run_number: validatedData.workflow_run.run_number,
          branch: validatedData.workflow_run.head_branch,
          commit_hash: validatedData.workflow_run.head_sha,
          status: pipelineStatus,
          triggered_by: triggeredBy,
          duration_seconds: durationSeconds,
          started_at: validatedData.workflow_run.run_started_at || new Date().toISOString(),
          completed_at: validatedData.workflow_run.status === 'completed' 
            ? new Date().toISOString() 
            : null,
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pipeline updated successfully',
        project: validatedData.repository.name,
        run_number: validatedData.workflow_run.run_number,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid webhook payload',
          details: error.errors,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
