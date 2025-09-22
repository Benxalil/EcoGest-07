import { Layout } from "@/components/layout/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, User } from "lucide-react";

interface AbsenceRetardRecord {
  date: string;
  enseignant: string;
  matiere: string;
  heure: string;
  eleveNom: string;
  elevePrenom: string;
  type: "present" | "absent" | "retard";
  motif?: string;
  duree?: string;
}

interface Classe {
  id: string;
  session: string;
  libelle: string;
}

// Récupérer les données d'absence et retard depuis le localStorage
const getAbsenceRetardData = (classeId: string): AbsenceRetardRecord[] => {
  try {
    const flattenedRecords: AbsenceRetardRecord[] = [];
    const recordKeys = new Set<string>(); // Pour éviter les doublons
    
    // Fonction pour obtenir le nom complet d'un élève
    const getEleveNom = (eleveId: string): { nom: string, prenom: string } => {
      try {
        // Remplacé par hook Supabase
        if (savedEleves) {
          const eleves = JSON.parse(savedEleves);
          const eleve = eleves.find((e: any) => e.id === eleveId);
          if (eleve) {
            return { nom: eleve.nom || '', prenom: eleve.prenom || '' };
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des noms:', error);
      }
      return { nom: 'Inconnu', prenom: '' };
    };
    
    // Fonction pour ajouter un enregistrement en évitant les doublons
    const addRecord = (record: AbsenceRetardRecord) => {
      const key = `${record.date}-${record.eleveNom}-${record.elevePrenom}-${record.matiere}-${record.heure}`;
      if (!recordKeys.has(key)) {
        recordKeys.add(key);
        flattenedRecords.push(record);
      }
    };
    
    // 1. Récupérer depuis EnregistrerAbsenceRetard.tsx (clé: 'absences-retards')
    const globalData = localStorage.getItem('absences-retards');
    if (globalData) {
      const globalRecords = JSON.parse(globalData);
      globalRecords.forEach((record: any) => {
        if (record.classeId === classeId && record.eleves) {
          record.eleves.forEach((eleve: any) => {
            const { nom, prenom } = getEleveNom(eleve.eleveId);
            // Inclure TOUS les statuts : present, absent, retard
            addRecord({
              date: record.date,
              enseignant: record.enseignant,
              matiere: record.matiere,
              heure: `${record.heureDebut} - ${record.heureFin}`,
              eleveNom: nom,
              elevePrenom: prenom,
              type: eleve.statut || "present",
              motif: eleve.motifRetard || '',
              duree: eleve.dureeRetard || '',
            });
          });
        }
      });
    }
    
    // 2. Récupérer depuis AbsenceRetardClasse.tsx (clé: 'absences_retards_${classeId}')
    const classeData = localStorage.getItem(`absences_retards_${classeId}`);
    if (classeData) {
      const classeRecords = JSON.parse(classeData);
      classeRecords.forEach((record: any) => {
        if (record.eleves) {
          record.eleves.forEach((eleve: any) => {
            // Inclure TOUS les statuts : present, absent, retard
            addRecord({
              date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
              enseignant: record.enseignant,
              matiere: record.matiere,
              heure: `${record.heureDebut} - ${record.heureFin}`,
              eleveNom: eleve.nom || '',
              elevePrenom: eleve.prenom || '',
              type: eleve.presence || "present",
              motif: eleve.commentaire || '',
              duree: eleve.heureArrivee || '',
            });
          });
        }
      });
    }
    
    console.log('Données récupérées (avec présents):', flattenedRecords);
    return flattenedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    return [];
  }
};

// Récupérer les informations de la classe
const getClasseById = (classeId: string): Classe | null => {
  try {
    const classes = [] // Remplacé par hook Supabase;
    return classes.find((classe: Classe) => classe.id === classeId) || null;
  } catch (error) {
    console.error("Erreur lors de la récupération de la classe:", error);
    return null;
  }
};

export default function ConsulterAbsencesRetards() {
  const { classeId } = useParams<{ classeId: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AbsenceRetardRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AbsenceRetardRecord[]>([]);
  const [classe, setClasse] = useState<Classe | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [eleveFilter, setEleveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (classeId) {
      const classeData = getClasseById(classeId);
      setClasse(classeData);
      
      const absenceData = getAbsenceRetardData(classeId);
      setRecords(absenceData);
      setFilteredRecords(absenceData);
    }
  }, [classeId]);

  useEffect(() => {
    let filtered = records;

    if (dateFilter) {
      filtered = filtered.filter(record => 
        record.date.includes(dateFilter)
      );
    }

    if (eleveFilter && eleveFilter !== "all") {
      filtered = filtered.filter(record => 
        `${record.elevePrenom} ${record.eleveNom}`.toLowerCase().includes(eleveFilter.toLowerCase())
      );
    }

    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter(record => record.type === typeFilter);
    }

    setFilteredRecords(filtered);
  }, [records, dateFilter, eleveFilter, typeFilter]);

  const getUniqueEleves = () => {
    const eleves = records.map(record => `${record.elevePrenom} ${record.eleveNom}`);
    return [...new Set(eleves)].sort();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "present":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
      case "absent":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
      case "retard":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium";
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium";
    }
  };

  // Group records by date
  const groupRecordsByDate = () => {
    const grouped = filteredRecords.reduce((acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = [];
      }
      acc[record.date].push(record);
      return acc;
    }, {} as Record<string, AbsenceRetardRecord[]>);

    // Sort dates in descending order (most recent first)
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        records: grouped[date],
        stats: {
          total: grouped[date].length,
          present: grouped[date].filter(r => r.type === "present").length,
          absent: grouped[date].filter(r => r.type === "absent").length,
          retard: grouped[date].filter(r => r.type === "retard").length,
        }
      }));
  };

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date); } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Classe non trouvée</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/emplois-du-temps')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Absences & Retards - {classe.session} {classe.libelle}
            </h1>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="Filtrer par date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Élève</label>
                <Select value={eleveFilter} onValueChange={setEleveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les élèves" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les élèves</SelectItem>
                    {getUniqueEleves().map((eleve) => (
                      <SelectItem key={eleve} value={eleve}>
                        {eleve}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="present">Présent</SelectItem>
                    <SelectItem value="absent">Absence</SelectItem>
                    <SelectItem value="retard">Retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDateFilter("");
                    setEleveFilter("all");
                    setTypeFilter("all");
                  }}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{filteredRecords.length}</div>
              <div className="text-sm text-gray-600">Total des événements</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {filteredRecords.filter(r => r.type === "present").length}
              </div>
              <div className="text-sm text-gray-600">Présents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {filteredRecords.filter(r => r.type === "absent").length}
              </div>
              <div className="text-sm text-gray-600">Absences</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredRecords.filter(r => r.type === "retard").length}
              </div>
              <div className="text-sm text-gray-600">Retards</div>
            </CardContent>
          </Card>
        </div>

        {/* Affichage par date */}
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Aucun enregistrement trouvé</p>
              <p className="text-gray-400">
                {records.length === 0 
                  ? "Aucune donnée de présence n'a encore été enregistrée pour cette classe."
                  : "Aucun résultat ne correspond aux filtres appliqués."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupRecordsByDate().map(({ date, records: dateRecords, stats }) => (
              <Card key={date} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleDateExpansion(date)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">
                        {formatDate(date)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                          Total: {stats.total}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                          Présents: {stats.present}
                        </span>
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                          Absents: {stats.absent}
                        </span>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                          Retards: {stats.retard}
                        </span>
                      </div>
                      <div className={`transform transition-transform ${expandedDates.has(date) ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedDates.has(date) && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Élève</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Heure</TableHead>
                            <TableHead>Matière</TableHead>
                            <TableHead>Enseignant</TableHead>
                            <TableHead>Motif</TableHead>
                            <TableHead>Durée</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dateRecords.map((record, index) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  {record.elevePrenom} {record.eleveNom}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={getTypeStyle(record.type)}>
                                  {record.type === "present" ? "Présent" : 
                                   record.type === "absent" ? "Absence" : "Retard"}
                                </span>
                              </TableCell>
                              <TableCell>{record.heure}</TableCell>
                              <TableCell>{record.matiere}</TableCell>
                              <TableCell>{record.enseignant}</TableCell>
                              <TableCell>{record.motif || "-"}</TableCell>
                              <TableCell>
                                {record.type === "retard" && record.duree ? record.duree : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}