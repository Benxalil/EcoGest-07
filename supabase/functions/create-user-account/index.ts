import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string; // Pour admin: email classique | Pour autres: matricule (ex: Prof03)
  password: string;
  role: string;
  first_name: string;
  last_name: string;
  school_id?: string;
  school_suffix?: string; // Nécessaire pour les non-admins
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    const { email, password, role, first_name, last_name, school_id, school_suffix }: CreateUserRequest = await req.json()

    // Validate input
    if (!email || !password || !role || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Système hybride: admin utilise email, autres utilisent matricule
    let authEmail: string;
    let displayIdentifier: string;
    
    if (role === 'school_admin') {
      // Admin: email classique (doit contenir @)
      if (!email.includes('@')) {
        return new Response(
          JSON.stringify({ error: 'Admin email must be a valid email address' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      authEmail = email;
      displayIdentifier = email;
    } else {
      // Enseignant/Élève/Parent: matricule simple
      if (!school_suffix) {
        return new Response(
          JSON.stringify({ error: 'school_suffix is required for non-admin users' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // Transformer en email valide pour Supabase Auth
      // Ex: Prof03 + ecole_best -> Prof03@ecole-best.ecogest.app
      const validDomain = school_suffix.replace(/_/g, '-') + '.ecogest.app';
      authEmail = `${email}@${validDomain}`;
      displayIdentifier = email; // Juste le matricule pour l'affichage
    }

    console.log('Creating user with auth email:', authEmail, 'role:', role)
    console.log('🔐 Password received (length):', password?.length || 0)

    // Créer l'utilisateur dans auth.users
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        first_name,
        last_name,
        school_id,
        display_identifier: displayIdentifier,
        school_suffix: school_suffix || null
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      
      // Si l'utilisateur existe déjà, chercher son profil existant
      if (authError.message.includes('already been registered') || authError.message.includes('email_exists')) {
        console.log('ℹ️ Compte existant, recherche du profil:', authEmail)
        
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('email', authEmail)
          .maybeSingle()
        
        if (existingProfile) {
          console.log('✅ Profil existant trouvé:', existingProfile.id)
          return new Response(
            JSON.stringify({ 
              success: true,
              user: { id: existingProfile.id },
              display_identifier: displayIdentifier,
              message: 'User already exists, reusing existing account',
              existing: true
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer ou mettre à jour l'entrée dans profiles (upsert pour éviter les conflits)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: authEmail,
        first_name,
        last_name,
        role,
        school_id,
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Supprimer l'utilisateur auth si la création du profil échoue
      await supabaseClient.auth.admin.deleteUser(authUser.user.id)
      
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authUser.user,
        display_identifier: displayIdentifier,
        message: `User created successfully` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})