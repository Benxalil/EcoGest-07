import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

type UserRole = 'student' | 'teacher' | 'parent' | 'school_admin';

interface SchoolIdentifierInfo {
  schoolSuffix: string;
  schoolName: string;
}

export const useSchoolIdentifiers = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useUserRole();

  // Récupérer le suffixe de l'école actuelle
  const getSchoolSuffix = useCallback(async (): Promise<SchoolIdentifierInfo | null> => {
    if (!userProfile?.schoolId) return null;

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('school_suffix, name')
        .eq('id', userProfile.schoolId)
        .single();

      if (error) throw error;

      return {
        schoolSuffix: data.school_suffix || '',
        schoolName: data.name || ''
      };
    } catch (error) {
      console.error('Error fetching school suffix:', error);
      return null;
    }
  }, [userProfile?.schoolId]);

  // Générer un nouvel identifiant utilisateur
  const generateUserIdentifier = useCallback(async (role: UserRole): Promise<string | null> => {
    // Les administrateurs utilisent leur email directement, pas d'identifiant généré
    if (role === 'school_admin') {
      toast({
        title: "Information",
        description: "Les administrateurs utilisent leur adresse email pour se connecter",
        variant: "default",
      });
      return null;
    }

    if (!userProfile?.schoolId) {
      toast({
        title: "Erreur",
        description: "École non trouvée",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_user_identifier', {
        school_id_param: userProfile.schoolId,
        role_param: role
      });

      if (error) throw error;

      return data as string;
    } catch (error) {
      console.error('Error generating user identifier:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'identifiant utilisateur",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, toast]);

  // Obtenir les statistiques d'identifiants par rôle
  const getIdentifierStats = useCallback(async () => {
    if (!userProfile?.schoolId) return null;

    try {
      const { data, error } = await supabase
        .from('school_user_counters')
        .select('user_role, current_count')
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      const stats = {
        student: 0,
        teacher: 0,
        parent: 0,
        school_admin: 0
      };

      data?.forEach(item => {
        stats[item.user_role as UserRole] = item.current_count;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching identifier stats:', error);
      return null;
    }
  }, [userProfile?.schoolId]);

  // Valider un format d'identifiant
  const validateIdentifierFormat = useCallback((identifier: string, expectedRole?: UserRole): boolean => {
    const identifierRegex = /^(Eleve|Prof|Parent|Admin)\d{3}@[a-z0-9_]+$/;
    
    if (!identifierRegex.test(identifier)) {
      return false;
    }

    if (expectedRole) {
      const roleMap = {
        student: 'Eleve',
        teacher: 'Prof',
        parent: 'Parent',
        school_admin: 'Admin'
      };

      const expectedPrefix = roleMap[expectedRole];
      return identifier.startsWith(expectedPrefix);
    }

    return true;
  }, []);

  // Extraire les informations d'un identifiant
  const parseIdentifier = useCallback((identifier: string) => {
    const match = identifier.match(/^(Eleve|Prof|Parent|Admin)(\d{3})@([a-z0-9_]+)$/);
    
    if (!match) return null;

    const [, rolePrefix, number, schoolSuffix] = match;
    
    const roleMap = {
      'Eleve': 'student',
      'Prof': 'teacher',
      'Parent': 'parent',
      'Admin': 'school_admin'
    } as const;

    return {
      role: roleMap[rolePrefix as keyof typeof roleMap],
      number: parseInt(number),
      schoolSuffix,
      rolePrefix
    };
  }, []);

  return {
    loading,
    getSchoolSuffix,
    generateUserIdentifier,
    getIdentifierStats,
    validateIdentifierFormat,
    parseIdentifier
  };
};