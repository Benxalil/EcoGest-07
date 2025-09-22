import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { useUserRole } from "./useUserRole";

interface Series {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export function useSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useNotifications();
  const { userProfile } = useUserRole();

  const fetchSeries = async () => {
    if (!userProfile?.schoolId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('code');

      if (error) {
        console.error('Error fetching series:', error);
        setError(error.message);
        showError({
          title: "Erreur",
          description: "Impossible de charger les séries.",
        });
        return;
      }

      setSeries(data || []);
    } catch (error) {
      console.error('Error:', error);
      setError('Erreur lors du chargement des séries');
      showError({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des séries.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.schoolId) {
      fetchSeries();
    }
  }, [userProfile?.schoolId]);

  return {
    series,
    loading,
    error,
    refreshSeries: fetchSeries
  };
}