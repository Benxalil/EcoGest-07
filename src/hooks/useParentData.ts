import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { unifiedCache, CacheTTL } from '@/utils/unifiedCache';
import { filterAnnouncementsByRole, type Announcement } from '@/utils/announcementFilters';

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
  
  // ✅ Informations PÈRE
  father_first_name?: string | null;
  father_last_name?: string | null;
  father_phone?: string | null;
  father_address?: string | null;
  father_status?: string | null;
  father_profession?: string | null;
  
  // ✅ Informations MÈRE
  mother_first_name?: string | null;
  mother_last_name?: string | null;
  mother_phone?: string | null;
  mother_address?: string | null;
  mother_status?: string | null;
  mother_profession?: string | null;

  // ✅ Informations médicales
  has_medical_condition?: boolean | null;
  medical_condition_type?: string | null;
  medical_condition_description?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  
  // @deprecated - Compatibilité
  parent_phone: string | null;
  parent_first_name?: string | null;
  parent_last_name?: string | null;
  
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
}

export interface ParentInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  matricule: string;
}

interface SubjectInfo {
  name: string;
  color: string | null;
}

interface ScheduleData {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  subject: string;
  activity_name: string | null;
  day: string;
  subjects?: SubjectInfo;
}

export interface ParentData {
  children: Child[];
  selectedChild: Child | null;
  parentInfo: ParentInfo | null;
  todaySchedules: ScheduleData[];
  announcements: Announcement[];
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
  const isFetchingRef = useRef(false);
  
  // ✅ Cache partagé pour tous les enfants du même parent (ne dépend pas de selectedChildId)
  const cacheKeyRef = useRef(`parent-data-${profile?.id}`);
  const lastLogTime = useRef<number>(0);

  // Mettre à jour la ref du cache seulement selon le parent
  useEffect(() => {
    cacheKeyRef.current = `parent-data-${profile?.id}`;
  }, [profile?.id]);

  // 🚀 OPTIMISATION: Changement d'enfant intelligent - ne refetch que les schedules
  const prevSelectedChildRef = useRef(selectedChildId);
  useEffect(() => {
    if (prevSelectedChildRef.current !== selectedChildId && selectedChildId) {
      console.log('[useParentData] ⚡ Changement d\'enfant optimisé:', {
        ancien: prevSelectedChildRef.current,
        nouveau: selectedChildId
      });
      
      // Ne PAS invalider tout le cache - juste mettre à jour l'enfant sélectionné
      const child = data.children.find(c => c.id === selectedChildId);
      if (child) {
        // Fetch seulement les schedules du nouvel enfant
        const fetchSchedulesOnly = async () => {
          const today = new Date().getDay();
          const { data: schedulesData } = await supabase
            .from('schedules')
            .select('id, start_time, end_time, room, subject, activity_name, day, subjects(name, color)')
            .eq('class_id', child.class_id || '')
            .eq('day_of_week', today)
            .order('start_time', { ascending: true });

          setData(prev => ({
            ...prev,
            selectedChild: child,
            todaySchedules: schedulesData || []
          }));
        };
        
        fetchSchedulesOnly();
      }
      
      prevSelectedChildRef.current = selectedChildId;
    }
  }, [selectedChildId, data.children]);

  // Fonction de debounce pour les logs
  const shouldLog = () => {
    const now = Date.now();
    if (now - lastLogTime.current > 2000) { // Max 1 log toutes les 2 secondes
      lastLogTime.current = now;
      return true;
    }
    return false;
  };

  // 🔧 Fonction pour extraire toutes les variantes de matricule parent
  const extractParentMatricule = (email: string): string[] => {
    const variants: string[] = [];
    
    // Format 1 : ParentXXX@... → PARENT001, Parent001, PARENTXXX, ParentXXX
    const match1 = email.match(/Parent(\d+)@/i);
    if (match1) {
      const num = match1[1];
      variants.push(`PARENT${num.padStart(3, '0')}`); // PARENT001
      variants.push(`Parent${num.padStart(3, '0')}`); // Parent001
      variants.push(`PARENT${num}`);                   // PARENT1
      variants.push(`Parent${num}`);                   // Parent1
    }
    
    // Format 2 : PAREleveXXX@... → PAREleveXXX, PAReleveXXX
    const match2 = email.match(/PAR[Ee]leve([A-Z0-9]+)@/i);
    if (match2) {
      variants.push(`PAREleveALG${match2[1]}`);
      variants.push(`PAReleveALG${match2[1]}`);
      variants.push(email.split('@')[0]); // Format exact
    }
    
    // Format 3 : Tout préfixe avant @
    const prefix = email.split('@')[0];
    if (prefix && !variants.includes(prefix)) {
      variants.push(prefix);
    }
    
    return variants;
  };

