import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id?: string;
  is_published: boolean;
  priority: 'normal' | 'urgent';
  target_audience: string[];
  target_role?: string[];
  target_classes?: string[];
  is_urgent?: boolean;
  published_at?: string;
  expires_at?: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  is_published?: boolean;
  priority?: 'normal' | 'urgent';
  target_audience?: string[];
  expires_at?: Date;
}

export const useAnnouncements = () => {
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile, isTeacher, isAdmin } = useUserRole();
  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAllAnnouncements(data?.map(item => ({
        ...item,
        priority: (item as any).priority || 'normal',
        target_audience: (item as any).target_audience || ['tous']
      })) || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des annonces:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createAnnouncement = async (announcementData: CreateAnnouncementData) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Créer l'annonce avec toutes les colonnes
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: announcementData.title,
          content: announcementData.content,
          is_published: announcementData.is_published ?? false,
          priority: announcementData.priority ?? 'normal',
          target_audience: announcementData.target_audience ?? ['tous'],
          expires_at: announcementData.expires_at?.toISOString(),
          school_id: userProfile.schoolId,
          author_id: userProfile.id
        });

      if (error) throw error;

      await fetchAnnouncements();

      toast({
        title: "Annonce créée avec succès",
        description: "L'annonce a été créée et sauvegardée.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la création de l\'annonce:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création de l'annonce.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAnnouncement = async (id: string, announcementData: Partial<CreateAnnouncementData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Mettre à jour toutes les colonnes
      const updateData: any = {};
      if (announcementData.title) updateData.title = announcementData.title;
      if (announcementData.content) updateData.content = announcementData.content;
      if (announcementData.is_published !== undefined) updateData.is_published = announcementData.is_published;
      if (announcementData.priority) updateData.priority = announcementData.priority;
      if (announcementData.target_audience) updateData.target_audience = announcementData.target_audience;
      if (announcementData.expires_at) updateData.expires_at = announcementData.expires_at.toISOString();

      const { error } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchAnnouncements();

      toast({
        title: "Annonce mise à jour",
        description: "L'annonce a été mise à jour avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'annonce:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchAnnouncements();
      
      // Invalider le cache du dashboard pour synchronisation
      const cacheKey = `dashboard-${userProfile.schoolId}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(cacheKey);
      }

      toast({
        title: "Annonce supprimée",
        description: "L'annonce a été supprimée avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'annonce:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [userProfile?.schoolId]);

  // Filtrer les annonces en fonction du rôle de l'utilisateur
  const announcements = useMemo(() => {
    return filterAnnouncementsByRole(
      allAnnouncements,
      userProfile?.role || '',
      isAdmin()
    );
  }, [allAnnouncements, isAdmin, userProfile?.role]);

  return {
    announcements,
    loading,
    error,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements: fetchAnnouncements
  };
};