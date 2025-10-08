import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { useOptimizedCache } from './useOptimizedCache';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';

export interface Child {
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

export interface ParentInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  matricule: string;
}

export interface ParentData {
  children: Child[];
  selectedChild: Child | null;
  parentInfo: ParentInfo | null;
  todaySchedules: any[];
  announcements: any[];
  loading: boolean;
  error: string | null;
}

export const useParentData = (selectedChildId?: string | null) => {
  const [data, setData] = useState<ParentData>({
    children: [],
    selectedChild: null,
    parentInfo: null,
    todaySchedules: [],
    announcements: [],
    loading: true,
    error: null
  });

  const { profile } = useOptimizedUserData();
  const cache = useOptimizedCache();
  const isFetchingRef = useRef(false);
  const cacheKey = `parent-data-${profile?.id}`;

  const fetchParentData = useCallback(async () => {
    if (isFetchingRef.current || !profile?.email || !profile?.schoolId) {
      return;
    }

    // Vérifier le cache
    const cachedData = cache.get(cacheKey) as ParentData | null;
    if (cachedData) {
      setData({ ...cachedData, loading: false, error: null });
      return;
    }

    isFetchingRef.current = true;
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Extraire le matricule parent depuis l'email
      const emailMatch = profile.email.match(/Parent(\d+)@/i);
      const parentMatricule = emailMatch ? `PARENT${emailMatch[1].padStart(3, '0')}` : null;

      // 🚀 Récupérer TOUTES les données en parallèle avec Promise.all
      const [childrenResult, parentInfoResult, announcementsResult] = await Promise.all([
        // 1. Enfants
        supabase
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
          .or(`parent_email.eq.${profile.email}${parentMatricule ? `,parent_matricule.eq.${parentMatricule}` : ''}`)
          .eq('is_active', true)
          .order('first_name', { ascending: true }),

        // 2. Info parent (depuis le premier enfant)
        supabase
          .from('students')
          .select('parent_first_name, parent_last_name, parent_phone, parent_email, parent_matricule, emergency_contact')
          .or(`parent_email.ilike.${profile.email}${parentMatricule ? `,parent_matricule.ilike.${parentMatricule}` : ''}`)
          .limit(1)
          .maybeSingle(),

        // 3. Annonces
        supabase
          .from('announcements')
          .select('id, title, content, created_at, priority, is_urgent, target_audience')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Formater les enfants
      const formattedChildren = (childrenResult.data || []).map((child: any) => ({
        ...child,
        classes: Array.isArray(child.classes) ? child.classes[0] : child.classes,
        profiles: Array.isArray(child.profiles) ? child.profiles[0] : child.profiles
      }));

      // Déterminer l'enfant sélectionné
      const selectedChild = selectedChildId
        ? formattedChildren.find((c: Child) => c.id === selectedChildId) || formattedChildren[0] || null
        : formattedChildren[0] || null;

      // Récupérer les schedules de l'enfant sélectionné
      let todaySchedules: any[] = [];
      if (selectedChild?.class_id) {
        const today = new Date().getDay();
        const { data: schedulesData } = await supabase
          .from('schedules')
          .select('id, start_time, end_time, room, subject, activity_name, day, subjects(name, color)')
          .eq('class_id', selectedChild.class_id)
          .eq('day_of_week', today)
          .order('start_time', { ascending: true });

        todaySchedules = schedulesData || [];
      }

      // Construire les infos du parent
      let parentInfo: ParentInfo;
      if (parentInfoResult.data) {
        const studentData = parentInfoResult.data;
        let firstName = studentData.parent_first_name || '';
        let lastName = studentData.parent_last_name || '';

        // Extraire depuis emergency_contact si nécessaire
        if (!firstName && !lastName && studentData.emergency_contact) {
          const nameMatch = studentData.emergency_contact.match(/^([^\-]+)\s-\s/);
          if (nameMatch) {
            const fullName = nameMatch[1].trim();
            const nameParts = fullName.split(' ');
            if (nameParts.length >= 2) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' ');
            } else {
              firstName = fullName;
            }
          }
        }

        parentInfo = {
          firstName: firstName || profile.firstName || '',
          lastName: lastName || profile.lastName || '',
          email: studentData.parent_email || profile.email || '',
          phone: studentData.parent_phone || profile.phone || '',
          matricule: studentData.parent_matricule || parentMatricule || profile.email || ''
        };
      } else {
        // Fallback sur le profil
        parentInfo = {
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          phone: profile.phone || '',
          matricule: parentMatricule || profile.email || ''
        };
      }

      // Filtrer les annonces pour les parents
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'parent',
        false
      );

      const parentData: ParentData = {
        children: formattedChildren,
        selectedChild,
        parentInfo,
        todaySchedules,
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // Mettre en cache pour 30 secondes
      cache.set(cacheKey, parentData, 30 * 1000);
      setData(parentData);

    } catch (err: any) {
      console.error('[useParentData] Error:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Erreur de chargement'
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [profile?.email, profile?.schoolId, profile?.firstName, profile?.lastName, profile?.phone, selectedChildId, cache, cacheKey]);

  // Fetch initial
  useEffect(() => {
    if (profile?.email && profile?.schoolId) {
      fetchParentData();
    }
  }, [profile?.email, profile?.schoolId, fetchParentData]);

  // Realtime - UN SEUL CHANNEL pour tout
  useEffect(() => {
    if (!profile?.schoolId) return;

    const handleUpdate = () => {
      cache.deleteWithEvent(cacheKey);
      setTimeout(fetchParentData, 300);
    };

    const channel = supabase
      .channel('parent-all-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `school_id=eq.${profile.schoolId}`
      }, handleUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schedules',
        filter: `school_id=eq.${profile.schoolId}`
      }, handleUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
        filter: `school_id=eq.${profile.schoolId}`
      }, handleUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.schoolId, fetchParentData, cache, cacheKey]);

  return {
    children: data.children,
    selectedChild: data.selectedChild,
    parentInfo: data.parentInfo,
    todaySchedules: data.todaySchedules,
    announcements: data.announcements,
    loading: data.loading,
    error: data.error,
    refetch: fetchParentData
  };
};