  const fetchParentData = useCallback(async () => {
    if (!profile?.email || !profile?.schoolId) {
      return;
    }

    // ✅ Vérifier le cache EN PREMIER
    const cachedData = unifiedCache.get(cacheKeyRef.current) as ParentData | null;
    if (cachedData && cachedData.children.length > 0) {
      // ✅ Utiliser le cache et ajuster l'enfant sélectionné si nécessaire
      const targetChild = selectedChildId
        ? cachedData.children.find(c => c.id === selectedChildId) || cachedData.children[0]
        : cachedData.children[0];
      
      console.log('[useParentData] ✅ Cache trouvé avec', cachedData.children.length, 'enfant(s)');
      
      // Si l'enfant sélectionné est différent, récupérer ses schedules
      if (targetChild.id !== cachedData.selectedChild?.id) {
        console.log('[useParentData] 🔄 Changement d\'enfant depuis cache:', targetChild.first_name);
        const today = new Date().getDay();
        
        supabase
          .from('schedules')
          .select('id, start_time, end_time, room, subject, activity_name, day, subjects(name, color)')
          .eq('class_id', targetChild.class_id || '')
          .eq('day_of_week', today)
          .order('start_time', { ascending: true })
          .then(({ data: schedulesData }) => {
            setData({
              ...cachedData,
              selectedChild: targetChild,
              todaySchedules: schedulesData || [],
              loading: false,
              error: null
            });
          });
        return;
      }
      
      setData({ ...cachedData, loading: false, error: null });
      return;
    }

    // Éviter les requêtes parallèles
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 🚀 Extraire toutes les variantes de matricule
      const matriculeVariants = extractParentMatricule(profile.email);
      
      // 🔍 Construire les clauses OR pour recherche flexible
      const orClauses: string[] = [];
      
      // Ajouter toutes les variantes de matricule
      matriculeVariants.forEach(variant => {
        orClauses.push(`parent_matricule.ilike.${variant}`);
      });

      if (shouldLog()) {
        console.log('[useParentData] Recherche avec:', {
          email: profile.email,
          matriculeVariants,
          schoolId: profile.schoolId
        });
      }

      // 🚀 OPTIMISATION: Paralléliser TOUTES les requêtes incluant schedules
      const today = new Date().getDay();
      
      const [childrenResult, parentInfoResult, announcementsResult, schedulesResult] = await Promise.all([
        // 1. Enfants avec requête flexible
        supabase
          .from('students')
          .select(`
            id, first_name, last_name, student_number, class_id, user_id,
            date_of_birth, place_of_birth, gender, phone, address,
            parent_phone, emergency_contact, enrollment_date,
            is_active, parent_matricule,
            father_first_name, father_last_name, father_phone, father_address, father_status, father_profession,
            mother_first_name, mother_last_name, mother_phone, mother_address, mother_status, mother_profession,
            has_medical_condition, medical_condition_type, medical_condition_description, doctor_name, doctor_phone,
            classes:class_id (
              id,
              name,
              level,
              section
            )
          `)
          .or(orClauses.join(','))
          .eq('is_active', true)
          .order('first_name', { ascending: true }),

        // 2. Info parent (depuis le premier enfant) avec mêmes conditions
        supabase
          .from('students')
          .select('parent_first_name, parent_last_name, parent_phone, parent_matricule, emergency_contact')
          .or(orClauses.join(','))
          .limit(1)
          .maybeSingle(),

        // 3. Annonces
        supabase
          .from('announcements')
          .select('id, title, content, created_at, priority, is_urgent, target_audience, expires_at')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),

        // 4. Schedules anticipés (pour le premier enfant ou l'enfant sélectionné)
        selectedChildId
          ? supabase
              .from('schedules')
              .select('id, start_time, end_time, room, subject, activity_name, day, subjects(name, color)')
              .eq('school_id', profile.schoolId)
              .eq('day_of_week', today)
              .order('start_time', { ascending: true })
          : Promise.resolve({ data: [], error: null })
      ]);

      let childrenData = childrenResult.data || [];

      // 🆘 Fallback : Si aucun enfant trouvé, chercher par nom dans la même école
      if (childrenData.length === 0 && profile.firstName && profile.lastName) {
        console.warn('[useParentData] Aucun enfant trouvé par email/matricule, tentative par nom...');
        
        const { data: fallbackChildren } = await supabase
          .from('students')
          .select(`
            *,
            classes:class_id (
              id,
              name,
              level,
              section
            )
          `)
          .eq('school_id', profile.schoolId)
          .eq('is_active', true)
          .or(`parent_first_name.ilike.${profile.firstName},parent_last_name.ilike.${profile.lastName}`)
          .order('first_name', { ascending: true});
        
        if (fallbackChildren && fallbackChildren.length > 0) {
          console.log('[useParentData] ✅ Enfants trouvés par correspondance de nom:', fallbackChildren.length);
          childrenData = fallbackChildren;
        }
      }

      if (shouldLog()) {
        console.log('[useParentData] Enfants trouvés:', childrenData.length);
      }

      // Formater les enfants
      const formattedChildren = childrenData.map((child: Child) => ({
        ...child,
        classes: Array.isArray(child.classes) ? child.classes[0] : child.classes
      }));

      // Déterminer l'enfant sélectionné
      const selectedChild = selectedChildId
        ? formattedChildren.find((c: Child) => c.id === selectedChildId) || formattedChildren[0] || null
        : formattedChildren[0] || null;

      // ✅ Log pour confirmer la sélection
      console.log('[useParentData] 🎯 Enfant sélectionné:', {
        selectedChildId,
        selectedChild: selectedChild ? `${selectedChild.first_name} ${selectedChild.last_name}` : null,
        totalChildren: formattedChildren.length
      });

      // 🚀 OPTIMISATION: Utiliser les schedules déjà récupérés ou fetch si nécessaire
      let todaySchedules: ScheduleData[] = [];
      
      if (selectedChild?.class_id) {
        if (selectedChildId && schedulesResult.data) {
          // Filtrer par class_id si déjà récupéré
          todaySchedules = (schedulesResult.data as ScheduleData[]).filter(
            (s: ScheduleData) => {
              // Vérifier si le schedule appartient à la classe de l'enfant sélectionné
              return true; // Les schedules sont déjà filtrés par class_id dans la requête
            }
          );
        } else {
          // Fetch si nécessaire (cas où pas de selectedChildId initial)
          const { data: schedulesData } = await supabase
            .from('schedules')
            .select('id, start_time, end_time, room, subject, activity_name, day, subjects(name, color)')
            .eq('class_id', selectedChild.class_id)
            .eq('day_of_week', today)
            .order('start_time', { ascending: true });

          todaySchedules = schedulesData || [];
        }
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
          email: profile.email || '',
          phone: studentData.parent_phone || profile.phone || '',
          matricule: studentData.parent_matricule || matriculeVariants[0] || profile.email || ''
        };
      } else {
        // Fallback sur le profil
        parentInfo = {
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          phone: profile.phone || '',
          matricule: matriculeVariants[0] || profile.email || ''
        };
      }

