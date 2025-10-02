import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { useOptimizedCache } from './useOptimizedCache';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  class_id: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  emergency_contact: string | null;
  enrollment_date: string | null;
  is_active: boolean;
  parent_matricule: string | null;
  classes?: {
    id: string;
    name: string;
    level: string;
    section: string | null;
  };
  profiles?: {
    avatar_url: string | null;
  };
}

interface UseParentChildrenReturn {
  children: Child[];
  selectedChild: Child | null;
  setSelectedChildId: (childId: string) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useParentChildren = (): UseParentChildrenReturn => {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { profile } = useOptimizedUserData();
  const cache = useOptimizedCache();

  const fetchChildren = useCallback(async () => {
    if (!profile?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Vérifier le cache d'abord
      const cacheKey = `parent_children_${profile.email}`;
      const cachedData = cache.get<Child[]>(cacheKey);
      
      if (cachedData) {
        setChildren(cachedData);
        setSelectedChildId(prev => {
          if (!prev && cachedData.length > 0) {
            return cachedData[0].id;
          }
          return prev;
        });
        setLoading(false);
        return;
      }

      // Extraire le matricule parent depuis l'email (format: ParentXXX@ecole.app)
      const emailMatch = profile.email.match(/Parent(\d+)@/i);
      const parentMatricule = emailMatch ? `PARENT${emailMatch[1].padStart(3, '0')}` : null;

      // Récupérer tous les enfants liés au parent via parent_email ou parent_matricule
      const { data: childrenData, error: fetchError } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id (
            id,
            name,
            level,
            section
          ),
          profiles:user_id (
            avatar_url
          )
        `)
        .or(`parent_email.ilike.${profile.email}${parentMatricule ? `,parent_matricule.ilike.${parentMatricule}` : ''}`)
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (fetchError) throw fetchError;

      const formattedChildren = (childrenData || []).map(child => ({
        ...child,
        classes: Array.isArray(child.classes) ? child.classes[0] : child.classes,
        profiles: Array.isArray(child.profiles) ? child.profiles[0] : child.profiles
      }));

      setChildren(formattedChildren);
      
      // Sélectionner automatiquement le premier enfant
      setSelectedChildId(prev => {
        if (!prev && formattedChildren.length > 0) {
          return formattedChildren[0].id;
        }
        return prev;
      });

      // Mettre en cache pour 5 minutes
      cache.set(cacheKey, formattedChildren, 5 * 60 * 1000);

    } catch (err: any) {
      console.error('Erreur lors de la récupération des enfants:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [profile?.email, cache]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const refetch = useCallback(async () => {
    if (profile?.email) {
      const cacheKey = `parent_children_${profile.email}`;
      cache.delete(cacheKey);
      await fetchChildren();
    }
  }, [profile?.email, cache, fetchChildren]);

  const selectedChild = children.find(child => child.id === selectedChildId) || null;

  return {
    children,
    selectedChild,
    setSelectedChildId,
    loading,
    error,
    refetch
  };
};
