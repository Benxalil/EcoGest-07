import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { useUserRole } from "./useUserRole";

interface ClassLabel {
  id: string;
  label: string;
}

export function useClassLabels() {
  const [classLabels, setClassLabels] = useState<ClassLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useNotifications();
  const { userProfile } = useUserRole();

  const fetchClassLabels = async () => {
    if (!userProfile?.schoolId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('class_labels')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('label');

      if (error) {
        console.error('Error fetching class labels:', error);
        setError(error.message);
        showError({
          title: "Erreur",
          description: "Impossible de charger les libellés de classe.",
        });
        return;
      }

      setClassLabels(data || []);
    } catch (error) {
      console.error('Error:', error);
      setError('Erreur lors du chargement des libellés');
      showError({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des libellés.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.schoolId) {
      fetchClassLabels();
    }
  }, [userProfile?.schoolId]);

  return {
    classLabels,
    loading,
    error,
    refreshClassLabels: fetchClassLabels
  };
}