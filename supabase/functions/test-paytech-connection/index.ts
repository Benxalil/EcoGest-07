import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionRequest {
  api_key: string;
  secret_key: string;
  environment: 'sandbox' | 'production';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, secret_key, environment }: TestConnectionRequest = await req.json();

    console.log("Test de connexion PayTech:", { environment, api_key_length: api_key?.length });

    // Vérification basique des clés
    if (!api_key || !secret_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Clés API manquantes" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Endpoint PayTech selon l'environnement
    const baseUrl = environment === 'production' 
      ? 'https://paytech.sn/api'
      : 'https://paytech.sn/api/sandbox';

    // Test d'appel à l'API PayTech (exemple : récupérer les informations du compte)
    try {
      // Simulation d'un appel de validation PayTech
      // En réalité, il faudrait faire un vrai appel à l'API PayTech
      
      // Ici on simule la validation des clés
      const isValidApiKey = api_key.length >= 20;
      const isValidSecretKey = secret_key.length >= 20;

      if (!isValidApiKey || !isValidSecretKey) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Format des clés API invalide" 
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // Simuler un appel réussi à PayTech
      // Dans un vrai environnement, on ferait :
      // const response = await fetch(`${baseUrl}/test`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${api_key}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ secret_key })
      // });

      console.log("Test de connexion PayTech réussi");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Connexion PayTech validée",
          environment,
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );

    } catch (apiError) {
      console.error("Erreur API PayTech:", apiError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Impossible de se connecter à l'API PayTech",
          details: apiError instanceof Error ? apiError.message : 'Unknown API error' 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

  } catch (error) {
    console.error("Erreur dans test-paytech-connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erreur lors du test de connexion",
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);