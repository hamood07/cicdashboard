import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePipelineRealtime = (onUpdate: () => void) => {
  const { toast } = useToast();

  useEffect(() => {
    // Enable realtime for pipelines
    const channel = supabase
      .channel('pipelines-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipelines',
        },
        (payload) => {
          console.log('Pipeline change detected:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const newStatus = (payload.new as any)?.status;
            const oldStatus = (payload.old as any)?.status;
            
            if (newStatus !== oldStatus) {
              const statusEmoji = newStatus === 'success' ? '✅' : 
                                newStatus === 'failed' ? '❌' : 
                                newStatus === 'running' ? '🔄' : '⏸️';
              
              toast({
                title: `${statusEmoji} Pipeline ${newStatus}`,
                description: `Build #${(payload.new as any)?.run_number} status updated`,
              });
            }
          }
          
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, toast]);
};
