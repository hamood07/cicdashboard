-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  repository_url TEXT,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies (all authenticated users can view and create)
CREATE POLICY "Authenticated users can view all projects"
  ON public.projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = created_by);

-- Create pipelines table
CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  run_number INTEGER NOT NULL,
  branch TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  triggered_by UUID NOT NULL,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Pipelines policies
CREATE POLICY "Authenticated users can view all pipelines"
  ON public.pipelines FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create pipelines"
  ON public.pipelines FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pipelines"
  ON public.pipelines FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create pipeline_steps table
CREATE TABLE public.pipeline_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  duration_seconds INTEGER,
  logs TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on pipeline_steps
ALTER TABLE public.pipeline_steps ENABLE ROW LEVEL SECURITY;

-- Pipeline steps policies
CREATE POLICY "Authenticated users can view all pipeline steps"
  ON public.pipeline_steps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage pipeline steps"
  ON public.pipeline_steps FOR ALL
  USING (auth.role() = 'authenticated');

-- Create deployments table
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
  deployed_by UUID NOT NULL,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on deployments
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- Deployments policies
CREATE POLICY "Authenticated users can view all deployments"
  ON public.deployments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create deployments"
  ON public.deployments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_pipelines_project_id ON public.pipelines(project_id);
CREATE INDEX idx_pipelines_status ON public.pipelines(status);
CREATE INDEX idx_pipelines_started_at ON public.pipelines(started_at DESC);
CREATE INDEX idx_pipeline_steps_pipeline_id ON public.pipeline_steps(pipeline_id);
CREATE INDEX idx_deployments_project_id ON public.deployments(project_id);
CREATE INDEX idx_deployments_environment ON public.deployments(environment);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();