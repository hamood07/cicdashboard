import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gitlab-token, x-gitlab-event',
};

const WEBHOOK_SECRET = Deno.env.get('GITLAB_WEBHOOK_SECRET');

// Validation schema for GitLab webhook
const gitlabPipelineSchema = z.object({
  object_kind: z.literal('pipeline'),
  object_attributes: z.object({
    id: z.number(),
    iid: z.number(),
    ref: z.string().max(255),
    sha: z.string().max(40),
    status: z.enum(['pending', 'running', 'success', 'failed', 'canceled', 'skipped']),
    duration: z.number().nullable(),
    created_at: z.string(),
    finished_at: z.string().nullable(),
  }),
  project: z.object({
    name: z.string().max(255),
    web_url: z.string().url().max(500),
  }),
  user: z.object({
    username: z.string().max(255),
  }),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook token
    const token = req.headers.get('x-gitlab-token');
    if (!token || token !== WEBHOOK_SECRET) {
      console.error('Invalid webhook token');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate payload
    const payload = await req.json();
    console.log('Received GitLab webhook event');

    // Validate the webhook payload
    const validatedData = gitlabPipelineSchema.parse(payload);

    // Map GitLab status to our status
    const mapStatus = (status: string) => {
      switch (status) {
        case 'pending': return 'pending';
        case 'running': return 'running';
        case 'success': return 'success';
        case 'failed': return 'failed';
        case 'canceled': return 'cancelled';
        default: return 'failed';
      }
    };

    const pipelineStatus = mapStatus(validatedData.object_attributes.status);

    // Get or create project
    let { data: project } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('name', validatedData.project.name)
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
          name: validatedData.project.name,
          repository_url: validatedData.project.web_url,
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
      .eq('run_number', validatedData.object_attributes.iid)
      .single();

    if (existingPipeline) {
      // Update existing pipeline
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({
          status: pipelineStatus,
          duration_seconds: validatedData.object_attributes.duration,
          completed_at: validatedData.object_attributes.finished_at,
        })
        .eq('id', existingPipeline.id);

      if (updateError) throw updateError;
    } else {
      // Create new pipeline
      const { error: insertError } = await supabase
        .from('pipelines')
        .insert({
          project_id: project.id,
          run_number: validatedData.object_attributes.iid,
          branch: validatedData.object_attributes.ref,
          commit_hash: validatedData.object_attributes.sha,
          status: pipelineStatus,
          triggered_by: triggeredBy,
          duration_seconds: validatedData.object_attributes.duration,
          started_at: validatedData.object_attributes.created_at,
          completed_at: validatedData.object_attributes.finished_at,
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pipeline updated successfully',
        project: validatedData.project.name,
        pipeline_id: validatedData.object_attributes.iid,
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
