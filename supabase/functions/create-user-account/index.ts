import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string; // Format: matricule@école (ex: ELEVE001@ecole_best)
  password: string;
  role: string;
  first_name: string;
  last_name: string;
  school_id?: string;
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

    const { email, password, role, first_name, last_name, school_id }: CreateUserRequest = await req.json()

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
    
    // Validate email format (should be matricule@école)
    if (!email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email must be in format: matricule@ecole' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Transform school_suffix to valid domain format
    // Example: ecole_best -> ecole-best.ecogest.app
    const [matricule, schoolSuffix] = email.split('@')
    const validDomain = schoolSuffix.replace(/_/g, '-') + '.ecogest.app'
    const authEmail = `${matricule}@${validDomain}`

    console.log('Creating user with auth email:', authEmail)

    // Create user with admin API using valid email format
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: authEmail, // Format valide: Prof03@ecole-best.ecogest.app
      password,
      email_confirm: true,
      user_metadata: {
        role,
        first_name,
        last_name,
        school_id,
        matricule: matricule,
        display_email: email, // Garder le format original pour l'affichage
        school_suffix: schoolSuffix
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
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
        message: `User ${email} created successfully` 
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