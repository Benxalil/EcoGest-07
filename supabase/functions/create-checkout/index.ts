import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  plan_code: string;
  school_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header manquant" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { plan_code, school_id }: CheckoutRequest = await req.json();

    console.log("Création de checkout pour:", { plan_code, school_id });

    // 1. Récupérer la configuration PayTech
    const { data: payTechConfig, error: configError } = await supabase
      .from("payment_config")
      .select("*")
      .eq("is_active", true)
      .single();

    if (configError || !payTechConfig) {
      console.error("Configuration PayTech non trouvée:", configError);
      return new Response(
        JSON.stringify({ error: "Configuration PayTech non disponible" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Récupérer le plan d'abonnement
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("code", plan_code)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      console.error("Plan non trouvé:", planError);
      return new Response(
        JSON.stringify({ error: "Plan d'abonnement non trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Récupérer les informations de l'école
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("name, email")
      .eq("id", school_id)
      .single();

    if (schoolError || !school) {
      console.error("École non trouvée:", schoolError);
      return new Response(
        JSON.stringify({ error: "École non trouvée" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Créer une entrée de souscription en attente
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert([{
        school_id,
        plan_id: plan.id,
        status: "pending",
        amount: plan.price,
        currency: plan.currency
      }])
      .select()
      .single();

    if (subscriptionError || !subscription) {
      console.error("Erreur création souscription:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création de la souscription" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Créer la transaction de paiement
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert([{
        subscription_id: subscription.id,
        school_id,
        amount: plan.price,
        currency: plan.currency,
        status: "pending"
      }])
      .select()
      .single();

    if (transactionError) {
      console.error("Erreur création transaction:", transactionError);
    }

    // 6. Appeler l'API PayTech pour créer la session de paiement
    const payTechPayload = {
      item_name: `Abonnement ${plan.name} - ${school.name}`,
      item_price: plan.price / 100, // Convertir centimes en unité principale
      currency: plan.currency,
      ref_command: subscription.id,
      command_name: `Abonnement ${plan.name}`,
      env: payTechConfig.environment,
      ipn_url: `${supabaseUrl}/functions/v1/paytech-webhook`,
      success_url: `${Deno.env.get("SITE_URL") || "https://app.ecogest.com"}/abonnement?success=true`,
      cancel_url: `${Deno.env.get("SITE_URL") || "https://app.ecogest.com"}/abonnement?cancelled=true`,
      custom_field: JSON.stringify({
        subscription_id: subscription.id,
        school_id,
        plan_code
      })
    };

    console.log("Appel PayTech API avec:", payTechPayload);

    // Simulation de l'appel PayTech (à remplacer par le vrai appel)
    const payTechResponse = {
      success: true,
      redirect_url: `https://paytech.sn/payment/${subscription.id}?amount=${plan.price / 100}&item=${encodeURIComponent(payTechPayload.item_name)}`,
      token: `paytech_${subscription.id}`,
      ref_command: subscription.id
    };

    // 7. Mettre à jour la transaction avec les informations PayTech
    if (payTechResponse.success && transaction) {
      await supabase
        .from("payment_transactions")
        .update({
          paytech_transaction_id: payTechResponse.ref_command,
          gateway_response: payTechResponse
        })
        .eq("id", transaction.id);

      // Mettre à jour la souscription avec l'ID de transaction PayTech
      await supabase
        .from("subscriptions")
        .update({
          paytech_transaction_id: payTechResponse.ref_command
        })
        .eq("id", subscription.id);
    }

    console.log("Checkout créé avec succès:", payTechResponse);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: payTechResponse.redirect_url,
        subscription_id: subscription.id,
        transaction_id: transaction?.id,
        amount: plan.price / 100,
        currency: plan.currency
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error) {
    console.error("Erreur dans create-checkout:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erreur lors de la création du checkout",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);