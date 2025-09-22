import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { School, Users, BookOpen, CreditCard, Calendar, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SchoolData {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  school_type: 'public' | 'private' | 'semi_private' | 'international';
  creation_year: number;
  academic_year: string;
  currency: 'FCFA' | 'EUR' | 'USD' | 'MAD' | 'GNF';
  language: 'french' | 'arabic';
  semester_type: 'semester' | 'trimester';
  subscription_status: 'cancelled' | 'trial' | 'active' | 'suspended';
  trial_end_date: string;
  sponsor_name: string;
  sponsor_email: string;
  sponsor_phone: string;
  logo_url?: string;
  school_suffix?: string;
}

interface SchoolStats {
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  subjectsCount: number;
}

export function SchoolManagement() {
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [schoolStats, setSchoolStats] = useState<SchoolStats>({
    studentsCount: 0,
    teachersCount: 0,
    classesCount: 0,
    subjectsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useUserRole();

  useEffect(() => {
    if (userProfile?.schoolId) {
      fetchSchoolData();
      fetchSchoolStats();
    }
  }, [userProfile]);

  const fetchSchoolData = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*, school_suffix')
        .eq('id', userProfile?.schoolId)
        .single();

      if (error) throw error;
      setSchoolData(data);
    } catch (error) {
      console.error('Error fetching school data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'école",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchoolStats = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, subjectsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('school_id', userProfile?.schoolId),
        supabase.from('teachers').select('id', { count: 'exact' }).eq('school_id', userProfile?.schoolId),
        supabase.from('classes').select('id', { count: 'exact' }).eq('school_id', userProfile?.schoolId),
        supabase.from('subjects').select('id', { count: 'exact' }).eq('school_id', userProfile?.schoolId)
      ]);

      setSchoolStats({
        studentsCount: studentsRes.count || 0,
        teachersCount: teachersRes.count || 0,
        classesCount: classesRes.count || 0,
        subjectsCount: subjectsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching school stats:', error);
    }
  };

  const handleSaveSchoolInfo = async (updatedData: Partial<SchoolData>) => {
    if (!schoolData) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update(updatedData)
        .eq('id', schoolData.id);

      if (error) throw error;

      setSchoolData({ ...schoolData, ...updatedData });
      toast({
        title: "Succès",
        description: "Les informations de l'école ont été mises à jour",
      });
    } catch (error) {
      console.error('Error updating school:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les informations",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'trial': return 'Essai gratuit';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!schoolData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucune donnée d'école trouvée
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Élèves</p>
              <p className="text-2xl font-bold">{schoolStats.studentsCount}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Enseignants</p>
              <p className="text-2xl font-bold">{schoolStats.teachersCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <School className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Classes</p>
              <p className="text-2xl font-bold">{schoolStats.classesCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <BookOpen className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Matières</p>
              <p className="text-2xl font-bold">{schoolStats.subjectsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration de l'école */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Informations générales</TabsTrigger>
          <TabsTrigger value="academic">Configuration académique</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Informations de l'école
              </CardTitle>
              <CardDescription>
                Gérez les informations de base de votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SchoolInfoForm 
                schoolData={schoolData} 
                onSave={handleSaveSchoolInfo}
                isSaving={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Configuration académique
              </CardTitle>
              <CardDescription>
                Paramètres liés au fonctionnement académique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AcademicConfigForm 
                schoolData={schoolData} 
                onSave={handleSaveSchoolInfo}
                isSaving={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Statut de l'abonnement
              </CardTitle>
              <CardDescription>
                Informations sur votre abonnement et votre période d'essai
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={getStatusBadgeVariant(schoolData.subscription_status)}>
                  {getStatusLabel(schoolData.subscription_status)}
                </Badge>
                {schoolData.trial_end_date && (
                  <p className="text-sm text-muted-foreground">
                    Fin de l'essai : {new Date(schoolData.trial_end_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label className="text-sm font-medium">Responsable</Label>
                  <p className="text-sm text-muted-foreground">{schoolData.sponsor_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email du responsable</Label>
                  <p className="text-sm text-muted-foreground">{schoolData.sponsor_email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Composant pour le formulaire des informations de l'école
function SchoolInfoForm({ 
  schoolData, 
  onSave, 
  isSaving 
}: { 
  schoolData: SchoolData;
  onSave: (data: Partial<SchoolData>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    name: schoolData.name,
    address: schoolData.address,
    phone: schoolData.phone,
    email: schoolData.email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nom de l'école</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email de l'école</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
      </Button>
    </form>
  );
}

function AcademicConfigForm({ 
  schoolData, 
  onSave, 
  isSaving 
}: { 
  schoolData: SchoolData;
  onSave: (data: Partial<SchoolData>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    academic_year: schoolData.academic_year,
    currency: schoolData.currency as 'FCFA' | 'EUR' | 'USD' | 'MAD' | 'GNF',
    school_type: schoolData.school_type as 'public' | 'private' | 'semi_private' | 'international',
    language: schoolData.language as 'french' | 'arabic',
    semester_type: schoolData.semester_type as 'semester' | 'trimester',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="academic_year">Année académique</Label>
          <Input
            id="academic_year"
            value={formData.academic_year}
            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
            placeholder="2024/2025"
          />
        </div>

        <div>
          <Label htmlFor="currency">Devise</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value: 'FCFA' | 'EUR' | 'USD' | 'MAD' | 'GNF') => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FCFA">FCFA</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
              <SelectItem value="USD">Dollar US ($)</SelectItem>
              <SelectItem value="MAD">Dirham marocain (MAD)</SelectItem>
              <SelectItem value="GNF">Franc guinéen (GNF)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="language">Langue principale</Label>
          <Select 
            value={formData.language} 
            onValueChange={(value: 'french' | 'arabic') => setFormData({ ...formData, language: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="french">Français</SelectItem>
              <SelectItem value="arabic">Arabe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="semester_type">Type de semestre</Label>
          <Select 
            value={formData.semester_type} 
            onValueChange={(value: 'semester' | 'trimester') => setFormData({ ...formData, semester_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">Semestre</SelectItem>
              <SelectItem value="trimester">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="school_type">Type d'établissement</Label>
        <Select 
          value={formData.school_type} 
          onValueChange={(value: 'public' | 'private' | 'semi_private' | 'international') => setFormData({ ...formData, school_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">École publique</SelectItem>
            <SelectItem value="private">École privée</SelectItem>
            <SelectItem value="semi_private">École semi-privée</SelectItem>
            <SelectItem value="international">École internationale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
      </Button>
    </form>
  );
}