
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function DivergenceCalculatorPage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Calculator Divergence
          </h2>
          <p className="text-muted-foreground mt-1">
            Project your path to success by analyzing the gap between your real and theoretical performance.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              Calculators and projections based on your performance divergence will be available here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>This section will help you understand what it takes to close the gap between your plan and your results.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
