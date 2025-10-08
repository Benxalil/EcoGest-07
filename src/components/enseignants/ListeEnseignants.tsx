
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AjoutEnseignantForm } from "@/components/enseignants/AjoutEnseignantForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Pencil, UserMinus, Users, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeachers } from "@/hooks/useTeachers";
import { debounce } from "@/utils/debounce";

interface Enseignant {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  phone?: string;
  specialization?: string;
  is_active: boolean;
}

interface ListeEnseignantsProps {
  onEdit?: (enseignant: Enseignant) => void;
}

export function ListeEnseignants({ onEdit }: ListeEnseignantsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { teachers, loading, deleteTeacher } = useTeachers();
  const { toast } = useToast();

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
  };

  // Debounce la recherche pour éviter trop de re-renders
  useEffect(() => {
    const debouncedUpdate = debounce(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    debouncedUpdate();
  }, [searchTerm]);

  // Calculer les statistiques (memoized)
  const stats = useMemo(() => ({
    total: teachers.length,
    actifs: teachers.filter(t => t.is_active === true).length,
    inactifs: teachers.filter(t => t.is_active === false).length,
  }), [teachers]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet enseignant ?")) {
      await deleteTeacher(id);
    }
  };

  const handleEdit = (enseignant: Enseignant) => {
    if (onEdit) {
      onEdit(enseignant);
    }
  };

  // Filtrer avec le terme de recherche debounced (memoized)
  const filteredEnseignants = useMemo(() => 
    teachers.filter((enseignant) =>
      Object.values(enseignant).some(
        (value) =>
          typeof value === "string" &&
          value.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    ),
    [teachers, debouncedSearchTerm]
  );

  if (loading) {
    return <div className="flex items-center justify-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Liste des enseignants</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter un enseignant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un enseignant</DialogTitle>
            </DialogHeader>
            <AjoutEnseignantForm onSuccess={handleAddSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enseignants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enseignants Actifs
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.actifs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enseignants Inactifs
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactifs}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher un enseignant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Spécialisation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEnseignants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {searchTerm ? "Aucun enseignant trouvé" : "Aucun enseignant ajouté"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEnseignants.map((enseignant) => (
                <TableRow key={enseignant.id}>
                  <TableCell>{enseignant.last_name}</TableCell>
                  <TableCell>{enseignant.first_name}</TableCell>
                  <TableCell>{enseignant.employee_number}</TableCell>
                  <TableCell>{enseignant.phone || 'N/A'}</TableCell>
                  <TableCell>{enseignant.specialization || "Aucune"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        enseignant.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {enseignant.is_active ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(enseignant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(enseignant.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
