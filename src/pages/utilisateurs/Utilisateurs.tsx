import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, Users, GraduationCap } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { formatClassName } from "@/utils/classNameFormatter";
import { useNotifications } from "@/hooks/useNotifications";
import { useSchoolData } from "@/hooks/useSchoolData";

export default function Utilisateurs() {
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const { classes } = useClasses();
  const { students, teachers, loading } = useUserAccounts(selectedClassId === "all" ? undefined : selectedClassId);
  const { showSuccess } = useNotifications();
  const { schoolData } = useSchoolData();

  const schoolSuffix = schoolData?.school_suffix || '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess({ description: "Copié dans le presse-papier !" });
  };

  const formatLogin = (matricule: string) => {
    if (!schoolSuffix) return matricule;
    return `${matricule}@${schoolSuffix}`;
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Utilisateurs
            </h1>
            <p className="text-muted-foreground mt-2">
              Consultez les identifiants de connexion des élèves, parents et enseignants
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtrer par classe</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((classe) => (
                  <SelectItem key={classe.id} value={classe.id}>
                    {formatClassName(classe)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Élèves & Parents
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Enseignants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comptes Élèves et Parents</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : students.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucun élève {selectedClassId !== "all" ? 'dans cette classe' : 'enregistré'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Élève</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Login Élève</TableHead>
                          <TableHead>Mot de passe Élève</TableHead>
                          <TableHead>Login Parent</TableHead>
                          <TableHead>Mot de passe Parent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell>{student.class_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {formatLogin(student.student_number)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(formatLogin(student.student_number))}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {student.defaultPassword}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(student.defaultPassword)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {formatLogin(student.parent_matricule)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(formatLogin(student.parent_matricule))}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {student.parentPassword}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(student.parentPassword)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comptes Enseignants</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : teachers.length === 0 ? (
                  <p className="text-muted-foreground">Aucun enseignant enregistré</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom complet</TableHead>
                          <TableHead>Matricule</TableHead>
                          <TableHead>Login</TableHead>
                          <TableHead>Mot de passe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teachers.map((teacher) => (
                          <TableRow key={teacher.id}>
                            <TableCell className="font-medium">
                              {teacher.first_name} {teacher.last_name}
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {teacher.employee_number}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {formatLogin(teacher.employee_number)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(formatLogin(teacher.employee_number))}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {teacher.defaultPassword}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(teacher.defaultPassword)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
