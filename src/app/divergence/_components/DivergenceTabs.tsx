
"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DivergenceTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(value);
  };

  const getActiveTab = () => {
    if (pathname.includes('/analytics')) return '/divergence/analytics';
    if (pathname.includes('/calculator')) return '/divergence/calculator';
    if (pathname.includes('/reports')) return '/divergence/reports';
    return '/divergence';
  };

  return (
    <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="/divergence">Dashboard</TabsTrigger>
        <TabsTrigger value="/divergence/analytics">Analytics</TabsTrigger>
        <TabsTrigger value="/divergence/calculator">Calculator</TabsTrigger>
        <TabsTrigger value="/divergence/reports">Reports</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
