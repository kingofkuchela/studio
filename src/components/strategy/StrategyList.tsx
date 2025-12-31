
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Edge } from '@/types';

interface EdgeListProps {
  edges: Edge[];
  onEdit: (edge: Edge) => void;
  onDelete: (edgeId: string) => void;
}

export default function EdgeList({ edges, onEdit, onDelete }: EdgeListProps) {
  return (
    <div className="space-y-4">
      {edges.length === 0 && (
         <Card className="shadow-sm">
            <CardContent className="p-6 text-center text-muted-foreground">
                No edges defined yet. Add one to get started!
            </CardContent>
         </Card>
      )}
      {edges.map((edge) => (
        <Card key={edge.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="font-headline text-xl font-code">{edge.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(edge)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(edge.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {edge.description && <p className="text-sm text-muted-foreground">{edge.description}</p>}
            {!edge.description && <p className="text-sm text-muted-foreground italic">No description provided.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
