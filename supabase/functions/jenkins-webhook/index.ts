import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-jenkins-token',
};

const WEBHOOK_SECRET = Deno.env.get('JENKINS_WEBHOOK_SECRET');

// Validation schema for Jenkins webhook
const jenkinsBuildSchema = z.object({
  name: z.string().max(255),
  url: z.string().url().max(500),
  build: z.object({
    number: z.number(),
    phase: z.enum(['STARTED', 'COMPLETED', 'FINALIZED']),
    status: z.enum(['SUCCESS', 'FAILURE', 'UNSTABLE', 'ABORTED', 'NOT_BUILT']).optional(),
    url: z.string().url().max(500),
    scm: z.object({
      commit: z.string().max(40).optional(),
      branch: z.string().max(255).optional(),
    }).optional(),
    duration: z.number().optional(),
  }),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook token
    const token = req.headers.get('x-jenkins-token') || new URL(req.url).searchParams.get('token');
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
    console.log('Received Jenkins webhook event');

    // Validate the webhook payload
    const validatedData = jenkinsBuildSchema.parse(payload);

    // Map Jenkins phase/status to our status
    const mapStatus = (phase: string, status?: string) => {
      if (phase === 'STARTED') return 'running';
      if (phase === 'COMPLETED' || phase === 'FINALIZED') {
        if (status === 'SUCCESS') return 'success';
        if (status === 'FAILURE' || status === 'UNSTABLE') return 'failed';
        if (status === 'ABORTED') return 'cancelled';
        return 'failed';
      }
      return 'pending';
    };

    const pipelineStatus = mapStatus(
      validatedData.build.phase,
      validatedData.build.status
    );

    // Get or create project
    let { data: project } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('name', validatedData.name)
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
          name: validatedData.name,
          repository_url: validatedData.url,
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
      .eq('run_number', validatedData.build.number)
      .single();

    const durationSeconds = validatedData.build.duration 
      ? Math.floor(validatedData.build.duration / 1000) 
      : null;

    if (existingPipeline) {
      // Update existing pipeline
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({
          status: pipelineStatus,
          duration_seconds: durationSeconds,
          completed_at: validatedData.build.phase === 'COMPLETED' || validatedData.build.phase === 'FINALIZED'
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
          run_number: validatedData.build.number,
          branch: validatedData.build.scm?.branch || 'main',
          commit_hash: validatedData.build.scm?.commit || 'unknown',
          status: pipelineStatus,
          triggered_by: triggeredBy,
          duration_seconds: durationSeconds,
          started_at: new Date().toISOString(),
          completed_at: validatedData.build.phase === 'COMPLETED' || validatedData.build.phase === 'FINALIZED'
            ? new Date().toISOString() 
            : null,
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pipeline updated successfully',
        project: validatedData.name,
        build_number: validatedData.build.number,
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
