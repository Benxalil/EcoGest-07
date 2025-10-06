import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { oldSuffix, newSuffix, schoolId } = await req.json();

    if (!oldSuffix || !newSuffix || !schoolId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Synchronisation des identifiants: ${oldSuffix} → ${newSuffix} pour l'école ${schoolId}`);

    // Normaliser les suffixes (remplacer underscore par tiret pour le domaine)
    const oldDomain = oldSuffix.replace(/_/g, '-') + '.ecogest.app';
    const newDomain = newSuffix.replace(/_/g, '-') + '.ecogest.app';

    // Récupérer tous les profils de cette école
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .eq('school_id', schoolId)
      .neq('role', 'school_admin'); // Les admins gardent leur email personnel

    if (profilesError) {
      console.error('Erreur récupération profils:', profilesError);
      throw profilesError;
    }

    console.log(`${profiles?.length || 0} profils à synchroniser`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Mettre à jour chaque utilisateur dans auth.users
    for (const profile of profiles || []) {
      try {
        // Construire le nouvel email
        const emailParts = profile.email.split('@');
        if (emailParts.length !== 2) {
          console.warn(`Format email invalide pour le profil ${profile.id}: ${profile.email}`);
          continue;
        }

        const matricule = emailParts[0]; // Ex: Eleve035, Prof012
        const oldEmailDomain = emailParts[1];

        // Vérifier que l'email appartient bien à l'ancien domaine
        if (!oldEmailDomain.includes(oldDomain) && !oldEmailDomain.includes(oldSuffix)) {
          console.log(`Email non concerné: ${profile.email}`);
          continue;
        }

        const newEmail = `${matricule}@${newDomain}`;

        console.log(`Mise à jour: ${profile.email} → ${newEmail}`);

        // Mettre à jour l'email dans auth.users
        const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
          profile.id,
          { email: newEmail }
        );

        if (updateAuthError) {
          console.error(`Erreur auth pour ${profile.id}:`, updateAuthError);
          errors.push(`${profile.email}: ${updateAuthError.message}`);
          errorCount++;
          continue;
        }

        // Mettre à jour l'email dans la table profiles
        const { error: updateProfileError } = await supabaseClient
          .from('profiles')
          .update({ email: newEmail })
          .eq('id', profile.id);

        if (updateProfileError) {
          console.error(`Erreur profil pour ${profile.id}:`, updateProfileError);
          errors.push(`${profile.email}: ${updateProfileError.message}`);
          errorCount++;
          continue;
        }

        successCount++;
      } catch (error) {
        console.error(`Erreur traitement profil ${profile.id}:`, error);
        errors.push(`${profile.email}: ${error.message}`);
        errorCount++;
      }
    }

    const result = {
      success: true,
      message: `Synchronisation terminée: ${successCount} réussis, ${errorCount} erreurs`,
      stats: {
        total: profiles?.length || 0,
        success: successCount,
        errors: errorCount
      },
      errorDetails: errors.length > 0 ? errors : undefined
    };

    console.log('Résultat synchronisation:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
