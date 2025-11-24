import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for deployment webhook
const deploymentSchema = z.object({
  project_name: z.string().max(255),
  environment: z.enum(['production', 'staging', 'development']),
  version: z.string().max(255),
  status: z.enum(['success', 'failed', 'pending', 'cancelled']),
  pipeline_run_number: z.number().optional(),
  deployed_at: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract webhook token from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const webhookToken = pathParts[pathParts.length - 1];

    console.log(`Received deployment webhook request with token: ${webhookToken}`);

    // Verify the webhook token and get the user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('webhook_token', webhookToken)
      .single();

    if (profileError || !profile) {
      console.error('Invalid webhook token:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    console.log('Received deployment payload:', payload);

    // Validate the webhook payload
    const validatedData = deploymentSchema.parse(payload);

    // Get or create project for this user
    let { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('name', validatedData.project_name)
      .eq('created_by', profile.user_id)
      .single();

    if (!project) {
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: validatedData.project_name,
          created_by: profile.user_id,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating project:', createError);
        throw createError;
      }
      project = newProject;
    }

    if (!project) {
      throw new Error('Failed to create or fetch project');
    }

    // Try to find the related pipeline if run_number is provided
    let pipelineId = null;
    if (validatedData.pipeline_run_number) {
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('project_id', project.id)
        .eq('run_number', validatedData.pipeline_run_number)
        .single();

      if (pipeline) {
        pipelineId = pipeline.id;
      } else {
        console.warn(`Pipeline with run_number ${validatedData.pipeline_run_number} not found`);
      }
    }

    // Create deployment record
    const deploymentData = {
      project_id: project.id,
      pipeline_id: pipelineId,
      environment: validatedData.environment,
      version: validatedData.version,
      status: validatedData.status,
      deployed_by: profile.user_id,
      deployed_at: validatedData.deployed_at || new Date().toISOString(),
    };

    const { data: deployment, error: deploymentError } = await supabase
      .from('deployments')
      .insert(deploymentData)
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment:', deploymentError);
      throw deploymentError;
    }

    console.log('Deployment created successfully:', deployment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deployment recorded successfully',
        deployment_id: deployment.id,
        project: validatedData.project_name,
        environment: validatedData.environment,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing deployment webhook:', error);
    
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
