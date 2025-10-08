import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const CompleteRegistration = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalisation de votre inscription...');

  useEffect(() => {
    const completeRegistration = async () => {
      try {
        console.log('🔍 Vérification de l\'authentification...');
        
        // 1. Verify user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Session non trouvée:', sessionError);
          setStatus('error');
          setMessage('Session expirée. Veuillez vous connecter.');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        console.log('✅ Session trouvée:', session.user.email);

        // 2. Get registration data from localStorage
        const registrationDataStr = localStorage.getItem('pending_school_registration');
        const logoDataStr = localStorage.getItem('pending_school_logo');
        
        if (!registrationDataStr) {
          console.error('❌ Aucune donnée d\'inscription trouvée');
          setStatus('error');
          setMessage('Aucune inscription en attente trouvée.');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        const registrationData = JSON.parse(registrationDataStr);
        console.log('📋 Données d\'inscription récupérées');

        // Check if data is not too old (1 hour)
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - registrationData.timestamp > oneHour) {
          localStorage.removeItem('pending_school_registration');
          localStorage.removeItem('pending_school_logo');
          setStatus('error');
          setMessage('Les données d\'inscription ont expiré. Veuillez recommencer.');
          setTimeout(() => navigate('/inscription'), 3000);
          return;
        }

        setMessage('Création de votre école...');

        // 3. Upload logo if provided
        let logoUrl = null;
        if (logoDataStr) {
          console.log('📤 Upload du logo...');
          try {
            const blob = await fetch(logoDataStr).then(r => r.blob());
            const fileName = `${session.user.id}-${Date.now()}.png`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('school-logos')
              .upload(fileName, blob, { upsert: true });

            if (!uploadError && uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('school-logos')
                .getPublicUrl(fileName);
              logoUrl = publicUrl;
              console.log('✅ Logo uploadé');
            }
          } catch (logoError) {
            console.warn('⚠️ Erreur upload logo (continuer sans logo):', logoError);
          }
        }

        // 4. Create school record
        console.log('🏫 Création de l\'école...');
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: registrationData.schoolName,
            school_type: registrationData.schoolType,
            academic_year: registrationData.academicYear,
            address: registrationData.address,
            phone: registrationData.schoolPhone,
            email: session.user.email,
            logo_url: logoUrl,
            language: registrationData.language,
            semester_type: registrationData.semesterType,
            currency: registrationData.currency,
            timezone: registrationData.timezone,
            sponsor_name: registrationData.sponsorName || null,
            sponsor_phone: registrationData.sponsorPhone || null,
            sponsor_email: registrationData.sponsorEmail || null,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (schoolError) {
          console.error('❌ Erreur création école:', schoolError);
          throw new Error('Erreur lors de la création de l\'école');
        }

        console.log('✅ École créée:', schoolData.id);

        // 5. Update user profile with school_id
        console.log('👤 Mise à jour du profil...');
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            school_id: schoolData.id,
            phone: registrationData.adminPhone || null
          })
          .eq('id', session.user.id);

        if (profileError) {
          console.error('❌ Erreur mise à jour profil:', profileError);
          throw new Error('Erreur lors de la mise à jour du profil');
        }

        // 6. Create academic year
        console.log('📅 Création de l\'année académique...');
        const { error: yearError } = await supabase
          .from('academic_years')
          .insert({
            school_id: schoolData.id,
            name: registrationData.academicYear,
            start_date: registrationData.academicYearStartDate,
            end_date: registrationData.academicYearEndDate,
            is_current: true
          });

        if (yearError) {
          console.error('❌ Erreur année académique:', yearError);
          throw new Error('Erreur lors de la création de l\'année académique');
        }

        // 7. Initialize school with default data
        console.log('⚙️ Initialisation des données par défaut...');
        const { error: initError } = await supabase.rpc('initialize_new_school', {
          school_id_param: schoolData.id,
          school_type_param: registrationData.schoolType,
          academic_year_name_param: registrationData.academicYear
        });

        if (initError) {
          console.warn('⚠️ Avertissement initialisation:', initError);
          // Ne pas bloquer si l'initialisation échoue
        }

        // 8. Clean up localStorage
        localStorage.removeItem('pending_school_registration');
        localStorage.removeItem('pending_school_logo');
        console.log('🧹 Nettoyage des données temporaires');

        console.log('✅ Inscription complète !');
        setStatus('success');
        setMessage('École créée avec succès ! Redirection...');
        
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error: any) {
        console.error('❌ Erreur lors de la finalisation:', error);
        setStatus('error');
        setMessage(error.message || 'Une erreur est survenue. Veuillez contacter le support.');
      }
    };

    completeRegistration();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Finalisation de l'inscription
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-green-600 font-semibold">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-red-600 font-semibold">{message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteRegistration;
