-- Add webhook token to profiles for user-specific GitHub webhook endpoints
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webhook_token TEXT UNIQUE;

-- Generate unique webhook tokens for existing users
UPDATE public.profiles 
SET webhook_token = encode(gen_random_bytes(32), 'hex')
WHERE webhook_token IS NULL;

-- Make webhook_token required for new profiles
ALTER TABLE public.profiles ALTER COLUMN webhook_token SET DEFAULT encode(gen_random_bytes(32), 'hex');
ALTER TABLE public.profiles ALTER COLUMN webhook_token SET NOT NULL;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_webhook_token ON public.profiles(webhook_token);