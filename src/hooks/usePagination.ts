import { useState, useMemo, useCallback } from 'react';

interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
}

interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  totalItems: number;
}

/**
 * Hook de pagination réutilisable pour gérer la pagination côté client
 * @param items - Tableau d'éléments à paginer
 * @param config - Configuration de la pagination (pageSize, initialPage)
 * @returns Objet contenant les données paginées et les fonctions de navigation
 */
export function usePagination<T>(
  items: T[],
  config: PaginationConfig = {}
): PaginationResult<T> {
  const { pageSize = 50, initialPage = 1 } = config;
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Calculer les données paginées
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / pageSize);
  }, [items.length, pageSize]);

  // Fonctions de navigation
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  return {
    currentPage,
    totalPages,
    pageSize,
    data: paginatedData,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    nextPage,
    previousPage,
    totalItems: items.length,
  };
}