      // Filtrer les annonces pour les parents
      let filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'parent',
        false
      );

      // Trier par date d'expiration (les plus proches en premier)
      filteredAnnouncements = filteredAnnouncements.sort((a, b) => {
        // Annonces sans date d'expiration viennent en dernier
        if (!a.expires_at && !b.expires_at) return 0;
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        
        const dateA = new Date(a.expires_at).getTime();
        const dateB = new Date(b.expires_at).getTime();
        const now = new Date().getTime();
        
        // Calculer la distance temporelle par rapport à maintenant
        const distA = Math.abs(dateA - now);
        const distB = Math.abs(dateB - now);
        
        return distA - distB; // Les plus proches en premier
      }).slice(0, 3); // Limiter aux 3 annonces les plus proches

      const parentData: ParentData = {
        children: formattedChildren,
        selectedChild,
        parentInfo,
        todaySchedules,
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // 🚀 OPTIMISATION: Cache plus long pour parent data (2 minutes)
      unifiedCache.set(cacheKeyRef.current, parentData, CacheTTL.DYNAMIC);
      setData(parentData);

    } catch (err: unknown) {
      console.error('[useParentData] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [profile?.email, profile?.schoolId, profile?.firstName, profile?.lastName, selectedChildId]); // ✅ Dépendances stables uniquement

  // ✅ Ref stable pour fetchParentData
  const fetchRef = useRef(fetchParentData);
  fetchRef.current = fetchParentData;

  // Fetch initial
  useEffect(() => {
    if (profile?.email && profile?.schoolId) {
      fetchRef.current();
    }
  }, [profile?.email, profile?.schoolId, selectedChildId]); // ✅ Réagir aux changements d'enfant

  // ✅ Callback stable pour les mises à jour real-time
  const handleUpdate = useCallback(() => {
    unifiedCache.delete(cacheKeyRef.current);
    setTimeout(() => fetchRef.current(), 300);
  }, []); // ✅ Pas de dépendances

  // Realtime - UN SEUL CHANNEL pour tout
  useEffect(() => {
    if (!profile?.schoolId) return;

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
  }, [profile?.schoolId]); // ✅ Une seule dépendance stable

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
