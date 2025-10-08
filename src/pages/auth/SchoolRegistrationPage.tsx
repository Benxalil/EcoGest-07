import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EyeIcon, EyeOffIcon, Building2, User, MapPin, Shield, Moon, Sun } from "lucide-react";
import { EcoGestFullLogo } from "@/assets/EcoGestLogo";
import { useTheme } from "@/components/theme-provider";
type SchoolType = "public" | "private" | "semi_private" | "international";
type Currency = "FCFA" | "EUR" | "USD" | "MAD" | "GNF";
type AcademicYear = "2024/2025" | "2025/2026" | "2026/2027" | "2027/2028" | "2028/2029" | "2029/2030";
const SchoolRegistrationPage = () => {
  const { theme, setTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitCooldown, setSubmitCooldown] = useState(0);

  // Cooldown effect
  useEffect(() => {
    if (submitCooldown > 0) {
      const timer = setTimeout(() => {
        setSubmitCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [submitCooldown]);

  // Form data state
  const [formData, setFormData] = useState({
    // School info
    schoolName: "",
    schoolType: "" as SchoolType,
    academicYear: "2024/2025" as AcademicYear,
    academicYearStartDate: "",
    academicYearEndDate: "",
    address: "",
    schoolEmail: "",
    schoolPhone: "",
    logoFile: null as File | null,
    language: "french" as "french" | "arabic",
    semesterType: "semester" as "semester" | "trimester",
    // Admin info
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    password: "",
    confirmPassword: "",
    // Settings
    sponsorName: "",
    sponsorPhone: "",
    sponsorEmail: "",
    currency: "FCFA" as Currency,
    timezone: "Africa/Dakar"
  });
  const steps = [{
    number: 1,
    title: "École",
    icon: Building2
  }, {
    number: 2,
    title: "Administrateur",
    icon: User
  }, {
    number: 3,
    title: "Paramètres",
    icon: MapPin
  }, {
    number: 4,
    title: "Confirmation",
    icon: Shield
  }];
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        logoFile: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.schoolName && formData.schoolType && formData.address && formData.academicYearStartDate && formData.academicYearEndDate;
      case 2:
        return formData.adminFirstName && formData.adminLastName && formData.adminEmail && formData.password && formData.password === formData.confirmPassword && formData.password.length >= 6;
      case 3:
        return formData.currency && formData.timezone;
      default:
        return true;
    }
  };
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    setSubmitCooldown(30);

    try {
      console.log('🚀 Création du compte utilisateur...');
      
      // 1. Create user account with email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/complete-registration`,
          data: {
            first_name: formData.adminFirstName,
            last_name: formData.adminLastName,
            role: 'school_admin'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte utilisateur');
      }

      console.log('✅ Compte créé:', authData.user.email);

      // 2. Save registration data to localStorage for completion after email confirmation
      const registrationData = {
        userId: authData.user.id,
        schoolName: formData.schoolName,
        schoolType: formData.schoolType,
        academicYear: formData.academicYear,
        academicYearStartDate: formData.academicYearStartDate,
        academicYearEndDate: formData.academicYearEndDate,
        address: formData.address,
        schoolPhone: formData.schoolPhone,
        adminPhone: formData.adminPhone,
        language: formData.language,
        semesterType: formData.semesterType,
        currency: formData.currency,
        timezone: formData.timezone,
        sponsorName: formData.sponsorName,
        sponsorPhone: formData.sponsorPhone,
        sponsorEmail: formData.sponsorEmail,
        timestamp: Date.now()
      };
      
      localStorage.setItem('pending_school_registration', JSON.stringify(registrationData));
      console.log('💾 Données sauvegardées dans localStorage');
      
      // If logo file exists, convert to base64 for storage
      if (formData.logoFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          localStorage.setItem('pending_school_logo', reader.result as string);
          console.log('📸 Logo sauvegardé');
        };
        reader.readAsDataURL(formData.logoFile);
      }

      // Success message
      alert(`Compte créé avec succès ! 

Un email de confirmation a été envoyé à ${formData.adminEmail}. 

Veuillez cliquer sur le lien dans l'email pour activer votre compte, puis vous connecter pour finaliser la création de votre école.`);

      // Redirect to login
      window.location.href = '/auth';

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
        alert('Cette adresse email est déjà utilisée. Veuillez utiliser une autre adresse ou vous connecter.');
      } else if (error.message.includes('Password should be at least 6 characters')) {
        alert('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        alert('Erreur lors de la création du compte: ' + (error.message || 'Erreur inconnue. Veuillez réessayer.'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations sur l'école
              </h3>
              <p className="text-sm text-muted-foreground">Informations de base sur votre école</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolName">Nom de l'école *</Label>
              <Input id="schoolName" placeholder="Entrez le nom de votre école" value={formData.schoolName} onChange={e => handleInputChange("schoolName", e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolType">Type d'école *</Label>
              <Select value={formData.schoolType} onValueChange={(value: SchoolType) => handleInputChange("schoolType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type d'école" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">École publique</SelectItem>
                  <SelectItem value="private">École privée</SelectItem>
                  <SelectItem value="semi_private">École semi-privée</SelectItem>
                  <SelectItem value="international">École internationale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="academicYear">Année académique *</Label>
              <Select value={formData.academicYear} onValueChange={(value: AcademicYear) => handleInputChange("academicYear", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez l'année académique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                  <SelectItem value="2026/2027">2026/2027</SelectItem>
                  <SelectItem value="2027/2028">2027/2028</SelectItem>
                  <SelectItem value="2028/2029">2028/2029</SelectItem>
                  <SelectItem value="2029/2030">2029/2030</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academicYearStartDate">Date de début *</Label>
                <Input 
                  id="academicYearStartDate" 
                  type="date" 
                  value={formData.academicYearStartDate} 
                  onChange={e => handleInputChange("academicYearStartDate", e.target.value)} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="academicYearEndDate">Date de fin *</Label>
                <Input 
                  id="academicYearEndDate" 
                  type="date" 
                  value={formData.academicYearEndDate} 
                  onChange={e => handleInputChange("academicYearEndDate", e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adresse de l'école *</Label>
              <Textarea id="address" placeholder="Entrez l'adresse complète de l'école" value={formData.address} onChange={e => handleInputChange("address", e.target.value)} required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              
              <div className="space-y-2">
                <Label htmlFor="schoolPhone">Téléphone de l'école</Label>
                <Input id="schoolPhone" type="tel" placeholder="+221 XX XXX XX XX" value={formData.schoolPhone} onChange={e => handleInputChange("schoolPhone", e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logo">Logo de l'école</Label>
              <Input id="logo" type="file" accept="image/*" onChange={handleFileChange} />
              {logoPreview && (
                <div className="mt-2">
                  <img src={logoPreview} alt="Aperçu du logo" className="w-20 h-20 object-cover rounded-lg border" />
                </div>
              )}
            </div>
          </div>;
      case 2:
        return <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <User className="h-5 w-5" />
                Informations sur l'administrateur
              </h3>
              <p className="text-sm text-muted-foreground">Compte directeur principal</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">Prénom *</Label>
                <Input id="adminFirstName" placeholder="Prénom" value={formData.adminFirstName} onChange={e => handleInputChange("adminFirstName", e.target.value)} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Nom *</Label>
                <Input id="adminLastName" placeholder="Nom" value={formData.adminLastName} onChange={e => handleInputChange("adminLastName", e.target.value)} required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email *</Label>
              <Input id="adminEmail" type="email" placeholder="admin@ecole.com" value={formData.adminEmail} onChange={e => handleInputChange("adminEmail", e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminPhone">Téléphone</Label>
              <Input id="adminPhone" type="tel" placeholder="+221 XX XXX XX XX" value={formData.adminPhone} onChange={e => handleInputChange("adminPhone", e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={e => handleInputChange("password", e.target.value)} required />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOffIcon className="h-4 w-4 text-muted-foreground" /> : <EyeIcon className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => handleInputChange("confirmPassword", e.target.value)} required />
              {formData.password !== formData.confirmPassword && formData.confirmPassword && <p className="text-sm text-destructive">Les mots de passe ne correspondent pas</p>}
            </div>
          </div>;
      case 3:
        return <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5" />
                Paramètres de base
              </h3>
              <p className="text-sm text-muted-foreground">Configuration initiale</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sponsorName">Parrainé par</Label>
                <Input id="sponsorName" placeholder="Nom du parrain (optionnel)" value={formData.sponsorName} onChange={e => handleInputChange("sponsorName", e.target.value)} />
              </div>
              
              {formData.sponsorName && <>
                  <div className="space-y-2">
                    <Label htmlFor="sponsorPhone">Téléphone du parrain</Label>
                    <Input id="sponsorPhone" type="tel" placeholder="+221 XX XXX XX XX" value={formData.sponsorPhone} onChange={e => handleInputChange("sponsorPhone", e.target.value)} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sponsorEmail">Email du parrain</Label>
                    <Input id="sponsorEmail" type="email" placeholder="parrain@email.com" value={formData.sponsorEmail} onChange={e => handleInputChange("sponsorEmail", e.target.value)} />
                  </div>
                </>}
              
              <div className="space-y-2">
                <Label htmlFor="currency">Devise *</Label>
                <Select value={formData.currency} onValueChange={(value: Currency) => handleInputChange("currency", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez la devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FCFA">FCFA (Franc CFA)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="USD">USD (Dollar US)</SelectItem>
                    <SelectItem value="MAD">MAD (Dirham Marocain)</SelectItem>
                    <SelectItem value="GNF">GNF (Franc Guinéen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language">Langue principale *</Label>
                <Select value={formData.language} onValueChange={(value: "french" | "arabic") => handleInputChange("language", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez la langue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="french">Français</SelectItem>
                    <SelectItem value="arabic">Arabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="semesterType">Type de semestre *</Label>
                <Select value={formData.semesterType} onValueChange={(value: "semester" | "trimester") => handleInputChange("semesterType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semester">Semestre</SelectItem>
                    <SelectItem value="trimester">Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire *</Label>
                <Select value={formData.timezone} onValueChange={value => handleInputChange("timezone", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le fuseau horaire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Dakar">Africa/Dakar (GMT+0)</SelectItem>
                    <SelectItem value="Africa/Casablanca">Africa/Casablanca (GMT+1)</SelectItem>
                    <SelectItem value="Africa/Abidjan">Africa/Abidjan (GMT+0)</SelectItem>
                    <SelectItem value="Africa/Conakry">Africa/Conakry (GMT+0)</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>;
      case 4:
        return <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Shield className="h-5 w-5" />
                Confirmation
              </h3>
              <p className="text-sm text-muted-foreground">Vérifiez vos informations avant création</p>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">École:</h4>
                <p><strong>Nom:</strong> {formData.schoolName}</p>
                <p><strong>Type:</strong> {formData.schoolType}</p>
                <p><strong>Année académique:</strong> {formData.academicYear}</p>
                <p><strong>Date de début:</strong> {formData.academicYearStartDate}</p>
                <p><strong>Date de fin:</strong> {formData.academicYearEndDate}</p>
                <p><strong>Adresse:</strong> {formData.address}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Administrateur:</h4>
                <p><strong>Nom:</strong> {formData.adminFirstName} {formData.adminLastName}</p>
                <p><strong>Email:</strong> {formData.adminEmail}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Paramètres:</h4>
                <p><strong>Devise:</strong> {formData.currency}</p>
                <p><strong>Fuseau horaire:</strong> {formData.timezone}</p>
                {formData.sponsorName && <p><strong>Parrain:</strong> {formData.sponsorName}</p>}
              </div>
            </div>
          </div>;
      default:
        return null;
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
      {/* Toggle mode sombre */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-4 right-4 rounded-full"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-slate-700" />
        )}
      </Button>

      <Card className="w-full max-w-2xl shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="pt-4 pb-2 flex justify-center">
            <EcoGestFullLogo height={30} />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Steps indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {steps.map(step => <div key={step.number} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${currentStep >= step.number ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'}
                  `}>
                    {currentStep > step.number ? <Shield className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  {step.number < steps.length && <div className={`w-8 h-0.5 mx-2 ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}`} />}
                </div>)}
            </div>
          </div>
          
          {/* Step content */}
          {renderStepContent()}
          
          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
              Précédent
            </Button>
            
            {currentStep < 4 ? <Button onClick={nextStep}>
                Suivant
              </Button> : <Button onClick={handleSubmit} disabled={isLoading || submitCooldown > 0}>
                {isLoading ? "Création..." : 
                 submitCooldown > 0 ? `Attendre ${submitCooldown}s` :
                 "Créer l'école"}
              </Button>}
          </div>
          
          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Vous avez déjà un compte ?{" "}
              <Link to="/auth" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default SchoolRegistrationPage;