import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeploymentRealtime = (onUpdate: () => void) => {
  const { toast } = useToast();

  useEffect(() => {
    // Enable realtime for deployments
    const channel = supabase
      .channel('deployments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deployments',
        },
        (payload) => {
          console.log('New deployment detected:', payload);
          
          const deployment = payload.new as any;
          const envEmoji = deployment.environment === 'production' ? '🚀' : 
                          deployment.environment === 'staging' ? '🧪' : '🔧';
          
          toast({
            title: `${envEmoji} New deployment`,
            description: `${deployment.version} deployed to ${deployment.environment}`,
          });
          
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, toast]);
};
