import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ListeElevesProps {
  classeId: number;
}

// Aucune donnée de test - système vide pour nouvel utilisateur
const eleves = [
  // Les élèves seront ajoutés par l'utilisateur
];

export const ListeEleves: React.FC<ListeElevesProps> = ({ classeId }) => {
  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Prénom</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eleves.map((eleve) => (
            <TableRow key={eleve.id}>
              <TableCell>{eleve.nom}</TableCell>
              <TableCell>{eleve.prenom}</TableCell>
              <TableCell>{eleve.age} ans</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};