import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, Key, CheckCircle, XCircle, Eye, EyeOff, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface PayTechConfig {
  id?: string;
  encrypted_api_key: string;
  encrypted_secret_key: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
}

export default function PayTechConfig() {
  const { toast } = useToast();
  const { userProfile, loading } = useUserRole();
  const [config, setConfig] = useState<PayTechConfig>({
    encrypted_api_key: '',
    encrypted_secret_key: '',
    environment: 'sandbox',
    is_active: true
  });
  const [showKeys, setShowKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Vérifier si l'utilisateur est super_admin
  const isSuperAdmin = userProfile?.role === 'super_admin';

  useEffect(() => {
    if (!loading && isSuperAdmin) {
      loadConfig();
    }
  }, [loading, isSuperAdmin]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          id: data.id,
          encrypted_api_key: data.encrypted_api_key,
          encrypted_secret_key: data.encrypted_secret_key,
          environment: data.environment as 'sandbox' | 'production',
          is_active: data.is_active
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration PayTech:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration PayTech",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    if (!config.encrypted_api_key || !config.encrypted_secret_key) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir les clés API avant de tester la connexion",
        variant: "destructive"
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-paytech-connection', {
        body: {
          api_key: config.encrypted_api_key,
          secret_key: config.encrypted_secret_key,
          environment: config.environment
        }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        toast({
          title: "✅ Connexion réussie !",
          description: "Les clés PayTech sont valides et la connexion fonctionne",
          className: "bg-green-50 border-green-200 text-green-800"
        }); } else {
        setConnectionStatus('error');
        toast({
          title: "❌ Connexion échouée",
          description: data.error || "Impossible de se connecter à PayTech",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur de test de connexion:', error);
      setConnectionStatus('error');
      toast({
        title: "Erreur de test",
        description: "Une erreur est survenue lors du test de connexion",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // Préparer les données pour la sauvegarde
      const configData = {
        encrypted_api_key: config.encrypted_api_key,
        encrypted_secret_key: config.encrypted_secret_key,
        environment: config.environment,
        is_active: config.is_active
      };

      let result;
      if (config.id) {
        // Mise à jour
        result = await supabase
          .from('payment_config')
          .update(configData)
          .eq('id', config.id); } else {
        // Création
        result = await supabase
          .from('payment_config')
          .insert([configData]);
      }

      if (result.error) throw result.error;

      setHasUnsavedChanges(false);
      toast({
        title: "✅ Configuration sauvegardée",
        description: "La configuration PayTech a été enregistrée avec succès",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      // Recharger la config pour obtenir l'ID si c'était une création
      if (!config.id) {
        await loadConfig();
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Rediriger si l'utilisateur n'est pas super_admin
  if (!loading && !isSuperAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Accès refusé</h2>
                <p className="text-muted-foreground">
                  Cette page est réservée aux super-administrateurs uniquement.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuration PayTech</h1>
            <p className="text-muted-foreground">
              Configurez l'intégration PayTech pour les paiements d'abonnements
            </p>
          </div>
          <Badge variant={config.is_active ? "default" : "secondary"}>
            {config.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>

        {/* Alerte d'accès */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Accès Super-Administrateur :</strong> Cette page permet de configurer les clés API PayTech globales 
            qui seront utilisées par toutes les écoles pour leurs paiements d'abonnement.
          </AlertDescription>
        </Alert>

        {/* Configuration PayTech */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Clés API PayTech
            </CardTitle>
            <CardDescription>
              Configurez les clés API PayTech pour traiter les paiements via Mobile Money
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Switch */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Environnement</Label>
                <p className="text-sm text-muted-foreground">
                  Choisissez sandbox pour les tests ou production pour les paiements réels
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${config.environment === 'sandbox' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Sandbox
                </span>
                <Switch
                  checked={config.environment === 'production'}
                  onCheckedChange={(checked) => {
                    setConfig(prev => ({
                      ...prev,
                      environment: checked ? 'production' : 'sandbox'
                    }));
                    setHasUnsavedChanges(true);
                    setConnectionStatus('unknown');
                  }}
                />
                <span className={`text-sm ${config.environment === 'production' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Production
                </span>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api-key">Clé API PayTech</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKeys ? "text" : "password"}
                  value={config.encrypted_api_key}
                  onChange={(e) => {
                    setConfig(prev => ({
                      ...prev,
                      encrypted_api_key: e.target.value
                    }));
                    setHasUnsavedChanges(true);
                    setConnectionStatus('unknown');
                  }}
                  placeholder="Saisissez votre clé API PayTech"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <Label htmlFor="secret-key">Clé Secrète PayTech</Label>
              <div className="relative">
                <Input
                  id="secret-key"
                  type={showKeys ? "text" : "password"}
                  value={config.encrypted_secret_key}
                  onChange={(e) => {
                    setConfig(prev => ({
                      ...prev,
                      encrypted_secret_key: e.target.value
                    }));
                    setHasUnsavedChanges(true);
                    setConnectionStatus('unknown');
                  }}
                  placeholder="Saisissez votre clé secrète PayTech"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'unknown' && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                connectionStatus === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {connectionStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">Connexion PayTech validée</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-800 font-medium">Erreur de connexion PayTech</span>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={testConnection}
                variant="outline"
                disabled={isTestingConnection}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingConnection ? "Test en cours..." : "Tester la connexion"}
              </Button>
              <Button
                onClick={saveConfig}
                disabled={!hasUnsavedChanges || isSaving}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations sur PayTech */}
        <Card>
          <CardHeader>
            <CardTitle>Informations PayTech</CardTitle>
            <CardDescription>
              Détails sur l'intégration PayTech et les moyens de paiement supportés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Moyens de paiement supportés :</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Wave (Sénégal)</li>
                  <li>• Orange Money</li>
                  <li>• Free Money</li>
                  <li>• Autres Mobile Money</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Fonctionnalités :</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Paiements sécurisés via PayTech</li>
                  <li>• Webhooks automatiques</li>
                  <li>• Gestion des abonnements</li>
                  <li>• Facturation automatisée</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}