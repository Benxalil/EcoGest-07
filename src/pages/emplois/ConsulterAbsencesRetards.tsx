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
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";

interface AttendanceRecord {
  id: string;
  date: string;
  student_id: string;
  type: "absence" | "retard" | "present";
  reason?: string;
  period?: string;
  students: {
    first_name: string;
    last_name: string;
  };
}

export default function ConsulterAbsencesRetards() {
  const { classeId } = useParams<{ classeId: string }>();
  const navigate = useNavigate();
  const { classes } = useClasses();
  const { students } = useStudents();
  
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [eleveFilter, setEleveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const classe = classes.find(c => c.id === classeId);
  const classStudents = students.filter(s => s.class_id === classeId);

  useEffect(() => {
    const fetchAttendances = async () => {
      if (!classeId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('attendances')
          .select(`
            id,
            date,
            student_id,
            type,
            reason,
            period,
            students (
              first_name,
              last_name
            )
          `)
          .eq('class_id', classeId)
          .order('date', { ascending: false });

        if (error) {
          console.error('Erreur lors du chargement des présences:', error);
        } else {
          setAttendances(data || []);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendances();
  }, [classeId]);

  const filteredAttendances = attendances.filter(record => {
    if (dateFilter && !record.date.includes(dateFilter)) return false;
    if (eleveFilter !== "all" && !`${record.students?.first_name} ${record.students?.last_name}`.toLowerCase().includes(eleveFilter.toLowerCase())) return false;
    if (typeFilter !== "all" && record.type !== typeFilter) return false;
    return true;
  });

  const getUniqueEleves = () => {
    const eleves = attendances.map(record => `${record.students?.first_name} ${record.students?.last_name}`);
    return [...new Set(eleves)].sort();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "present":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
      case "absence":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
      case "retard":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium";
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "present": return "Présent";
      case "absence": return "Absence";
      case "retard": return "Retard";
      default: return type;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
              Absences & Retards - {classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}
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
                  value={dateFilter}onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="jj/mm/aaaa"
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
                    <SelectItem value="absence">Absence</SelectItem>
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
              <div className="text-2xl font-bold text-blue-600">{filteredAttendances.length}</div>
              <div className="text-sm text-gray-600">Total des événements</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {filteredAttendances.filter(r => r.type === "present").length}
              </div>
              <div className="text-sm text-gray-600">Présents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {filteredAttendances.filter(r => r.type === "absence").length}
              </div>
              <div className="text-sm text-gray-600">Absences</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredAttendances.filter(r => r.type === "retard").length}
              </div>
              <div className="text-sm text-gray-600">Retards</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des absences et retards */}
        {filteredAttendances.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Aucun enregistrement trouvé</p>
              <p className="text-gray-400">
                {attendances.length === 0 
                  ? "Aucune donnée de présence n'a encore été enregistrée pour cette classe."
                  : "Aucun résultat ne correspond aux filtres appliqués."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Motif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendances.map((record) => (
                      <TableRow key={record.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {record.students?.first_name} {record.students?.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={getTypeStyle(record.type)}>
                            {getTypeLabel(record.type)}
                          </span>
                        </TableCell>
                        <TableCell>{record.period || "-"}</TableCell>
                        <TableCell>{record.reason || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}