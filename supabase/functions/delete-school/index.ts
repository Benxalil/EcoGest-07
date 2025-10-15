import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteSchoolRequest {
  schoolId: string
  adminPassword: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non autorisé')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Authentification invalide')
    }

    // Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, school_id, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profil utilisateur introuvable')
    }

    // Vérifier que l'utilisateur est un administrateur
    if (profile.role !== 'school_admin') {
      throw new Error('Accès refusé : vous devez être administrateur')
    }

    const { schoolId, adminPassword }: DeleteSchoolRequest = await req.json()

    // Vérifier que l'utilisateur appartient bien à cette école
    if (profile.school_id !== schoolId) {
      throw new Error('Vous ne pouvez supprimer que votre propre école')
    }

    // Vérifier le mot de passe de l'administrateur
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: profile.email,
      password: adminPassword,
    })

    if (signInError) {
      throw new Error('Mot de passe incorrect')
    }

    console.log(`🗑️ Début de la suppression de l'école: ${schoolId}`)

    // Récupérer le nom de l'école pour le log
    const { data: schoolData } = await supabaseClient
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single()

    const schoolName = schoolData?.name || 'Inconnue'

    // Suppression dans l'ordre des dépendances
    const tables = [
      'student_documents',
      'payments',
      'attendances',
      'grades',
      'lesson_logs',
      'teacher_subjects',
      'exams',
      'schedules',
      'notifications',
      'announcements',
      'subjects',
      'students',
      'teachers',
      'classes',
      'academic_years',
      'payment_categories',
      'series',
      'class_labels',
      'school_user_counters',
    ]

    for (const table of tables) {
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('school_id', schoolId)

      if (error) {
        console.error(`❌ Erreur suppression ${table}:`, error)
        throw new Error(`Échec de suppression dans ${table}: ${error.message}`)
      }
      console.log(`✅ Suppression ${table} terminée`)
    }

    // Supprimer tous les profils liés à l'école
    const { data: usersToDelete } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)

    if (usersToDelete && usersToDelete.length > 0) {
      for (const userProfile of usersToDelete) {
        const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(
          userProfile.id
        )
        if (deleteUserError) {
          console.error(`❌ Erreur suppression utilisateur ${userProfile.id}:`, deleteUserError)
        }
      }
      console.log(`✅ ${usersToDelete.length} utilisateurs supprimés`)
    }

    // Supprimer l'école elle-même
    const { error: schoolError } = await supabaseClient
      .from('schools')
      .delete()
      .eq('id', schoolId)

    if (schoolError) {
      throw new Error(`Échec de suppression de l'école: ${schoolError.message}`)
    }

    // Journaliser l'action
    await supabaseClient.from('audit_logs').insert({
      category: 'security',
      level: 'warn',
      message: `École supprimée: ${schoolName}`,
      user_id: user.id,
      school_id: schoolId,
      details: {
        admin_email: profile.email,
        school_name: schoolName,
        action: 'school_deletion',
      },
    })

    console.log(`✅ École ${schoolName} supprimée avec succès`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `L'école "${schoolName}" et toutes ses données ont été supprimées définitivement.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
