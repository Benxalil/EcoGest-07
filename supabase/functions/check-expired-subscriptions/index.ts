import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[CRON] Vérification des abonnements expirés à: ${now.toISOString()}`);

    // Récupérer les abonnements actifs dont la date de fin est passée
    const { data: expiredSubs, error } = await supabase
      .from("subscriptions")
      .select(`
        id, 
        school_id, 
        end_date,
        schools!inner(id, name)
      `)
      .eq("status", "active")
      .lt("end_date", now.toISOString());

    if (error) {
      console.error("[CRON] Erreur récupération abonnements expirés:", error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500 }
      );
    }

    console.log(`[CRON] ${expiredSubs?.length || 0} abonnements expirés trouvés`);

    // Mettre à jour chaque abonnement expiré
    for (const sub of expiredSubs || []) {
      // Mettre à jour la souscription
      await supabase
        .from("subscriptions")
        .update({ 
          status: "expired",
          updated_at: now.toISOString()
        })
        .eq("id", sub.id);

      // Mettre à jour le statut de l'école
      await supabase
        .from("schools")
        .update({ 
          subscription_status: "expired",
          updated_at: now.toISOString()
        })
        .eq("id", sub.school_id);

      console.log(`[CRON] ✅ Abonnement expiré: ${sub.schools.name} (${sub.id})`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        expired_count: expiredSubs?.length || 0,
        processed_at: now.toISOString()
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("[CRON] Erreur inattendue:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erreur lors de la vérification des expirations",
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500 }
    );
  }
};

serve(handler);
