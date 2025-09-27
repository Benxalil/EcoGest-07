import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardSkeletonProps {
  type?: 'dashboard' | 'teacher' | 'classes';
}

export const DashboardSkeleton = ({ type = 'dashboard' }: DashboardSkeletonProps) => {
  if (type === 'teacher') {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-80"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 sm:p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="h-3 bg-gray-300 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="h-5 w-5 bg-gray-300 rounded"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-5 bg-gray-300 rounded"></div>
                <div className="h-5 bg-gray-300 rounded w-48"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="mt-4">
                <div className="h-10 bg-gray-300 rounded w-full"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'classes') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-5 w-5 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-300 rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-300 rounded w-40 animate-pulse"></div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-300 rounded w-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table skeleton */}
        <div className="border rounded-lg animate-pulse">
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-4 bg-gray-300 rounded w-20"></div>
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-4 bg-gray-300 rounded w-16 ml-auto"></div>
            </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
                <div className="flex items-center justify-center gap-2 ml-auto">
                  <div className="h-8 w-8 bg-gray-300 rounded"></div>
                  <div className="h-8 w-8 bg-gray-300 rounded"></div>
                  <div className="h-8 w-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default dashboard skeleton
  return (
    <div className="space-y-6">
      {/* Welcome header skeleton */}
      <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-80 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
              </div>
              <div className="h-6 w-6 bg-gray-300 rounded"></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Content sections skeleton */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};