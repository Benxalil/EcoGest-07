import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { useOptimizedCache } from './useOptimizedCache';

interface ParentInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  matricule: string;
}

interface UseParentInfoReturn {
  parentInfo: ParentInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useParentInfo = (): UseParentInfoReturn => {
  const [parentInfo, setParentInfo] = useState<ParentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { profile } = useOptimizedUserData();
  const cache = useOptimizedCache();

  const fetchParentInfo = useCallback(async () => {
    if (!profile?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Vérifier le cache d'abord
      const cacheKey = `parent_info_${profile.email}`;
      const cachedData = cache.get<ParentInfo>(cacheKey);
      
      if (cachedData) {
        setParentInfo(cachedData);
        setLoading(false);
        return;
      }

      // Extraire le matricule parent depuis l'email (format: ParentXXX@ecole.app)
      const emailMatch = profile.email.match(/Parent(\d+)@/i);
      const parentMatricule = emailMatch ? `PARENT${emailMatch[1].padStart(3, '0')}` : null;

      // Récupérer les informations du parent depuis la table students
      const { data: studentData, error: fetchError } = await supabase
        .from('students')
        .select('parent_first_name, parent_last_name, parent_phone, parent_email, parent_matricule')
        .or(`parent_email.ilike.${profile.email}${parentMatricule ? `,parent_matricule.ilike.${parentMatricule}` : ''}`)
        .limit(1)
        .single();

      if (fetchError) {
        // Si pas de données dans students, utiliser les données du profil
        console.warn('Parent info not found in students table, using profile data');
        setParentInfo({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          phone: profile.phone || '',
          matricule: parentMatricule || profile.email || ''
        });
        setLoading(false);
        return;
      }

      // Si on a trouvé les données dans students, les utiliser
      const info: ParentInfo = {
        firstName: studentData.parent_first_name || profile.firstName || '',
        lastName: studentData.parent_last_name || profile.lastName || '',
        email: studentData.parent_email || profile.email || '',
        phone: studentData.parent_phone || profile.phone || '',
        matricule: studentData.parent_matricule || parentMatricule || profile.email || ''
      };

      setParentInfo(info);

      // Mettre en cache pour 10 minutes
      cache.set(cacheKey, info, 10 * 60 * 1000);

    } catch (err: any) {
      console.error('Erreur lors de la récupération des infos parent:', err);
      setError(err.message || 'Erreur lors du chargement des données');
      // En cas d'erreur, utiliser les données du profil
      setParentInfo({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        matricule: profile.email || ''
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.email, profile?.firstName, profile?.lastName, profile?.phone, cache]);

  useEffect(() => {
    fetchParentInfo();
  }, [fetchParentInfo]);

  const refetch = useCallback(async () => {
    if (profile?.email) {
      const cacheKey = `parent_info_${profile.email}`;
      cache.delete(cacheKey);
      await fetchParentInfo();
    }
  }, [profile?.email, cache, fetchParentInfo]);

  return {
    parentInfo,
    loading,
    error,
    refetch
  };
};
