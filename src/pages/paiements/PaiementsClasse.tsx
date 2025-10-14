import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Search, Eye } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { formatClassName } from "@/utils/classNameFormatter";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useSchoolData } from "@/hooks/useSchoolData";
import { usePayments } from "@/hooks/usePayments";

// Schéma de validation pour le formulaire de paiement
const paiementSchema = z.object({
  montant: z.string().min(1, "Le montant est requis"),
  modePaiement: z.string().min(1, "Le mode de paiement est requis"),
  typePaiement: z.string().min(1, "Le type de paiement est requis"),
  moisMensualite: z.string().optional(),
  payePar: z.string().min(1, "La personne payante est requise"),
  numeroTelephone: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres"),
});

type PaiementFormData = z.infer<typeof paiementSchema>;
export default function PaiementsClasse() {
  const navigate = useNavigate();
  const { classeId } = useParams();
  const [searchParams] = useSearchParams();
  const mois = searchParams.get("mois") || "Janvier";
  const { toast } = useToast();
  
  // Utiliser les hooks Supabase
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading } = useStudents();
  const { academicYear } = useAcademicYear();
  const { schoolData: schoolSettings } = useSchoolData();
  const { payments, createPayment, hasStudentPaid, getStudentPayment, loading: paymentsLoading } = usePayments();
  
  const [eleves, setEleves] = useState<any[]>([]);
  const [classe, setClasse] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [eleveSelectionne, setEleveSelectionne] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewEleve, setPreviewEleve] = useState<any>(null);

  // Trouver la classe par son ID
  const classeData = classes.find(c => c.id === classeId);
  
  // Filtrer les élèves de cette classe (avec useMemo pour éviter les recalculs)
  const elevesClasse = students.filter(student => student.class_id === classeId);

  useEffect(() => {
    if (classeId && classeData && !paymentsLoading && !studentsLoading) {
      setClasse(classeData);
      
      // Utiliser les vrais paiements de la base de données - vérifier TOUS les types de paiements pour le mois
      const elevesWithPaymentStatus = elevesClasse.map((eleve: any) => {
        // Chercher tous les paiements de cet élève pour ce mois (tous types confondus)
        const studentPayments = payments.filter(p => 
          p.student_id === eleve.id && 
          p.payment_month === mois
        );
        
        // Si au moins un paiement existe pour ce mois, considérer comme payé
        const hasPaid = studentPayments.length > 0;
        
        // Prendre le paiement le plus récent ou le premier disponible
        const latestPayment = studentPayments.length > 0 
          ? studentPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;
        
        return {
          ...eleve,
          statut: hasPaid ? "payé" : "non-payé",
          modePaiement: latestPayment?.payment_method || null,
          montant: latestPayment?.amount || 0,
          datePaiement: latestPayment?.payment_date || null,
          typePaiement: latestPayment?.payment_type || null,
          moisMensualite: latestPayment?.payment_month || null,
          payePar: latestPayment?.paid_by || null,
          numeroTelephone: latestPayment?.phone_number || null,
          allPayments: studentPayments // Garder tous les paiements pour référence
        };
      });
      
      setEleves(elevesWithPaymentStatus);
    }
  }, [classeId, mois, payments.length, studentsLoading, paymentsLoading]);
  
  const form = useForm<PaiementFormData>({
    resolver: zodResolver(paiementSchema),
    defaultValues: {
      montant: "",
      modePaiement: "",
      typePaiement: "",
      moisMensualite: mois,
      payePar: "",
      numeroTelephone: "",
    },
  });
  
  const typePaiementValue = form.watch("typePaiement");
  
  const nomClasse = classe ? formatClassName(classe) : "Classe inconnue";
  
  // État de chargement
  if (classesLoading || studentsLoading || paymentsLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Filtrer les élèves selon le terme de recherche
  const elevesFiltres = eleves.filter(eleve => {
    const searchLower = searchTerm.toLowerCase();
    return (
      eleve.first_name?.toLowerCase().includes(searchLower) ||
      eleve.last_name?.toLowerCase().includes(searchLower) ||
      eleve.student_number?.toLowerCase().includes(searchLower)
    );
  });

  const elevesPayes = eleves.filter(e => e.statut === "payé").length;
  const elevesNonPayes = eleves.length - elevesPayes;
  const montantTotal = eleves.reduce((total, eleve) => total + eleve.montant, 0);

  const marquerPaye = (eleveId: string) => {
    setEleveSelectionne(eleveId);
    setModalOpen(true);
  };

  const confirmerPaiement = async (data: PaiementFormData) => {
    if (eleveSelectionne) {
      // Vérifier d'abord si l'élève a déjà payé pour ce type de paiement et ce mois
      const monthToCheck = data.typePaiement === 'mensualite' ? (data.moisMensualite || mois) : mois;
      const existingPayment = getStudentPayment(eleveSelectionne, data.typePaiement, monthToCheck);
      
      if (existingPayment) {
        const paymentTypeLabel = data.typePaiement === 'mensualite' ? 'mensualité' : 
                                data.typePaiement === 'inscription' ? 'inscription' : data.typePaiement;
        toast({
          title: "Paiement déjà enregistré",
          description: `Cet élève a déjà effectué un paiement de ${paymentTypeLabel} pour ${monthToCheck}.`,
          variant: "destructive",
        });
        setModalOpen(false);
        setEleveSelectionne(null);
        return;
      }

      try {
        // Créer le paiement dans la base de données
        const success = await createPayment({
          student_id: eleveSelectionne,
          amount: parseInt(data.montant),
          payment_method: data.modePaiement,
          payment_type: data.typePaiement,
          payment_month: data.moisMensualite || mois,
          paid_by: data.payePar,
          phone_number: data.numeroTelephone,
          payment_date: new Date().toISOString().split('T')[0]
        });

        if (success) {
          // Les données seront mises à jour automatiquement par le useEffect
          // car payments a été mis à jour dans usePayments
          toast({
            title: "Paiement enregistré",
            description: "Le paiement a été enregistré avec succès.",
          });
          
          setModalOpen(false);
          setEleveSelectionne(null);
          form.reset();
        }
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du paiement:', error);
        
        // Gestion spécifique de l'erreur de doublon
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          const paymentTypeLabel = data.typePaiement === 'mensualite' ? 'mensualité' : 
                                  data.typePaiement === 'inscription' ? 'inscription' : data.typePaiement;
          toast({
            title: "Paiement déjà enregistré",
            description: `Un paiement de ${paymentTypeLabel} existe déjà pour cet élève pour le mois de ${data.moisMensualite || mois}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: "Une erreur est survenue lors de l'enregistrement du paiement.",
            variant: "destructive",
          });
        }
        
        setModalOpen(false);
        setEleveSelectionne(null);
      }
    }
  };

  const genererRecuPDF = (eleve: any) => {
    const doc = new jsPDF();
    
    // En-tête du reçu
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Reçu de paiement", 105, 25, { align: "center" });
    
    // Informations de l'école (en-tête)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`École : ${schoolSettings?.name || 'École'}`, 20, 45);
    doc.text(`Adresse : ${schoolSettings?.address || 'Adresse non définie'}`, 20, 55);
    doc.text(`Téléphone : ${schoolSettings?.phone || 'Non défini'}`, 20, 65);
    
    // Date du paiement (alignée à droite)
    const dateFormatted = eleve.datePaiement ? 
      new Date(eleve.datePaiement).toLocaleDateString('fr-FR') : 
      new Date().toLocaleDateString('fr-FR');
    doc.text(`DATE : ${dateFormatted}`, 150, 45);
    
    // Section ÉLÈVE
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ÉLÈVE :", 20, 85);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Prénom & Nom : ${eleve.first_name || 'N/A'} ${eleve.last_name || 'N/A'}`, 20, 95);
    doc.text(`Date de Naissance : ${eleve.date_of_birth ? new Date(eleve.date_of_birth).toLocaleDateString('fr-FR') : "Non définie"}`, 20, 105);
    doc.text(`Classe : ${nomClasse}`, 20, 115);
    
    // Cadre pour les détails de paiement
    doc.rect(20, 130, 170, 50);
    
    // En-tête du tableau DÉTAILS DE PAIEMENT
    doc.setFont("helvetica", "bold");
    doc.text("DÉTAILS DE PAIEMENT :", 105, 140, { align: "center" });
    
    // Lignes de séparation dans le tableau
    doc.line(20, 145, 190, 145);
    doc.line(70, 150, 70, 180);
    doc.line(110, 150, 110, 180);
    doc.line(155, 150, 155, 180);
    
    // En-têtes du tableau
    doc.setFontSize(10);
    doc.text("Description", 45, 155, { align: "center" });
    doc.text("Mois", 90, 155, { align: "center" });
    doc.text("Montant", 132, 155, { align: "center" });
    doc.text("Mode de paiement", 172, 155, { align: "center" });
    
    // Ligne de séparation après les en-têtes
    doc.line(20, 160, 190, 160);
    
    // Données du paiement
    doc.setFont("helvetica", "normal");
    const description = eleve.typePaiement === 'mensualite' ? 'Mensualité' : 
                       eleve.typePaiement === 'inscription' ? 'Frais d\'inscription' : 'Autre';
    const moisText = eleve.typePaiement === 'mensualite' && eleve.moisMensualite ? eleve.moisMensualite : '-';
    
    doc.text(description, 45, 170, { align: "center" });
    doc.text(moisText, 90, 170, { align: "center" });
    doc.text(`${(eleve.montant || 0).toLocaleString()} FCFA`, 132, 170, { align: "center" });
    doc.text(eleve.modePaiement, 172, 170, { align: "center" });
    
    // Informations du payeur
    doc.setFont("helvetica", "bold");
    doc.text(`Payé par : ${eleve.payePar || 'Non défini'}`, 20, 200);
    doc.text(`Numéro : ${eleve.numeroTelephone || 'Non défini'}`, 20, 210);
    
    // Ligne de séparation finale
    doc.line(20, 230, 190, 230);
    
    // Signature
    doc.setFont("helvetica", "normal");
    doc.text("Signature et cachet de l'établissement", 105, 250, { align: "center" });
    
    // Télécharger le PDF
    const fileName = `recu_paiement_${eleve.first_name || 'Eleve'}_${eleve.last_name || 'Inconnu'}_${dateFormatted.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Reçu généré",
      description: "Le reçu de paiement a été téléchargé avec succès.",
    });
  };

  const getStatutBadge = (statut: string) => {
    return statut === "payé" ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Payé</Badge> :
      <Badge variant="secondary" className="bg-red-100 text-red-800">Non payé</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/paiements")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Paiements - {nomClasse}
            </h1>
            <p className="text-muted-foreground mt-1">{mois} {academicYear.split('/')[1]}</p>
          </div>
        </div>

        {/* Champ de recherche */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher un élève par prénom, nom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistiques de la classe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eleves.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Élèves Payés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500 dark:text-green-400">{elevesPayes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non Payés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">{elevesNonPayes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des élèves */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Élèves - {nomClasse}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Mode de Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date de Paiement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elevesFiltres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "Aucun élève trouvé pour cette recherche" : "Aucun élève dans cette classe"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    elevesFiltres.map((eleve) => (
                      <TableRow key={eleve.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{eleve.first_name} {eleve.last_name}</div>
                          <div className="text-sm text-muted-foreground">Matricule: {eleve.student_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatutBadge(eleve.statut)}</TableCell>
                      <TableCell>
                        {eleve.modePaiement ? (
                          <Badge variant="outline">{eleve.modePaiement}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {eleve.montant > 0 ? 
                          `${eleve.montant.toLocaleString()} FCFA` : 
                          <span className="text-muted">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        {eleve.datePaiement || <span className="text-muted">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {eleve.statut === "payé" ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8"
                                onClick={() => {
                                  setPreviewEleve(eleve);
                                  setPreviewModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Voir
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8"
                                onClick={() => genererRecuPDF(eleve)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Reçu
                              </Button>
                            </>
                           ) : (
                             <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                               <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="default" 
                                    className="h-8"
                                    onClick={() => marquerPaye(eleve.id)}
                                  >
                                   Marquer Payé
                                 </Button>
                               </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Enregistrer le Paiement</DialogTitle>
                                </DialogHeader>
                                <Form {...form}>
                                  <form onSubmit={form.handleSubmit(confirmerPaiement)} className="space-y-4">
                                    <FormField
                                      control={form.control}
                                      name="montant"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Montant (FCFA)</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="Ex: 25000" 
                                              type="number"
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="modePaiement"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Mode de Paiement</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner le mode" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="Cash">Cash</SelectItem>
                                              <SelectItem value="Wave">Wave</SelectItem>
                                              <SelectItem value="Orange Money">Orange Money</SelectItem>
                                              <SelectItem value="Free Money">Free Money</SelectItem>
                                              <SelectItem value="Virement">Virement bancaire</SelectItem>
                                              <SelectItem value="Chèque">Chèque</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                     <FormField
                                       control={form.control}
                                       name="typePaiement"
                                       render={({ field }) => (
                                         <FormItem>
                                           <FormLabel>Type de Paiement</FormLabel>
                                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                                             <FormControl>
                                               <SelectTrigger>
                                                 <SelectValue placeholder="Sélectionner le type" />
                                               </SelectTrigger>
                                             </FormControl>
                                             <SelectContent>
                                               <SelectItem value="inscription">Frais d'inscription</SelectItem>
                                               <SelectItem value="mensualite">Mensualité</SelectItem>
                                               <SelectItem value="autre">Autre</SelectItem>
                                             </SelectContent>
                                           </Select>
                                           <FormMessage />
                                         </FormItem>
                                       )}
                                     />
                                     
                                     {typePaiementValue === "mensualite" && (
                                       <FormField
                                         control={form.control}
                                         name="moisMensualite"
                                         render={({ field }) => (
                                           <FormItem>
                                             <FormLabel>Mois de la Mensualité</FormLabel>
                                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                               <FormControl>
                                                 <SelectTrigger>
                                                   <SelectValue placeholder="Sélectionner le mois" />
                                                 </SelectTrigger>
                                               </FormControl>
                                               <SelectContent>
                                                 <SelectItem value="Janvier">Janvier</SelectItem>
                                                 <SelectItem value="Février">Février</SelectItem>
                                                 <SelectItem value="Mars">Mars</SelectItem>
                                                 <SelectItem value="Avril">Avril</SelectItem>
                                                 <SelectItem value="Mai">Mai</SelectItem>
                                                 <SelectItem value="Juin">Juin</SelectItem>
                                                 <SelectItem value="Juillet">Juillet</SelectItem>
                                                 <SelectItem value="Août">Août</SelectItem>
                                                 <SelectItem value="Septembre">Septembre</SelectItem>
                                                 <SelectItem value="Octobre">Octobre</SelectItem>
                                                 <SelectItem value="Novembre">Novembre</SelectItem>
                                                 <SelectItem value="Décembre">Décembre</SelectItem>
                                               </SelectContent>
                                             </Select>
                                             <FormMessage />
                                           </FormItem>
                                         )}
                                       />
                                     )}
                                     
                                     <FormField
                                       control={form.control}
                                       name="payePar"
                                       render={({ field }) => (
                                         <FormItem>
                                           <FormLabel>Payé par</FormLabel>
                                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                                             <FormControl>
                                               <SelectTrigger>
                                                 <SelectValue placeholder="Sélectionner la personne" />
                                               </SelectTrigger>
                                             </FormControl>
                                             <SelectContent>
                                               <SelectItem value="pere">Père</SelectItem>
                                               <SelectItem value="mere">Mère</SelectItem>
                                               <SelectItem value="tuteur">Tuteur</SelectItem>
                                               <SelectItem value="tutrice">Tutrice</SelectItem>
                                               <SelectItem value="grand-parent">Grand-parent</SelectItem>
                                               <SelectItem value="autre">Autre</SelectItem>
                                             </SelectContent>
                                           </Select>
                                           <FormMessage />
                                         </FormItem>
                                       )}
                                     />
                                     
                                     <FormField
                                       control={form.control}
                                       name="numeroTelephone"
                                       render={({ field }) => (
                                         <FormItem>
                                           <FormLabel>Numéro de téléphone</FormLabel>
                                           <FormControl>
                                             <Input 
                                               placeholder="Ex: 77 123 45 67" 
                                               type="tel"
                                               {...field} 
                                             />
                                           </FormControl>
                                           <FormMessage />
                                         </FormItem>
                                       )}
                                     />
                                     
                                     <div className="flex justify-end space-x-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setModalOpen(false)}
                                      >
                                        Annuler
                                      </Button>
                                      <Button type="submit">
                                        Confirmer le Paiement
                                      </Button>
                                    </div>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modale de prévisualisation du reçu */}
        <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prévisualisation du Reçu de Paiement</DialogTitle>
            </DialogHeader>
            {previewEleve && (
              <div className="space-y-4 p-4 border rounded-lg">
                {/* En-tête */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold text-primary">Reçu de Paiement</h2>
                </div>
                
                {/* Informations école */}
                <div className="space-y-2 border-b pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">École</p>
                      <p className="font-semibold">{schoolSettings?.name || 'École'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">
                        {previewEleve.datePaiement ? 
                          new Date(previewEleve.datePaiement).toLocaleDateString('fr-FR') : 
                          new Date().toLocaleDateString('fr-FR')
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="text-sm">{schoolSettings?.address || 'Adresse non définie'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="text-sm">{schoolSettings?.phone || 'Non défini'}</p>
                  </div>
                </div>

                {/* Informations élève */}
                <div className="space-y-2 border-b pb-4">
                  <h3 className="font-bold text-primary">ÉLÈVE</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Prénom & Nom</p>
                      <p className="font-semibold">{previewEleve.first_name} {previewEleve.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date de Naissance</p>
                      <p className="text-sm">
                        {previewEleve.date_of_birth ? 
                          new Date(previewEleve.date_of_birth).toLocaleDateString('fr-FR') : 
                          "Non définie"
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Classe</p>
                    <p className="font-semibold">{nomClasse}</p>
                  </div>
                </div>

                {/* Détails du paiement */}
                <div className="space-y-2 border-b pb-4">
                  <h3 className="font-bold text-primary text-center mb-4">DÉTAILS DE PAIEMENT</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Mois</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Mode de paiement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          {previewEleve.typePaiement === 'mensualite' ? 'Mensualité' : 
                           previewEleve.typePaiement === 'inscription' ? 'Frais d\'inscription' : 'Autre'}
                        </TableCell>
                        <TableCell>
                          {previewEleve.typePaiement === 'mensualite' && previewEleve.moisMensualite ? 
                            previewEleve.moisMensualite : '-'}
                        </TableCell>
                        <TableCell className="font-bold">
                          {(previewEleve.montant || 0).toLocaleString()} FCFA
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{previewEleve.modePaiement}</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Informations du payeur */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Payé par</p>
                      <p className="font-semibold">{previewEleve.payePar || 'Non défini'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
                      <p className="font-semibold">{previewEleve.numeroTelephone || 'Non défini'}</p>
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className="text-center pt-6 border-t">
                  <p className="text-sm text-muted-foreground italic">
                    Signature et cachet de l'établissement
                  </p>
                </div>

                {/* Bouton de téléchargement */}
                <div className="flex justify-end pt-4">
                  <Button onClick={() => {
                    genererRecuPDF(previewEleve);
                    setPreviewModalOpen(false);
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Télécharger le PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
