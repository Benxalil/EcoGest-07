import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer le payload du webhook PayTech
    const webhookData = await req.json();
    console.log("Webhook PayTech reçu:", webhookData);

    // Extraire les informations importantes du webhook
    const {
      type_event,
      ref_command,
      item_price,
      currency,
      payment_method,
      operator_tx_id,
      operator_name,
      custom_field
    } = webhookData;

    // Parser les données personnalisées
    let customData = {};
    try {
      customData = JSON.parse(custom_field || '{}');
    } catch (e) {
      console.warn("Impossible de parser custom_field:", custom_field);
    }

    // Récupérer la souscription correspondante
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("paytech_transaction_id", ref_command)
      .single();

    if (subError || !subscription) {
      console.error("Souscription non trouvée pour ref_command:", ref_command, subError);
      return new Response(
        JSON.stringify({ error: "Souscription non trouvée" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Récupérer la transaction correspondante
    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("paytech_transaction_id", ref_command)
      .single();

    // Traiter selon le type d'événement
    let subscriptionStatus = subscription.status;
    let transactionStatus = transaction?.status || "pending";

    switch (type_event) {
      case "sale_complete":
      case "payment_successful":
        // Paiement réussi
        subscriptionStatus = "active";
        transactionStatus = "success";
        
        // Calculer les dates de début et fin
        const startDate = new Date();
        const endDate = new Date(startDate);
        
        // Récupérer le plan pour connaître la période
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("period")
          .eq("id", subscription.plan_id)
          .single();

        if (plan?.period === "annual") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Mettre à jour la souscription
        await supabase
          .from("subscriptions")
          .update({
            status: subscriptionStatus,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", subscription.id);

        console.log(`Souscription ${subscription.id} activée avec succès`);
        break;

      case "sale_failed":
      case "payment_failed":
        // Paiement échoué
        subscriptionStatus = "canceled";
        transactionStatus = "failed";

        await supabase
          .from("subscriptions")
          .update({
            status: subscriptionStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", subscription.id);

        console.log(`Paiement échoué pour la souscription ${subscription.id}`);
        break;

      default:
        console.log(`Type d'événement non traité: ${type_event}`);
        break;
    }

    // Mettre à jour la transaction si elle existe
    if (transaction) {
      await supabase
        .from("payment_transactions")
        .update({
          status: transactionStatus,
          gateway_response: {
            ...transaction.gateway_response,
            webhook_data: webhookData,
            processed_at: new Date().toISOString()
          }
        })
        .eq("id", transaction.id);
    }

    // Mettre à jour le statut de l'école dans la table schools si nécessaire
    if (subscriptionStatus === "active") {
      await supabase
        .from("schools")
        .update({
          subscription_status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", subscription.school_id);
    }

    console.log("Webhook traité avec succès:", {
      subscription_id: subscription.id,
      old_status: subscription.status,
      new_status: subscriptionStatus,
      transaction_status: transactionStatus
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook traité avec succès",
        subscription_id: subscription.id,
        status: subscriptionStatus
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error) {
    console.error("Erreur dans paytech-webhook:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erreur lors du traitement du webhook",
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