
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Trash2,LogIn, LogOut } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Formula } from '@/types';

interface FormulaListProps {
  formulas: Formula[];
  onEdit: (formula: Formula) => void;
  onDelete: (formulaId: string) => void;
}

export default function FormulaList({ formulas, onEdit, onDelete }: FormulaListProps) {
  return (
    <div className="space-y-4">
      {formulas.length === 0 && (
         <Card className="shadow-sm">
            <CardContent className="p-6 text-center text-muted-foreground">
                No formulas defined yet. Add one to get started!
            </CardContent>
         </Card>
      )}
      {formulas.map((formula) => (
        <Card key={formula.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                {formula.type === 'entry' ? <LogIn className="h-5 w-5 text-green-500" /> : <LogOut className="h-5 w-5 text-red-500" />}
                {formula.name}
              </CardTitle>
              <Badge variant={formula.type === 'entry' ? 'default' : 'secondary'} className="mt-1 capitalize">
                {formula.type} Formula
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(formula)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(formula.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {formula.description && <p className="text-sm text-muted-foreground">{formula.description}</p>}
            {!formula.description && <p className="text-sm text-muted-foreground italic">No description provided.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
